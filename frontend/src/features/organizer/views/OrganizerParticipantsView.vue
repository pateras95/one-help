<script setup>
import { computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import OHCard from '@/components/common/OHCard.vue'
import OHButton from '@/components/common/OHButton.vue'
import LoadingState from '@/components/feedback/LoadingState.vue'
import ErrorState from '@/components/feedback/ErrorState.vue'
import EmptyState from '@/components/feedback/EmptyState.vue'
import { useNotificationsStore } from '@/stores/notifications.store'
import { PARTICIPATION_STATUS } from '@/features/participation/utils/participationStatus'
import { useAttendanceStore } from '@/features/attendance/stores/attendance.store'
import { ATTENDANCE_STATUS } from '@/features/attendance/utils/attendanceStatus'
import { attendanceErrorKey } from '@/features/attendance/utils/attendanceErrors'
import { ROUTES, organizerActionDetailsPath, organizerActionCheckInPath } from '@/constants/routes'
import { useOrganizerStore } from '../stores/organizer.store'
import { ORGANIZER_ACTION_STATUS } from '../utils/organizerActionStatus'
import { localizeField } from '../utils/localizeField'

const { t, locale } = useI18n()
const route = useRoute()
const organizerStore = useOrganizerStore()
const attendanceStore = useAttendanceStore()
const notificationsStore = useNotificationsStore()

const actionId = computed(() => (typeof route.params.actionId === 'string' ? route.params.actionId : null))

function load() {
  if (!actionId.value) return
  organizerStore.loadActionById(actionId.value)
  organizerStore.loadParticipants(actionId.value)
  attendanceStore.loadActionAttendance(actionId.value)
}

onMounted(load)
watch(actionId, load)

const action = computed(() => organizerStore.selectedAction)
const actionTitle = computed(() => (action.value ? localizeField(action.value.title, locale.value) : ''))
const isPublished = computed(() => action.value?.organizerStatus === ORGANIZER_ACTION_STATUS.PUBLISHED)

const isLoading = computed(
  () => organizerStore.selectedActionLoading || organizerStore.participantsLoading || attendanceStore.actionAttendanceLoading
)
const errorCode = computed(() => organizerStore.selectedActionError || organizerStore.participantsError)
const isNotFoundError = computed(() => errorCode.value === 'actionNotFound' || errorCode.value === 'notOwner')

const confirmedParticipants = computed(
  () => organizerStore.participants.filter((participant) => participant.status === PARTICIPATION_STATUS.CONFIRMED)
)
const cancelledParticipants = computed(
  () => organizerStore.participants.filter((participant) => participant.status === PARTICIPATION_STATUS.CANCELLED)
)

function attendanceFor(participant) {
  return attendanceStore.actionAttendance.find((record) => record.participationId === participant.id) ?? null
}

function attendanceStatusFor(participant) {
  return attendanceFor(participant)?.status ?? ATTENDANCE_STATUS.NOT_CHECKED_IN
}

function attendanceChipColor(participant) {
  return attendanceStatusFor(participant) === ATTENDANCE_STATUS.CHECKED_IN ? 'success' : 'textSecondary'
}

function canManualCheckIn(participant) {
  return isPublished.value && participant.status === PARTICIPATION_STATUS.CONFIRMED && !attendanceFor(participant)
}

function canCheckOut(participant) {
  return attendanceStatusFor(participant) === ATTENDANCE_STATUS.CHECKED_IN
}

async function handleManualCheckIn(participant) {
  try {
    await attendanceStore.checkInManually(participant.id)
    notificationsStore.notify(t('attendance.checkIn.checkInSuccess'), { type: 'success' })
  } catch (err) {
    notificationsStore.notify(t(attendanceErrorKey(err.message)), { type: 'error' })
  }
}

async function handleCheckOut(participant) {
  const record = attendanceFor(participant)
  if (!record) return
  try {
    await attendanceStore.checkOut(record.id)
    notificationsStore.notify(t('attendance.checkIn.checkOutSuccess'), { type: 'success' })
  } catch (err) {
    notificationsStore.notify(t(attendanceErrorKey(err.message)), { type: 'error' })
  }
}

function formatDate(isoString) {
  if (!isoString) return ''
  const formatter = new Intl.DateTimeFormat(locale.value === 'en' ? 'en-GB' : 'el-GR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
  return formatter.format(new Date(isoString))
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

function fullName(participant) {
  if (!participant.firstName && !participant.lastName) return participant.userId
  return `${participant.firstName ?? ''} ${participant.lastName ?? ''}`.trim()
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
      {{ t('organizer.participants.backToAction') }}
    </OHButton>

    <LoadingState v-if="isLoading" :label="t('organizer.participants.loading')" />

    <EmptyState
      v-else-if="isNotFoundError"
      :title="t('organizer.details.notFoundTitle')"
      :message="t('organizer.details.notFoundMessage')"
      icon="mdi-map-marker-question-outline"
    >
      <OHButton class="mt-4" color="primary" :to="ROUTES.ORGANIZER">
        {{ t('organizer.details.backToDashboard') }}
      </OHButton>
    </EmptyState>

    <ErrorState
      v-else-if="errorCode"
      :title="t('organizer.participants.errorTitle')"
      :message="t('organizer.participants.errorMessage')"
      @retry="load"
    />

    <template v-else>
      <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-1">
        <h1 class="oh-page-title font-weight-bold text-textPrimary mb-0">{{ t('organizer.participants.title') }}</h1>
        <OHButton
          v-if="isPublished"
          variant="tonal"
          color="primary"
          prepend-icon="mdi-qrcode"
          :to="organizerActionCheckInPath(actionId)"
        >
          {{ t('attendance.checkIn.pageTitle') }}
        </OHButton>
      </div>
      <p class="text-body-2 text-textSecondary mb-6">{{ actionTitle }}</p>

      <div class="d-flex flex-wrap ga-2 mb-4">
        <VChip color="success" variant="tonal">
          {{ t('organizer.participants.confirmedCount', { count: confirmedParticipants.length }) }}
        </VChip>
        <VChip color="textSecondary" variant="tonal">
          {{ t('organizer.participants.cancelledCount', { count: cancelledParticipants.length }) }}
        </VChip>
      </div>

      <EmptyState
        v-if="organizerStore.participants.length === 0"
        :title="t('organizer.participants.emptyTitle')"
        :message="t('organizer.participants.emptyMessage')"
        icon="mdi-account-multiple-outline"
      />

      <OHCard v-else class="pa-0">
        <VList :aria-label="t('organizer.participants.title')">
          <template v-for="(participant, index) in organizerStore.participants" :key="participant.id">
            <VDivider v-if="index > 0" />
            <VListItem>
              <div class="d-flex flex-wrap align-center justify-space-between ga-3 w-100 py-2">
                <div class="d-flex align-center ga-3">
                  <VAvatar color="primary" size="36">
                    <span class="text-caption font-weight-bold" aria-hidden="true">
                      {{ participant.avatarInitials ?? '?' }}
                    </span>
                  </VAvatar>
                  <div>
                    <p class="font-weight-bold mb-0">{{ fullName(participant) }}</p>
                    <p class="text-body-2 text-textSecondary mb-0">{{ participant.email }}</p>
                    <p class="text-caption text-textSecondary mb-0">
                      {{ participant.status === 'confirmed'
                        ? t('organizer.participants.joinedAt', { date: formatDate(participant.joinedAt) })
                        : t('organizer.participants.cancelledAt', { date: formatDate(participant.cancelledAt) }) }}
                    </p>
                    <p v-if="attendanceFor(participant)?.checkedInAt" class="text-caption text-textSecondary mb-0">
                      {{ t('attendance.myActions.checkedInAt', { date: formatDateTime(attendanceFor(participant).checkedInAt) }) }}
                    </p>
                    <p v-if="attendanceFor(participant)?.checkedOutAt" class="text-caption text-textSecondary mb-0">
                      {{ t('attendance.checkIn.checkOutAction') }}: {{ formatDateTime(attendanceFor(participant).checkedOutAt) }}
                    </p>
                  </div>
                </div>

                <div class="d-flex flex-column align-end ga-2">
                  <div class="d-flex flex-wrap ga-2 justify-end">
                    <VChip size="small" :color="participant.status === 'confirmed' ? 'success' : 'textSecondary'" variant="tonal">
                      {{ t(`participation.status.${participant.status}`) }}
                    </VChip>
                    <VChip size="small" :color="attendanceChipColor(participant)" variant="tonal">
                      {{ t(`attendance.status.${attendanceStatusFor(participant)}`) }}
                    </VChip>
                  </div>
                  <div class="d-flex ga-2">
                    <OHButton
                      v-if="canManualCheckIn(participant)"
                      size="small"
                      variant="tonal"
                      color="primary"
                      :loading="attendanceStore.checkInLoading"
                      :disabled="attendanceStore.checkInLoading"
                      :aria-label="`${t('attendance.checkIn.manualCheckInAction')} — ${fullName(participant)}`"
                      @click="handleManualCheckIn(participant)"
                    >
                      {{ t('attendance.checkIn.manualCheckInAction') }}
                    </OHButton>
                    <OHButton
                      v-if="canCheckOut(participant)"
                      size="small"
                      variant="outlined"
                      :loading="attendanceStore.checkInLoading"
                      :disabled="attendanceStore.checkInLoading"
                      :aria-label="`${t('attendance.checkIn.checkOutAction')} — ${fullName(participant)}`"
                      @click="handleCheckOut(participant)"
                    >
                      {{ t('attendance.checkIn.checkOutAction') }}
                    </OHButton>
                  </div>
                </div>
              </div>
            </VListItem>
          </template>
        </VList>
      </OHCard>
    </template>
  </DefaultLayout>
</template>
