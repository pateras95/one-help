<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import OHPageHeader from '@/components/common/OHPageHeader.vue'
import OHCard from '@/components/common/OHCard.vue'
import OHButton from '@/components/common/OHButton.vue'
import LoadingState from '@/components/feedback/LoadingState.vue'
import ErrorState from '@/components/feedback/ErrorState.vue'
import EmptyState from '@/components/feedback/EmptyState.vue'
import { useNotificationsStore } from '@/stores/notifications.store'
import { localizeField } from '@/features/organizer/utils/localizeField'
import { getUserById } from '@/features/auth/services/auth.service'
import { getModeratedActionById, hideAction as hideActionRequest } from '../services/actionModeration.service'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import AdminNavTabs from '../components/AdminNavTabs.vue'
import AdminStatusChip from '../components/AdminStatusChip.vue'
import AdminConfirmDialog from '../components/AdminConfirmDialog.vue'
import { useAdminReportsStore } from '../stores/adminReports.store'
import { REPORT_STATUS } from '../utils/reportStatus'
import { ACTION_MODERATION_STATUS } from '../utils/actionModerationStatus'
import { adminErrorKey } from '../utils/adminErrors'

const { t, locale } = useI18n()
const reportsStore = useAdminReportsStore()
const notificationsStore = useNotificationsStore()
const authStore = useAuthStore()

const enriching = ref(false)
const actionsById = ref(new Map())
const usersById = ref(new Map())

async function enrich() {
  enriching.value = true
  const actionIds = [...new Set(reportsStore.reports.map((report) => report.actionId))]
  const userIds = [...new Set(reportsStore.reports.map((report) => report.reporterUserId))]

  const [actions, users] = await Promise.all([
    Promise.all(actionIds.map((id) => getModeratedActionById(id))),
    Promise.all(userIds.map((id) => getUserById(id)))
  ])

  actionsById.value = new Map(actionIds.map((id, index) => [id, actions[index]]))
  usersById.value = new Map(userIds.map((id, index) => [id, users[index]]))
  enriching.value = false
}

async function load() {
  await reportsStore.fetchReports()
  await enrich()
}

onMounted(load)

const viewDialog = ref({ open: false, report: null })
const statusDialog = ref({ open: false, report: null, nextStatus: null, loading: false })

const STATUS_CHIP = {
  [REPORT_STATUS.OPEN]: { color: 'error', icon: 'mdi-flag-outline' },
  [REPORT_STATUS.INVESTIGATING]: { color: 'warning', icon: 'mdi-magnify' },
  [REPORT_STATUS.RESOLVED]: { color: 'success', icon: 'mdi-check-circle-outline' },
  [REPORT_STATUS.DISMISSED]: { color: 'textSecondary', icon: 'mdi-close-circle-outline' }
}

function actionFor(report) {
  return actionsById.value.get(report.actionId) ?? null
}
function actionTitle(report) {
  const action = actionFor(report)
  return action ? localizeField(action.title, locale.value) : t('admin.reports.missingAction')
}
function reporterName(report) {
  const user = usersById.value.get(report.reporterUserId)
  return user ? `${user.firstName} ${user.lastName}` : ''
}

function formatDateTime(isoString) {
  if (!isoString) return ''
  const formatter = new Intl.DateTimeFormat(locale.value === 'en' ? 'en-GB' : 'el-GR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
  return formatter.format(new Date(isoString))
}

function openView(report) {
  viewDialog.value = { open: true, report }
}

function openStatusChange(report, nextStatus) {
  statusDialog.value = { open: true, report, nextStatus, loading: false }
}
function closeStatusChange() {
  statusDialog.value = { ...statusDialog.value, open: false }
}

async function handleConfirmStatus(note) {
  const { report, nextStatus } = statusDialog.value
  statusDialog.value = { ...statusDialog.value, loading: true }
  try {
    await reportsStore.updateReportStatus(report.id, nextStatus, note)
    notificationsStore.notify(t('admin.reports.notifications.statusUpdateSuccess'), { type: 'success' })
    closeStatusChange()
  } catch (err) {
    notificationsStore.notify(t(adminErrorKey(err.message)), { type: 'error' })
    closeStatusChange()
  }
}

async function handleHideAction(report) {
  try {
    await hideActionRequest(authStore.currentUser.id, report.actionId)
    notificationsStore.notify(t('admin.reports.notifications.hideActionSuccess'), { type: 'success' })
    await enrich()
  } catch (err) {
    notificationsStore.notify(t(adminErrorKey(err.message)), { type: 'error' })
  }
}

const statusDialogTitle = computed(() =>
  statusDialog.value.nextStatus ? t(`admin.reports.statusDialog.${statusDialog.value.nextStatus}Title`) : ''
)
const statusDialogMessage = computed(() =>
  statusDialog.value.nextStatus ? t(`admin.reports.statusDialog.${statusDialog.value.nextStatus}Message`) : ''
)
const statusDialogLabel = computed(() =>
  statusDialog.value.nextStatus ? t(`admin.reports.actions.${statusDialog.value.nextStatus}`) : ''
)
</script>

<template>
  <DefaultLayout>
    <OHPageHeader eyebrow="OneHelp" :title="t('admin.reports.pageTitle')" :subtitle="t('admin.reports.subtitle')" />
    <AdminNavTabs />

    <LoadingState v-if="reportsStore.loading || enriching" :label="t('admin.common.loading')" />

    <ErrorState
      v-else-if="reportsStore.error"
      :title="t('admin.common.errorTitle')"
      :message="t('admin.common.errorMessage')"
      @retry="load"
    />

    <EmptyState
      v-else-if="reportsStore.reports.length === 0"
      :title="t('admin.reports.emptyTitle')"
      :message="t('admin.reports.emptyMessage')"
      icon="mdi-flag-outline"
    />

    <OHCard v-else class="pa-0">
      <VList :aria-label="t('admin.reports.pageTitle')">
        <template v-for="(report, index) in reportsStore.reports" :key="report.id">
          <VDivider v-if="index > 0" />
          <VListItem>
            <div class="d-flex flex-wrap align-center justify-space-between ga-3 w-100 py-2">
              <div>
                <div class="d-flex flex-wrap align-center ga-2 mb-1">
                  <AdminStatusChip
                    :label="t(`admin.reportStatus.${report.status}`)"
                    :icon="STATUS_CHIP[report.status].icon"
                    :color="STATUS_CHIP[report.status].color"
                  />
                  <VChip size="small" variant="tonal">{{ t(`admin.reportReason.${report.reason}`) }}</VChip>
                </div>
                <p class="font-weight-bold mb-0">{{ actionTitle(report) }}</p>
                <p class="text-caption text-textSecondary mb-0">
                  {{ t('admin.reports.reportedBy', { name: reporterName(report), date: formatDateTime(report.createdAt) }) }}
                </p>
              </div>

              <div class="d-flex flex-wrap ga-2 justify-end">
                <OHButton size="small" variant="text" prepend-icon="mdi-eye-outline" @click="openView(report)">
                  {{ t('admin.common.view') }}
                </OHButton>
                <OHButton
                  v-if="report.status === REPORT_STATUS.OPEN"
                  size="small"
                  variant="tonal"
                  @click="openStatusChange(report, REPORT_STATUS.INVESTIGATING)"
                >
                  {{ t('admin.reports.actions.investigating') }}
                </OHButton>
                <OHButton
                  v-if="report.status === REPORT_STATUS.OPEN || report.status === REPORT_STATUS.INVESTIGATING"
                  size="small"
                  variant="tonal"
                  color="success"
                  @click="openStatusChange(report, REPORT_STATUS.RESOLVED)"
                >
                  {{ t('admin.reports.actions.resolved') }}
                </OHButton>
                <OHButton
                  v-if="report.status === REPORT_STATUS.OPEN || report.status === REPORT_STATUS.INVESTIGATING"
                  size="small"
                  variant="tonal"
                  color="error"
                  @click="openStatusChange(report, REPORT_STATUS.DISMISSED)"
                >
                  {{ t('admin.reports.actions.dismissed') }}
                </OHButton>
                <OHButton
                  v-if="report.status === REPORT_STATUS.RESOLVED || report.status === REPORT_STATUS.DISMISSED"
                  size="small"
                  variant="text"
                  @click="openStatusChange(report, REPORT_STATUS.INVESTIGATING)"
                >
                  {{ t('admin.reports.actions.investigating') }}
                </OHButton>
              </div>
            </div>
          </VListItem>
        </template>
      </VList>
    </OHCard>

    <VDialog :model-value="viewDialog.open" max-width="520" @update:model-value="viewDialog.open = false">
      <VCard v-if="viewDialog.report">
        <VCardTitle>{{ t('admin.reports.viewDialog.title') }}</VCardTitle>
        <VCardText>
          <p class="text-body-2 mb-1">
            <strong>{{ t('admin.reports.viewDialog.actionLabel') }}:</strong> {{ actionTitle(viewDialog.report) }}
          </p>
          <p class="text-body-2 mb-1">
            <strong>{{ t('admin.reports.viewDialog.reasonLabel') }}:</strong> {{ t(`admin.reportReason.${viewDialog.report.reason}`) }}
          </p>
          <p v-if="viewDialog.report.description" class="text-body-2 mb-1">
            <strong>{{ t('admin.reports.viewDialog.descriptionLabel') }}:</strong> {{ viewDialog.report.description }}
          </p>
          <p class="text-body-2 mb-1">
            <strong>{{ t('admin.reports.viewDialog.reporterLabel') }}:</strong> {{ reporterName(viewDialog.report) }}
          </p>
          <p class="text-body-2 mb-1">
            <strong>{{ t('admin.reports.viewDialog.createdAtLabel') }}:</strong> {{ formatDateTime(viewDialog.report.createdAt) }}
          </p>
          <p v-if="viewDialog.report.resolutionNote" class="text-body-2 mb-1">
            <strong>{{ t('admin.reports.viewDialog.resolutionNoteLabel') }}:</strong> {{ viewDialog.report.resolutionNote }}
          </p>
          <OHButton
            v-if="actionFor(viewDialog.report)?.moderationStatus === ACTION_MODERATION_STATUS.APPROVED"
            class="mt-2"
            size="small"
            variant="tonal"
            color="error"
            @click="handleHideAction(viewDialog.report)"
          >
            {{ t('admin.reports.hideActionAction') }}
          </OHButton>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="viewDialog.open = false">{{ t('admin.common.close') }}</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <AdminConfirmDialog
      v-model="statusDialog.open"
      :title="statusDialogTitle"
      :message="statusDialogMessage"
      :confirm-label="statusDialogLabel"
      confirm-color="primary"
      :loading="statusDialog.loading"
      :reason-label="statusDialog.nextStatus === REPORT_STATUS.RESOLVED || statusDialog.nextStatus === REPORT_STATUS.DISMISSED ? t('admin.reports.statusDialog.noteLabel') : ''"
      @confirm="handleConfirmStatus"
    />
  </DefaultLayout>
</template>
