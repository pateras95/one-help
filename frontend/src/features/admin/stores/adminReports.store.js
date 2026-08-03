import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { getReports, updateReportStatus as updateReportStatusRequest } from '../services/reports.service'

/** Owns the admin reports list and its investigate/resolve/dismiss actions. */
export const useAdminReportsStore = defineStore('adminReports', () => {
  const authStore = useAuthStore()

  const reports = ref([])
  const loading = ref(false)
  const error = ref(null)

  function currentAdminId() {
    return authStore.currentUser?.id ?? null
  }

  async function fetchReports() {
    loading.value = true
    error.value = null
    try {
      reports.value = await getReports()
    } catch (err) {
      error.value = err.message
      reports.value = []
    } finally {
      loading.value = false
    }
  }

  async function updateReportStatus(reportId, status, note) {
    const updated = await updateReportStatusRequest(currentAdminId(), reportId, status, note)
    const index = reports.value.findIndex((report) => report.id === reportId)
    if (index !== -1) reports.value[index] = updated
    return updated
  }

  return { reports, loading, error, fetchReports, updateReportStatus }
})
