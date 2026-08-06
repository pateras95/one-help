import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  getUsers,
  suspendUser as suspendUserRequest,
  reactivateUser as reactivateUserRequest,
  updateUserProfile as updateUserProfileRequest
} from '../services/adminUsers.service'

const SEARCH_DEBOUNCE_MS = 300
const DEFAULT_PAGE_SIZE = 20

/**
 * Owns the admin user-management list — real server-side pagination/search/filters
 * now (docs/backend-discovery/api-users-and-roles.md), not "fetch everything and
 * filter in the browser" the way the mock did. Follows the same
 * debounced-search-via-setTimeout pattern as `actions.store.js::setSearch`, plus a
 * request-sequence guard so a slow, now-superseded request can never overwrite a
 * newer one's result (the one gap that pattern doesn't already cover).
 */
export const useAdminUsersStore = defineStore('adminUsers', () => {
  const users = ref([])
  const loading = ref(false)
  const error = ref(null)

  const page = ref(0)
  const size = ref(DEFAULT_PAGE_SIZE)
  const totalPages = ref(0)
  const totalElements = ref(0)

  const search = ref('')
  const role = ref('')
  const status = ref('')

  let searchDebounceHandle = null
  let requestSequence = 0

  async function fetchUsers() {
    loading.value = true
    error.value = null
    const requestId = ++requestSequence
    try {
      const result = await getUsers({
        page: page.value,
        size: size.value,
        search: search.value,
        role: role.value,
        status: status.value
      })
      if (requestId !== requestSequence) return // a newer request already landed
      users.value = result.content
      totalPages.value = result.totalPages
      totalElements.value = result.totalElements
    } catch (err) {
      if (requestId !== requestSequence) return
      error.value = err.message
      users.value = []
    } finally {
      if (requestId === requestSequence) loading.value = false
    }
  }

  function setPage(nextPage) {
    page.value = nextPage
    fetchUsers()
  }

  /** Debounced — filters reset to the first page immediately, the fetch itself waits. */
  function setSearch(nextSearch) {
    search.value = nextSearch
    page.value = 0
    clearTimeout(searchDebounceHandle)
    searchDebounceHandle = setTimeout(fetchUsers, SEARCH_DEBOUNCE_MS)
  }

  function setRole(nextRole) {
    role.value = nextRole
    page.value = 0
    fetchUsers()
  }

  function setStatus(nextStatus) {
    status.value = nextStatus
    page.value = 0
    fetchUsers()
  }

  function replaceInPlace(updated) {
    const index = users.value.findIndex((user) => user.id === updated.id)
    if (index !== -1) users.value[index] = { ...users.value[index], ...updated }
  }

  async function suspendUser(targetUserId) {
    const updated = await suspendUserRequest(targetUserId)
    replaceInPlace(updated)
    return updated
  }

  async function reactivateUser(targetUserId) {
    const updated = await reactivateUserRequest(targetUserId)
    replaceInPlace(updated)
    return updated
  }

  async function updateUserProfile(targetUserId, payload) {
    const updated = await updateUserProfileRequest(targetUserId, payload)
    replaceInPlace(updated)
    return updated
  }

  return {
    users,
    loading,
    error,
    page,
    size,
    totalPages,
    totalElements,
    search,
    role,
    status,
    fetchUsers,
    setPage,
    setSearch,
    setRole,
    setStatus,
    suspendUser,
    reactivateUser,
    updateUserProfile
  }
})
