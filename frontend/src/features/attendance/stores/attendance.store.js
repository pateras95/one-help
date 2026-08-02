import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { ROLES } from '@/constants/roles'
import {
  getUserAttendance,
  getActionAttendance,
  getActiveCheckInSession,
  generateCheckInSession,
  checkInByQr as checkInByQrRequest,
  checkInManually as checkInManuallyRequest,
  checkOut as checkOutRequest,
  validateCheckInToken
} from '../services/attendance.service'

/**
 * Owns two mostly-independent slices of attendance state:
 * - the current volunteer's own attendance history (auto-loaded and
 *   cleared on login/logout, mirroring `participation.store.js`) — used
 *   by My Actions.
 * - the organizer's per-action view (attendance list + QR session for
 *   whichever action their check-in screen currently targets) — loaded
 *   on demand, not tied to auth lifecycle beyond the ownership checks
 *   already enforced by the service.
 */
export const useAttendanceStore = defineStore('attendance', () => {
  const authStore = useAuthStore()

  const userAttendance = ref([])
  const userAttendanceLoading = ref(false)
  const userAttendanceError = ref(null)
  const isInitialized = ref(false)

  const actionAttendance = ref([])
  const actionAttendanceLoading = ref(false)
  const actionAttendanceError = ref(null)

  const qrSession = ref(null)
  const qrSessionLoading = ref(false)
  const qrSessionError = ref(null)

  const checkInLoading = ref(false)
  const checkInError = ref(null)

  function currentUserId() {
    return authStore.currentUser?.id ?? null
  }

  function currentOrganizerId() {
    return authStore.hasRole(ROLES.ORGANIZER) ? authStore.currentUser.id : null
  }

  /** The current volunteer's own attendance record for a participation, if any. */
  function getByParticipationId(participationId) {
    return userAttendance.value.find((record) => record.participationId === participationId) ?? null
  }

  async function loadUserAttendance() {
    const id = currentUserId()
    if (!id) {
      userAttendance.value = []
      isInitialized.value = true
      return
    }

    userAttendanceLoading.value = true
    userAttendanceError.value = null
    try {
      const result = await getUserAttendance(id)
      if (currentUserId() === id) userAttendance.value = result
    } catch (err) {
      if (currentUserId() === id) {
        userAttendanceError.value = err.message
        userAttendance.value = []
      }
    } finally {
      if (currentUserId() === id) userAttendanceLoading.value = false
      isInitialized.value = true
    }
  }

  async function loadActionAttendance(actionId) {
    actionAttendanceLoading.value = true
    actionAttendanceError.value = null
    try {
      actionAttendance.value = await getActionAttendance(actionId)
    } catch (err) {
      actionAttendanceError.value = err.message
      actionAttendance.value = []
    } finally {
      actionAttendanceLoading.value = false
    }
  }

  async function loadQrSession(actionId) {
    qrSessionLoading.value = true
    qrSessionError.value = null
    try {
      qrSession.value = await getActiveCheckInSession(currentOrganizerId(), actionId)
    } catch (err) {
      qrSessionError.value = err.message
      qrSession.value = null
    } finally {
      qrSessionLoading.value = false
    }
  }

  async function regenerateQrSession(actionId) {
    qrSessionLoading.value = true
    qrSessionError.value = null
    try {
      qrSession.value = await generateCheckInSession(currentOrganizerId(), actionId)
      return qrSession.value
    } catch (err) {
      qrSessionError.value = err.message
      throw err
    } finally {
      qrSessionLoading.value = false
    }
  }

  async function checkInByQr(token) {
    const userId = currentUserId()
    checkInLoading.value = true
    checkInError.value = null
    try {
      const record = await checkInByQrRequest({ token, userId })
      if (currentUserId() === userId) userAttendance.value.push(record)
      return record
    } catch (err) {
      checkInError.value = err.message
      throw err
    } finally {
      checkInLoading.value = false
    }
  }

  async function checkInManually(participationId) {
    checkInLoading.value = true
    checkInError.value = null
    try {
      const record = await checkInManuallyRequest(currentOrganizerId(), participationId)
      actionAttendance.value.push(record)
      return record
    } catch (err) {
      checkInError.value = err.message
      throw err
    } finally {
      checkInLoading.value = false
    }
  }

  async function checkOut(attendanceId) {
    checkInLoading.value = true
    checkInError.value = null
    try {
      const updated = await checkOutRequest(currentOrganizerId(), attendanceId)
      const index = actionAttendance.value.findIndex((record) => record.id === attendanceId)
      if (index !== -1) actionAttendance.value[index] = updated
      return updated
    } catch (err) {
      checkInError.value = err.message
      throw err
    } finally {
      checkInLoading.value = false
    }
  }

  /** Thin pass-through so components go through the store like everywhere else, even though this call needs no shared state. */
  async function validateToken(token) {
    return validateCheckInToken(token)
  }

  /** Clears in-memory state (e.g. on logout) — persisted records are untouched. */
  function clear() {
    userAttendance.value = []
    userAttendanceError.value = null
    isInitialized.value = false
  }

  watch(
    () => authStore.currentUser?.id,
    (userId) => {
      if (userId) {
        loadUserAttendance()
      } else {
        clear()
      }
    },
    { immediate: true }
  )

  return {
    userAttendance,
    userAttendanceLoading,
    userAttendanceError,
    isInitialized,
    actionAttendance,
    actionAttendanceLoading,
    actionAttendanceError,
    qrSession,
    qrSessionLoading,
    qrSessionError,
    checkInLoading,
    checkInError,
    getByParticipationId,
    loadUserAttendance,
    loadActionAttendance,
    loadQrSession,
    regenerateQrSession,
    checkInByQr,
    checkInManually,
    checkOut,
    validateToken
  }
})
