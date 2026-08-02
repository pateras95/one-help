import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import {
  getUserParticipations,
  joinAction as joinActionRequest,
  cancelParticipation as cancelParticipationRequest
} from '../services/participation.service'
import { PARTICIPATION_STATUS } from '../utils/participationStatus'

/**
 * Owns the current volunteer's participation records in memory. Reads the
 * active user from the auth store rather than duplicating it, and reloads
 * automatically whenever that user changes (login, logout, switching demo
 * users) via the `watch` below — callers never need to call `loadForCurrentUser`
 * themselves except to retry after an error.
 */
export const useParticipationStore = defineStore('participation', () => {
  const authStore = useAuthStore()

  const participations = ref([])
  const loading = ref(false)
  const error = ref(null)
  const isInitialized = ref(false)
  // Bumped on every successful join/cancel. Components deriving an
  // overlaid participant count read localStorage directly (across all
  // users, not just this store's own state) and aren't otherwise
  // reactive to it — they include this in their computed's dependency
  // list purely to know when to recompute.
  const countVersion = ref(0)

  /** The current user's confirmed record for an action, else their most recent cancelled one, else null. */
  function getByActionId(actionId) {
    const records = participations.value.filter((record) => record.actionId === actionId)
    if (!records.length) return null
    const confirmed = records.find((record) => record.status === PARTICIPATION_STATUS.CONFIRMED)
    if (confirmed) return confirmed
    return [...records].sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt))[0]
  }

  function isParticipating(actionId) {
    return getByActionId(actionId)?.status === PARTICIPATION_STATUS.CONFIRMED
  }

  async function loadForCurrentUser() {
    const userId = authStore.currentUser?.id
    if (!userId) {
      participations.value = []
      isInitialized.value = true
      return
    }

    loading.value = true
    error.value = null
    try {
      const records = await getUserParticipations(userId)
      // The active user may have changed while this request was in
      // flight (e.g. logout) — don't let a stale response repopulate
      // state for a user who is no longer signed in.
      if (authStore.currentUser?.id === userId) {
        participations.value = records
      }
    } catch (err) {
      if (authStore.currentUser?.id === userId) {
        error.value = err.message
        participations.value = []
      }
    } finally {
      if (authStore.currentUser?.id === userId) {
        loading.value = false
      }
      isInitialized.value = true
    }
  }

  async function join(actionId) {
    const userId = authStore.currentUser?.id
    if (!userId) throw new Error('invalidRequest')

    loading.value = true
    error.value = null
    try {
      const record = await joinActionRequest(userId, actionId)
      if (authStore.currentUser?.id === userId) {
        participations.value.push(record)
        countVersion.value += 1
      }
      return record
    } catch (err) {
      if (authStore.currentUser?.id === userId) {
        error.value = err.message
      }
      throw err
    } finally {
      if (authStore.currentUser?.id === userId) {
        loading.value = false
      }
    }
  }

  async function cancel(actionId) {
    const userId = authStore.currentUser?.id
    if (!userId) throw new Error('invalidRequest')

    loading.value = true
    error.value = null
    try {
      const cancelled = await cancelParticipationRequest(userId, actionId)
      if (authStore.currentUser?.id === userId) {
        const index = participations.value.findIndex((record) => record.id === cancelled.id)
        if (index !== -1) participations.value[index] = cancelled
        countVersion.value += 1
      }
      return cancelled
    } catch (err) {
      if (authStore.currentUser?.id === userId) {
        error.value = err.message
      }
      throw err
    } finally {
      if (authStore.currentUser?.id === userId) {
        loading.value = false
      }
    }
  }

  /** Clears in-memory state (e.g. on logout) — persisted records in localStorage are untouched. */
  function clear() {
    participations.value = []
    error.value = null
    isInitialized.value = false
  }

  watch(
    () => authStore.currentUser?.id,
    (userId) => {
      if (userId) {
        loadForCurrentUser()
      } else {
        clear()
      }
    },
    { immediate: true }
  )

  return {
    participations,
    loading,
    error,
    isInitialized,
    countVersion,
    getByActionId,
    isParticipating,
    loadForCurrentUser,
    join,
    cancel,
    clear
  }
})
