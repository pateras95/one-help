<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import QRCode from 'qrcode'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import OHCard from '@/components/common/OHCard.vue'
import OHButton from '@/components/common/OHButton.vue'
import SignalStatusBadge from '@/components/common/SignalStatusBadge.vue'
import SignalMetricCard from '@/components/common/SignalMetricCard.vue'
import LoadingState from '@/components/feedback/LoadingState.vue'
import ErrorState from '@/components/feedback/ErrorState.vue'
import EmptyState from '@/components/feedback/EmptyState.vue'
import { useNotificationsStore } from '@/stores/notifications.store'
import { useOrganizerStore } from '@/features/organizer/stores/organizer.store'
import { ORGANIZER_ACTION_STATUS } from '@/features/organizer/utils/organizerActionStatus'
import { localizeField } from '@/features/organizer/utils/localizeField'
import { getLocalConfirmedCount } from '@/features/participation/utils/participationCount'
import { ROUTES, organizerActionParticipantsPath, organizerActionDetailsPath } from '@/constants/routes'
import { useAttendanceStore } from '../stores/attendance.store'
import { ATTENDANCE_STATUS } from '../utils/attendanceStatus'
import { attendanceErrorKey } from '../utils/attendanceErrors'
import { isWithinCheckInWindow } from '../utils/checkInWindow'

const { t, locale } = useI18n()
const route = useRoute()
const organizerStore = useOrganizerStore()
const attendanceStore = useAttendanceStore()
const notificationsStore = useNotificationsStore()

const qrDataUrl = ref('')
const nowTick = ref(Date.now())
let countdownTimer = null

const actionId = computed(() => (typeof route.params.actionId === 'string' ? route.params.actionId : null))
const action = computed(() => organizerStore.selectedAction)
const title = computed(() => (action.value ? localizeField(action.value.title, locale.value) : ''))

function load() {
  if (!actionId.value) return
  organizerStore.loadActionById(actionId.value)
  attendanceStore.loadActionAttendance(actionId.value)
}

onMounted(load)
watch(actionId, load)

onMounted(() => {
  countdownTimer = setInterval(() => {
    nowTick.value = Date.now()
  }, 1000)
})
onUnmounted(() => clearInterval(countdownTimer))

const isLoading = computed(() => organizerStore.selectedActionLoading)
const isNotFoundError = computed(
  () => organizerStore.selectedActionError === 'actionNotFound' || organizerStore.selectedActionError === 'notOwner'
)
const isPublished = computed(() => action.value?.organizerStatus === ORGANIZER_ACTION_STATUS.PUBLISHED)

// Ensures a live session exists for a freshly-loaded, published action —
// reuses a still-valid persisted session (so a page refresh doesn't
// invalidate a code volunteers may already be scanning) or mints a new one.
watch(
  action,
  async (currentAction) => {
    if (!currentAction || currentAction.organizerStatus !== ORGANIZER_ACTION_STATUS.PUBLISHED) return
    await attendanceStore.loadQrSession(currentAction.id)
    if (!attendanceStore.qrSession) {
      await attendanceStore.regenerateQrSession(currentAction.id)
    }
  },
  { immediate: true }
)

watch(
  () => attendanceStore.qrSession?.token,
  async (token) => {
    qrDataUrl.value = token ? await QRCode.toDataURL(token, { margin: 1, width: 220 }) : ''
  },
  { immediate: true }
)

const confirmedCount = computed(() => {
  if (!action.value) return 0
  return action.value.registeredCount + getLocalConfirmedCount(action.value.id)
})
const checkedInCount = computed(
  () =>
    attendanceStore.actionAttendance.filter(
      (record) => record.status === ATTENDANCE_STATUS.CHECKED_IN || record.status === ATTENDANCE_STATUS.CHECKED_OUT
    ).length
)

const secondsRemaining = computed(() => {
  if (!attendanceStore.qrSession) return 0
  void nowTick.value
  return Math.max(0, Math.round((new Date(attendanceStore.qrSession.expiresAt).getTime() - Date.now()) / 1000))
})
const isExpired = computed(() => Boolean(attendanceStore.qrSession) && secondsRemaining.value <= 0)
const countdownLabel = computed(() => {
  const minutes = Math.floor(secondsRemaining.value / 60)
  const seconds = secondsRemaining.value % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

const showWindowNotice = computed(() => Boolean(action.value) && !isWithinCheckInWindow(action.value))

async function handleRegenerate() {
  try {
    await attendanceStore.regenerateQrSession(action.value.id)
    notificationsStore.notify(t('attendance.checkIn.regenerateSuccess'), { type: 'success' })
  } catch (err) {
    notificationsStore.notify(t(attendanceErrorKey(err.message)), { type: 'error' })
  }
}
</script>

<template>
  <DefaultLayout>
    <OHButton
      variant="text"
      prepend-icon="mdi-arrow-left"
      class="mb-4"
      :to="actionId ? organizerActionDetailsPath(actionId) : ROUTES.ORGANIZER"
    >
      {{ t('attendance.checkIn.backToParticipants') }}
    </OHButton>

    <LoadingState v-if="isLoading" :label="t('attendance.checkIn.loading')" />

    <EmptyState
      v-else-if="isNotFoundError"
      :title="t('attendance.checkIn.notFoundTitle')"
      :message="t('attendance.checkIn.notFoundMessage')"
      icon="mdi-map-marker-question-outline"
    >
      <OHButton class="mt-4" color="primary" :to="ROUTES.ORGANIZER">
        {{ t('organizer.details.backToDashboard') }}
      </OHButton>
    </EmptyState>

    <ErrorState
      v-else-if="organizerStore.selectedActionError"
      :title="t('attendance.checkIn.errorTitle')"
      :message="t('attendance.checkIn.errorMessage')"
      @retry="load"
    />

    <template v-else-if="action">
      <span class="oh-eyebrow mb-2 d-block">OneHelp</span>
      <h1 class="oh-page-title font-weight-bold text-textPrimary mb-1">{{ t('attendance.checkIn.pageTitle') }}</h1>
      <p class="text-body-2 text-textSecondary mb-6">{{ title }}</p>

      <EmptyState
        v-if="!isPublished"
        :title="t('attendance.checkIn.notPublishedTitle')"
        :message="t('attendance.checkIn.notPublishedMessage')"
        icon="mdi-qrcode-remove"
      />

      <template v-else>
        <VRow>
          <VCol cols="12" sm="6" md="3">
            <SignalMetricCard
              :value="confirmedCount"
              :label="t('attendance.checkIn.confirmedCount', { count: confirmedCount })"
              icon="mdi-account-group-outline"
              color="primary"
            />
          </VCol>
          <VCol cols="12" sm="6" md="3">
            <SignalMetricCard
              :value="checkedInCount"
              :label="t('attendance.checkIn.checkedInCount', { count: checkedInCount })"
              icon="mdi-check-decagram-outline"
              color="success"
            />
          </VCol>
        </VRow>

        <VAlert v-if="showWindowNotice" type="info" variant="tonal" density="comfortable" class="my-4">
          {{ t('attendance.checkIn.windowOutsideNotice') }}
        </VAlert>

        <OHCard class="pa-5 mt-4 text-center">
          <h2 class="text-subtitle-1 font-weight-bold mb-3">{{ t('attendance.checkIn.qrSectionTitle') }}</h2>

          <LoadingState v-if="attendanceStore.qrSessionLoading && !qrDataUrl" :label="t('attendance.checkIn.loading')" />

          <template v-else-if="qrDataUrl">
            <img
              :src="qrDataUrl"
              :alt="t('attendance.checkIn.qrImageAlt')"
              width="220"
              height="220"
              class="mx-auto d-block mb-3"
              :style="isExpired ? 'opacity: 0.35' : ''"
            />
            <p v-if="!isExpired" class="text-body-2 text-textSecondary mb-3" role="status">
              {{ t('attendance.checkIn.qrExpiresIn', { time: countdownLabel }) }}
            </p>
            <SignalStatusBadge v-else emphasis="solid" color="error" class="mb-3" :label="t('attendance.checkIn.qrExpired')" />
            <div>
              <OHButton
                color="primary"
                variant="tonal"
                prepend-icon="mdi-refresh"
                :loading="attendanceStore.qrSessionLoading"
                :disabled="attendanceStore.qrSessionLoading"
                @click="handleRegenerate"
              >
                {{ t('attendance.checkIn.regenerate') }}
              </OHButton>
            </div>
          </template>
        </OHCard>

        <OHCard class="pa-5 mt-4">
          <h2 class="text-subtitle-1 font-weight-bold mb-2">{{ t('attendance.checkIn.manualSectionTitle') }}</h2>
          <p class="text-body-2 text-textSecondary mb-3">{{ t('organizer.details.viewParticipants') }}</p>
          <OHButton color="primary" variant="tonal" prepend-icon="mdi-account-multiple-outline" :to="organizerActionParticipantsPath(action.id)">
            {{ t('organizer.details.viewParticipants') }}
          </OHButton>
        </OHCard>
      </template>
    </template>
  </DefaultLayout>
</template>
