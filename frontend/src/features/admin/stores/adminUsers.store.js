import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { getUsers, suspendUser as suspendUserRequest, reactivateUser as reactivateUserRequest } from '../services/adminUsers.service'

/** Owns the admin user-management list and its suspend/reactivate actions. */
export const useAdminUsersStore = defineStore('adminUsers', () => {
  const authStore = useAuthStore()

  const users = ref([])
  const loading = ref(false)
  const error = ref(null)

  function currentAdminId() {
    return authStore.currentUser?.id ?? null
  }

  async function fetchUsers() {
    loading.value = true
    error.value = null
    try {
      users.value = await getUsers()
    } catch (err) {
      error.value = err.message
      users.value = []
    } finally {
      loading.value = false
    }
  }

  async function suspendUser(targetUserId) {
    const updated = await suspendUserRequest(currentAdminId(), targetUserId)
    const index = users.value.findIndex((user) => user.id === targetUserId)
    if (index !== -1) users.value[index] = updated
    return updated
  }

  async function reactivateUser(targetUserId) {
    const updated = await reactivateUserRequest(currentAdminId(), targetUserId)
    const index = users.value.findIndex((user) => user.id === targetUserId)
    if (index !== -1) users.value[index] = updated
    return updated
  }

  return { users, loading, error, fetchUsers, suspendUser, reactivateUser }
})
