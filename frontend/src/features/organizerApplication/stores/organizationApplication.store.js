import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import {
  getApplicationForUser,
  getUserOrganizationMembership,
  submitOrganizationApplication as submitRequest,
  updatePendingApplication as updateRequest,
  resubmitRejectedApplication as resubmitRequest,
  updateOrganizationProfile as updateProfileRequest
} from '../services/organizationApplication.service'

/**
 * Owns the current user's own organization application/membership state
 * — not the admin-wide organizations list (see `admin/stores/
 * adminOrganizations.store.js` for that).
 */
export const useOrganizationApplicationStore = defineStore('organizationApplication', () => {
  const authStore = useAuthStore()

  const application = ref(null)
  const membership = ref(null)
  const loading = ref(false)
  const error = ref(null)

  function currentUserId() {
    return authStore.currentUser?.id ?? null
  }

  async function fetchApplication() {
    const userId = currentUserId()
    if (!userId) {
      application.value = null
      membership.value = null
      return
    }

    loading.value = true
    error.value = null
    try {
      const [applicationResult, membershipResult] = await Promise.all([
        getApplicationForUser(userId),
        getUserOrganizationMembership(userId)
      ])
      if (currentUserId() === userId) {
        application.value = applicationResult
        membership.value = membershipResult
      }
    } catch (err) {
      if (currentUserId() === userId) error.value = err.message
    } finally {
      if (currentUserId() === userId) loading.value = false
    }
  }

  async function submit(payload) {
    const userId = currentUserId()
    if (!userId) throw new Error('invalidRequest')
    const result = await submitRequest(userId, payload)
    application.value = result
    return result
  }

  async function updatePending(applicationId, payload) {
    const userId = currentUserId()
    if (!userId) throw new Error('invalidRequest')
    const result = await updateRequest(userId, applicationId, payload)
    application.value = result
    return result
  }

  async function resubmit(applicationId, payload) {
    const userId = currentUserId()
    if (!userId) throw new Error('invalidRequest')
    const result = await resubmitRequest(userId, applicationId, payload)
    application.value = result
    return result
  }

  async function updateProfile(payload) {
    const userId = currentUserId()
    if (!userId) throw new Error('invalidRequest')
    const result = await updateProfileRequest(userId, payload)
    application.value = result
    return result
  }

  /** Clears in-memory state (e.g. on logout) — persisted data is untouched. */
  function clear() {
    application.value = null
    membership.value = null
    error.value = null
  }

  return {
    application,
    membership,
    loading,
    error,
    fetchApplication,
    submit,
    updatePending,
    resubmit,
    updateProfile,
    clear
  }
})
