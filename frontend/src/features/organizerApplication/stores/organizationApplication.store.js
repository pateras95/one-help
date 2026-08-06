import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import {
  getApplicationForUser,
  submitOrganizationApplication as submitRequest,
  updatePendingApplication as updateRequest,
  resubmitRejectedApplication as resubmitRequest,
  updateOrganizationProfile as updateProfileRequest
} from '../services/organizationApplication.service'

/**
 * Owns the current user's own organization application state — not the
 * admin-wide organizations list (see `admin/stores/adminOrganizations.store.js`
 * for that). The mock's separate `membership` concept is gone entirely
 * (ADR-4/ADR-8): `application` alone (mapped from the real `OrganizationResponse`)
 * carries everything this store's consumers ever read.
 */
export const useOrganizationApplicationStore = defineStore('organizationApplication', () => {
  const authStore = useAuthStore()

  const application = ref(null)
  const loading = ref(false)
  const error = ref(null)

  function currentUserId() {
    return authStore.currentUser?.id ?? null
  }

  async function fetchApplication() {
    const userId = currentUserId()
    if (!userId) {
      application.value = null
      return
    }

    loading.value = true
    error.value = null
    try {
      const result = await getApplicationForUser()
      if (currentUserId() === userId) {
        application.value = result
      }
    } catch (err) {
      if (currentUserId() === userId) error.value = err.message
    } finally {
      if (currentUserId() === userId) loading.value = false
    }
  }

  async function submit(payload) {
    if (!currentUserId()) throw new Error('invalidRequest')
    const result = await submitRequest(payload)
    application.value = result
    return result
  }

  async function updatePending(applicationId, payload) {
    if (!currentUserId()) throw new Error('invalidRequest')
    const result = await updateRequest(applicationId, payload)
    application.value = result
    return result
  }

  async function resubmit(applicationId, payload) {
    if (!currentUserId()) throw new Error('invalidRequest')
    const result = await resubmitRequest(applicationId, payload)
    application.value = result
    return result
  }

  async function updateProfile(payload) {
    if (!currentUserId()) throw new Error('invalidRequest')
    const result = await updateProfileRequest(payload)
    application.value = result
    return result
  }

  /** Clears in-memory state (e.g. on logout). */
  function clear() {
    application.value = null
    error.value = null
  }

  return {
    application,
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
