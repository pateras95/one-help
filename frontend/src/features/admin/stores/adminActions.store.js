import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import {
  getModeratedActions,
  approveAction as approveActionRequest,
  rejectAction as rejectActionRequest,
  hideAction as hideActionRequest,
  restoreAction as restoreActionRequest,
  updateActionDetails as updateActionDetailsRequest
} from '../services/actionModeration.service'

/** Owns the admin action-moderation list and its approve/reject/hide/restore actions. */
export const useAdminActionsStore = defineStore('adminActions', () => {
  const authStore = useAuthStore()

  const actions = ref([])
  const loading = ref(false)
  const error = ref(null)

  function currentAdminId() {
    return authStore.currentUser?.id ?? null
  }

  async function fetchActions() {
    loading.value = true
    error.value = null
    try {
      actions.value = await getModeratedActions()
    } catch (err) {
      error.value = err.message
      actions.value = []
    } finally {
      loading.value = false
    }
  }

  function replace(updated) {
    const index = actions.value.findIndex((action) => action.id === updated.id)
    if (index !== -1) actions.value[index] = updated
  }

  async function approveAction(actionId) {
    const updated = await approveActionRequest(currentAdminId(), actionId)
    replace(updated)
    return updated
  }

  async function rejectAction(actionId, reason) {
    const updated = await rejectActionRequest(currentAdminId(), actionId, reason)
    replace(updated)
    return updated
  }

  async function hideAction(actionId) {
    const updated = await hideActionRequest(currentAdminId(), actionId)
    replace(updated)
    return updated
  }

  async function restoreAction(actionId) {
    const updated = await restoreActionRequest(currentAdminId(), actionId)
    replace(updated)
    return updated
  }

  async function updateActionDetails(actionId, payload) {
    const updated = await updateActionDetailsRequest(currentAdminId(), actionId, payload)
    replace(updated)
    return updated
  }

  return {
    actions,
    loading,
    error,
    fetchActions,
    approveAction,
    rejectAction,
    hideAction,
    restoreAction,
    updateActionDetails
  }
})
