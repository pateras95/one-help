import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { ROLES } from '@/constants/roles'
import {
  getOrganizerActions,
  getOrganizerActionById,
  createOrganizerAction as createOrganizerActionRequest,
  updateOrganizerAction as updateOrganizerActionRequest,
  changeOrganizerActionStatus as changeOrganizerActionStatusRequest,
  getOrganizerActionParticipants
} from '../services/organizerActions.service'

/**
 * Owns the current organizer's own actions, the selected action (for
 * details/edit), and its participant list. Reads the active organizer
 * from the auth store rather than duplicating it, and reloads
 * automatically when that user changes (login, logout, switching demo
 * users) via the `watch` below — mirroring the participation store's
 * lifecycle handling.
 */
export const useOrganizerStore = defineStore('organizer', () => {
  const authStore = useAuthStore()

  const actions = ref([])
  const loading = ref(false)
  const error = ref(null)
  const isInitialized = ref(false)

  const selectedAction = ref(null)
  const selectedActionLoading = ref(false)
  const selectedActionError = ref(null)

  const participants = ref([])
  const participantsLoading = ref(false)
  const participantsError = ref(null)

  function currentOrganizerId() {
    return authStore.hasRole(ROLES.ORGANIZER) ? authStore.currentUser.id : null
  }

  function currentOrganizerName() {
    const user = authStore.currentUser
    return user ? `${user.firstName} ${user.lastName}` : ''
  }

  async function loadActions() {
    const id = currentOrganizerId()
    if (!id) {
      actions.value = []
      isInitialized.value = true
      return
    }

    loading.value = true
    error.value = null
    try {
      const result = await getOrganizerActions(id)
      // The active user may have changed while this request was in
      // flight (e.g. logout mid-save) — don't repopulate state for a
      // user who is no longer the current organizer.
      if (currentOrganizerId() === id) actions.value = result
    } catch (err) {
      if (currentOrganizerId() === id) {
        error.value = err.message
        actions.value = []
      }
    } finally {
      if (currentOrganizerId() === id) loading.value = false
      isInitialized.value = true
    }
  }

  async function loadActionById(actionId) {
    const id = currentOrganizerId()
    selectedActionLoading.value = true
    selectedActionError.value = null
    selectedAction.value = null
    try {
      const result = await getOrganizerActionById(id, actionId)
      if (currentOrganizerId() === id) selectedAction.value = result
    } catch (err) {
      if (currentOrganizerId() === id) selectedActionError.value = err.message
    } finally {
      if (currentOrganizerId() === id) selectedActionLoading.value = false
    }
  }

  async function loadParticipants(actionId) {
    const id = currentOrganizerId()
    participantsLoading.value = true
    participantsError.value = null
    participants.value = []
    try {
      const result = await getOrganizerActionParticipants(id, actionId)
      if (currentOrganizerId() === id) participants.value = result
    } catch (err) {
      if (currentOrganizerId() === id) participantsError.value = err.message
    } finally {
      if (currentOrganizerId() === id) participantsLoading.value = false
    }
  }

  async function create(payload) {
    const id = currentOrganizerId()
    if (!id) throw new Error('invalidRequest')

    loading.value = true
    error.value = null
    try {
      const created = await createOrganizerActionRequest(id, { ...payload, organizationName: currentOrganizerName() })
      if (currentOrganizerId() === id) actions.value.push(created)
      return created
    } catch (err) {
      if (currentOrganizerId() === id) error.value = err.message
      throw err
    } finally {
      if (currentOrganizerId() === id) loading.value = false
    }
  }

  async function update(actionId, payload) {
    const id = currentOrganizerId()
    if (!id) throw new Error('invalidRequest')

    loading.value = true
    error.value = null
    try {
      const updated = await updateOrganizerActionRequest(id, actionId, payload)
      if (currentOrganizerId() === id) {
        const index = actions.value.findIndex((action) => action.id === actionId)
        if (index !== -1) actions.value[index] = updated
        if (selectedAction.value?.id === actionId) selectedAction.value = updated
      }
      return updated
    } catch (err) {
      if (currentOrganizerId() === id) error.value = err.message
      throw err
    } finally {
      if (currentOrganizerId() === id) loading.value = false
    }
  }

  async function changeStatus(actionId, status) {
    const id = currentOrganizerId()
    if (!id) throw new Error('invalidRequest')

    loading.value = true
    error.value = null
    try {
      const updated = await changeOrganizerActionStatusRequest(id, actionId, status)
      if (currentOrganizerId() === id) {
        const index = actions.value.findIndex((action) => action.id === actionId)
        if (index !== -1) actions.value[index] = updated
        if (selectedAction.value?.id === actionId) selectedAction.value = updated
      }
      return updated
    } catch (err) {
      if (currentOrganizerId() === id) error.value = err.message
      throw err
    } finally {
      if (currentOrganizerId() === id) loading.value = false
    }
  }

  /** Clears in-memory state (e.g. on logout) — persisted actions are untouched. */
  function clear() {
    actions.value = []
    selectedAction.value = null
    participants.value = []
    error.value = null
    isInitialized.value = false
  }

  watch(
    () => authStore.currentUser?.id,
    (userId) => {
      if (userId && authStore.hasRole(ROLES.ORGANIZER)) {
        loadActions()
      } else {
        clear()
      }
    },
    { immediate: true }
  )

  return {
    actions,
    loading,
    error,
    isInitialized,
    selectedAction,
    selectedActionLoading,
    selectedActionError,
    participants,
    participantsLoading,
    participantsError,
    loadActions,
    loadActionById,
    loadParticipants,
    create,
    update,
    changeStatus,
    clear
  }
})
