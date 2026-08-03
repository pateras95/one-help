import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import {
  getOrganizations,
  approveOrganization as approveOrganizationRequest,
  rejectOrganization as rejectOrganizationRequest,
  suspendOrganization as suspendOrganizationRequest,
  restoreOrganization as restoreOrganizationRequest,
  updateOrganizationDetails as updateOrganizationDetailsRequest
} from '../services/organizations.service'

/** Owns the admin organization list and its approve/reject/suspend/restore actions. */
export const useAdminOrganizationsStore = defineStore('adminOrganizations', () => {
  const authStore = useAuthStore()

  const organizations = ref([])
  const loading = ref(false)
  const error = ref(null)

  function currentAdminId() {
    return authStore.currentUser?.id ?? null
  }

  async function fetchOrganizations() {
    loading.value = true
    error.value = null
    try {
      organizations.value = await getOrganizations()
    } catch (err) {
      error.value = err.message
      organizations.value = []
    } finally {
      loading.value = false
    }
  }

  function replace(updated) {
    const index = organizations.value.findIndex((org) => org.id === updated.id)
    if (index !== -1) organizations.value[index] = updated
  }

  async function approveOrganization(organizationId) {
    const updated = await approveOrganizationRequest(currentAdminId(), organizationId)
    replace(updated)
    return updated
  }

  async function rejectOrganization(organizationId, reason) {
    const updated = await rejectOrganizationRequest(currentAdminId(), organizationId, reason)
    replace(updated)
    return updated
  }

  async function suspendOrganization(organizationId) {
    const updated = await suspendOrganizationRequest(currentAdminId(), organizationId)
    replace(updated)
    return updated
  }

  async function restoreOrganization(organizationId) {
    const updated = await restoreOrganizationRequest(currentAdminId(), organizationId)
    replace(updated)
    return updated
  }

  async function updateOrganizationDetails(organizationId, payload) {
    const updated = await updateOrganizationDetailsRequest(currentAdminId(), organizationId, payload)
    replace(updated)
    return updated
  }

  /** Drops an organization from the in-memory list — used after a demotion permanently removes it. */
  function remove(organizationId) {
    organizations.value = organizations.value.filter((org) => org.id !== organizationId)
  }

  return {
    organizations,
    loading,
    error,
    fetchOrganizations,
    approveOrganization,
    rejectOrganization,
    suspendOrganization,
    restoreOrganization,
    updateOrganizationDetails,
    remove
  }
})
