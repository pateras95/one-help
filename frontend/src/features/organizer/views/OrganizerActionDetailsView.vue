<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import OHCard from '@/components/common/OHCard.vue'
import OHButton from '@/components/common/OHButton.vue'
import LoadingState from '@/components/feedback/LoadingState.vue'
import ErrorState from '@/components/feedback/ErrorState.vue'
import EmptyState from '@/components/feedback/EmptyState.vue'
import { useNotificationsStore } from '@/stores/notifications.store'
import { useParticipationStore } from '@/features/participation/stores/participation.store'
import { getLocalConfirmedCount } from '@/features/participation/utils/participationCount'
import { useAttendanceStore } from '@/features/attendance/stores/attendance.store'
import { ATTENDANCE_STATUS } from '@/features/attendance/utils/attendanceStatus'
import { getActionCategory } from '@/constants/actionCategories'
import { isPastDate } from '@/utils/date'
import { ROUTES, organizerActionEditPath, organizerActionParticipantsPath, organizerActionCheckInPath } from '@/constants/routes'
import { useOrganizerStore } from '../stores/organizer.store'
import { ORGANIZER_ACTION_STATUS, allowedNextStatuses } from '../utils/organizerActionStatus'
import { organizerActionErrorKey } from '../utils/organizerActionErrors'
import { localizeField } from '../utils/localizeField'
import StatusTransitionDialog from '../components/StatusTransitionDialog.vue'
import { hasValidCoordinates } from '@/features/map/utils/mapCoordinates'

const { t, locale } = useI18n()
const route = useRoute()
const organizerStore = useOrganizerStore()
const participationStore = useParticipationStore()
const attendanceStore = useAttendanceStore()
const notificationsStore = useNotificationsStore()

const transitionTarget = ref(null)

const actionId = computed(() => (typeof route.params.actionId === 'string' ? route.params.actionId : null))

function load() {
  if (!actionId.value) return
  organizerStore.loadActionById(actionId.value)
  attendanceStore.loadActionAttendance(actionId.value)
}

onMounted(load)
watch(actionId, load)

const isNotFoundError = computed(
  () => organizerStore.selectedActionError === 'actionNotFound' || organizerStore.selectedActionError === 'notOwner'
)

const action = computed(() => organizerStore.selectedAction)
const category = computed(() => (action.value ? getActionCategory(action.value.categoryId) : null))
const title = computed(() => (action.value ? localizeField(action.value.title, locale.value) : ''))
const description = computed(() => (action.value ? localizeField(action.value.description, locale.value) : ''))
const locationName = computed(() => (action.value ? localizeField(action.value.locationName, locale.value) : ''))
const municipality = computed(() => (action.value ? localizeField(action.value.municipality, locale.value) : ''))
const equipment = computed(() => (action.value ? localizeField(action.value.requiredEquipment, locale.value) : []))

const confirmedCount = computed(() => {
  if (!action.value) return 0
  void participationStore.countVersion
  return action.value.registeredCount + getLocalConfirmedCount(action.value.id)
})

const availablePlaces = computed(() => {
  if (!action.value) return 0
  return Math.max(action.value.capacity - confirmedCount.value, 0)
})

const checkedInCount = computed(
  () =>
    attendanceStore.actionAttendance.filter(
      (record) => record.status === ATTENDANCE_STATUS.CHECKED_IN || record.status === ATTENDANCE_STATUS.CHECKED_OUT
    ).length
)

const isPublished = computed(() => action.value?.organizerStatus === ORGANIZER_ACTION_STATUS.PUBLISHED)

const formattedDate = computed(() => {
  if (!action.value) return ''
  const formatter = new Intl.DateTimeFormat(locale.value === 'en' ? 'en-GB' : 'el-GR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
  return formatter.format(new Date(action.value.date))
})

const visibilityLines = computed(() => {
  if (!action.value) return []
  const status = action.value.organizerStatus
  if (status === ORGANIZER_ACTION_STATUS.DRAFT) return [t('organizer.details.visibilityHiddenDraft')]
  if (status === ORGANIZER_ACTION_STATUS.CANCELLED) return [t('organizer.details.visibilityHiddenCancelled')]
  if (status === ORGANIZER_ACTION_STATUS.CLOSED) {
    return [t('organizer.details.visibilityPublic'), t('organizer.details.visibilityClosedNote')]
  }
  return [t('organizer.details.visibilityPublic')]
})

const availableTransitions = computed(() => {
  if (!action.value) return []
  return allowedNextStatuses(action.value.organizerStatus).filter(
    (status) => !(status === ORGANIZER_ACTION_STATUS.PUBLISHED && isPastDate(action.value.date))
  )
})

function transitionKind(status) {
  if (action.value.organizerStatus === ORGANIZER_ACTION_STATUS.CLOSED && status === ORGANIZER_ACTION_STATUS.PUBLISHED) {
    return 'republish'
  }
  return status === ORGANIZER_ACTION_STATUS.PUBLISHED ? 'publish' : status === ORGANIZER_ACTION_STATUS.CLOSED ? 'close' : 'cancel'
}

function transitionLabel(status) {
  const kind = transitionKind(status)
  return t(`organizer.card.${kind}`)
}

function requestTransition(status) {
  transitionTarget.value = { kind: transitionKind(status), status }
}

async function confirmTransition() {
  if (!transitionTarget.value || organizerStore.loading) return
  const { kind, status } = transitionTarget.value
  try {
    await organizerStore.changeStatus(actionId.value, status)
    notificationsStore.notify(t(`organizer.transitions.success${kind.charAt(0).toUpperCase()}${kind.slice(1)}`), { type: 'success' })
    transitionTarget.value = null
  } catch (err) {
    notificationsStore.notify(t(organizerActionErrorKey(err.message)), { type: 'error' })
    transitionTarget.value = null
  }
}
</script>

<template>
  <DefaultLayout>
    <OHButton variant="text" prepend-icon="mdi-arrow-left" class="mb-4" :to="ROUTES.ORGANIZER">
      {{ t('organizer.details.backToDashboard') }}
    </OHButton>

    <LoadingState v-if="organizerStore.selectedActionLoading" :label="t('organizer.details.loading')" />

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
      v-else-if="organizerStore.selectedActionError"
      :title="t('organizer.details.errorTitle')"
      :message="t('organizer.details.errorMessage')"
      @retry="load"
    />

    <template v-else-if="action">
      <div class="d-flex align-center flex-wrap ga-2 mb-3">
        <VChip v-if="category" :color="category.accent" variant="tonal" :prepend-icon="category.icon">
          {{ t(category.labelKey) }}
        </VChip>
        <VChip size="small" variant="tonal">
          {{ t(`organizer.status.${action.organizerStatus}`) }}
        </VChip>
        <VChip v-if="action.urgency !== 'normal'" size="small" :color="action.urgency === 'urgent' ? 'error' : 'warning'">
          {{ t(`actions.urgency.${action.urgency}`) }}
        </VChip>
      </div>

      <h1 class="oh-page-title font-weight-bold text-textPrimary mb-6">{{ title }}</h1>

      <VRow>
        <VCol cols="12" md="8">
          <OHCard class="pa-5 mb-4">
            <h2 class="text-subtitle-1 font-weight-bold mb-2">{{ t('organizer.details.aboutTitle') }}</h2>
            <p class="text-body-1 text-textSecondary mb-0">{{ description }}</p>
          </OHCard>

          <OHCard v-if="equipment.length" class="pa-5">
            <h2 class="text-subtitle-1 font-weight-bold mb-2">{{ t('organizer.details.equipmentTitle') }}</h2>
            <VList density="compact">
              <VListItem v-for="item in equipment" :key="item" :title="item" prepend-icon="mdi-check-circle-outline" />
            </VList>
          </OHCard>
        </VCol>

        <VCol cols="12" md="4">
          <OHCard class="pa-5 mb-4">
            <h2 class="text-subtitle-2 font-weight-bold mb-3">{{ t('organizer.details.whenTitle') }}</h2>
            <div class="d-flex align-center ga-2 text-body-2 text-textSecondary">
              <VIcon icon="mdi-calendar-blank-outline" aria-hidden="true" />
              <span class="text-capitalize">{{ formattedDate }}</span>
            </div>
            <div class="d-flex align-center ga-2 text-body-2 text-textSecondary mt-1">
              <VIcon icon="mdi-clock-outline" aria-hidden="true" />
              <span>{{ action.startTime }}</span>
            </div>
          </OHCard>

          <OHCard class="pa-5 mb-4">
            <h2 class="text-subtitle-2 font-weight-bold mb-3">{{ t('organizer.details.whereTitle') }}</h2>
            <div class="d-flex align-center ga-2 text-body-2 text-textSecondary">
              <VIcon icon="mdi-map-marker-outline" aria-hidden="true" />
              <span>{{ locationName }}, {{ municipality }}</span>
            </div>
            <p v-if="isPublished && !hasValidCoordinates(action)" class="text-caption text-textSecondary mt-3 mb-0">
              {{ t('map.organizerForm.missingCoordinatesNote') }}
            </p>
          </OHCard>

          <OHCard class="pa-5 mb-4">
            <h2 class="text-subtitle-2 font-weight-bold mb-3">{{ t('organizer.details.capacityTitle') }}</h2>
            <p class="text-body-2 text-textSecondary mb-1">
              {{ t('organizer.details.confirmedCount', { confirmed: confirmedCount }) }}
            </p>
            <p class="text-body-2 text-textSecondary mb-1">
              {{ t('organizer.details.availablePlaces', { available: availablePlaces }) }}
            </p>
            <p v-if="isPublished" class="text-body-2 text-textSecondary mb-0">
              {{ t('attendance.checkIn.checkedInCount', { count: checkedInCount }) }}
            </p>
            <OHButton
              class="mt-3"
              variant="text"
              size="small"
              prepend-icon="mdi-account-multiple-outline"
              :to="organizerActionParticipantsPath(action.id)"
            >
              {{ t('organizer.details.viewParticipants') }}
            </OHButton>
          </OHCard>

          <OHCard class="pa-5 mb-4">
            <h2 class="text-subtitle-2 font-weight-bold mb-2">{{ t('organizer.details.visibilityTitle') }}</h2>
            <p v-for="line in visibilityLines" :key="line" class="text-body-2 text-textSecondary mb-0">
              {{ line }}
            </p>
          </OHCard>

          <OHCard class="pa-5">
            <div class="d-flex flex-wrap ga-2">
              <OHButton color="primary" variant="tonal" :to="organizerActionEditPath(action.id)">
                {{ t('organizer.card.edit') }}
              </OHButton>
              <OHButton
                v-if="isPublished"
                color="primary"
                variant="tonal"
                prepend-icon="mdi-qrcode"
                :to="organizerActionCheckInPath(action.id)"
              >
                {{ t('attendance.checkIn.pageTitle') }}
              </OHButton>
              <OHButton
                v-for="status in availableTransitions"
                :key="status"
                variant="tonal"
                :color="transitionKind(status) === 'cancel' ? 'error' : undefined"
                @click="requestTransition(status)"
              >
                {{ transitionLabel(status) }}
              </OHButton>
            </div>
          </OHCard>
        </VCol>
      </VRow>
    </template>

    <StatusTransitionDialog
      :model-value="Boolean(transitionTarget)"
      :transition="transitionTarget?.kind"
      :action-title="title"
      :loading="organizerStore.loading"
      @update:model-value="transitionTarget = null"
      @confirm="confirmTransition"
    />
  </DefaultLayout>
</template>
