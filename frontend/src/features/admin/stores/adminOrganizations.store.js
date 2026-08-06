import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  getOrganizations,
  approveOrganization as approveOrganizationRequest,
  rejectOrganization as rejectOrganizationRequest,
  suspendOrganization as suspendOrganizationRequest,
  restoreOrganization as restoreOrganizationRequest,
  updateOrganizationDetails as updateOrganizationDetailsRequest
} from '../services/organizations.service'
import { demoteOrganizerByOrganizationId } from '@/features/organizerApplication/services/organizerDemotion.service'

const SEARCH_DEBOUNCE_MS = 300
const DEFAULT_PAGE_SIZE = 20

/**
 * Owns the admin organization/application list — real server-side
 * pagination/search/status-filter now (docs/backend-discovery/api-organizations.md),
 * following the exact same debounced-search + request-sequence-guard pattern as
 * `adminUsers.store.js`.
 */
export const useAdminOrganizationsStore = defineStore('adminOrganizations', () => {
  const organizations = ref([])
  const loading = ref(false)
  const error = ref(null)

  const page = ref(0)
  const size = ref(DEFAULT_PAGE_SIZE)
  const totalPages = ref(0)
  const totalElements = ref(0)

  const search = ref('')
  const status = ref('')

  let searchDebounceHandle = null
  let requestSequence = 0

  async function fetchOrganizations() {
    loading.value = true
    error.value = null
    const requestId = ++requestSequence
    try {
      const result = await getOrganizations({
        page: page.value,
        size: size.value,
        search: search.value,
        status: status.value
      })
      if (requestId !== requestSequence) return // a newer request already landed
      organizations.value = result.content
      totalPages.value = result.totalPages
      totalElements.value = result.totalElements
    } catch (err) {
      if (requestId !== requestSequence) return
      error.value = err.message
      organizations.value = []
    } finally {
      if (requestId === requestSequence) loading.value = false
    }
  }

  function setPage(nextPage) {
    page.value = nextPage
    fetchOrganizations()
  }

  /** Debounced — the status filter resets to the first page immediately, the fetch itself waits. */
  function setSearch(nextSearch) {
    search.value = nextSearch
    page.value = 0
    clearTimeout(searchDebounceHandle)
    searchDebounceHandle = setTimeout(fetchOrganizations, SEARCH_DEBOUNCE_MS)
  }

  function setStatus(nextStatus) {
    status.value = nextStatus
    page.value = 0
    fetchOrganizations()
  }

  function replace(updated) {
    const index = organizations.value.findIndex((org) => org.id === updated.id)
    if (index !== -1) organizations.value[index] = updated
  }

  async function approveOrganization(organizationId) {
    const updated = await approveOrganizationRequest(organizationId)
    replace(updated)
    return updated
  }

  async function rejectOrganization(organizationId, reason) {
    const updated = await rejectOrganizationRequest(organizationId, reason)
    replace(updated)
    return updated
  }

  async function suspendOrganization(organizationId) {
    const updated = await suspendOrganizationRequest(organizationId)
    replace(updated)
    return updated
  }

  async function restoreOrganization(organizationId) {
    const updated = await restoreOrganizationRequest(organizationId)
    replace(updated)
    return updated
  }

  async function updateOrganizationDetails(organizationId, payload) {
    const updated = await updateOrganizationDetailsRequest(organizationId, payload)
    replace(updated)
    return updated
  }

  /** Deletes the organization on the backend and drops it from the in-memory list. */
  async function demoteOrganizer(organizationId) {
    const result = await demoteOrganizerByOrganizationId(organizationId)
    organizations.value = organizations.value.filter((org) => org.id !== organizationId)
    return result
  }

  return {
    organizations,
    loading,
    error,
    page,
    size,
    totalPages,
    totalElements,
    search,
    status,
    fetchOrganizations,
    setPage,
    setSearch,
    setStatus,
    approveOrganization,
    rejectOrganization,
    suspendOrganization,
    restoreOrganization,
    updateOrganizationDetails,
    demoteOrganizer
  }
})
