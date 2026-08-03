<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import OHCard from '@/components/common/OHCard.vue'
import OHButton from '@/components/common/OHButton.vue'
import SignalStatusBadge from '@/components/common/SignalStatusBadge.vue'
import { getActionCategory } from '@/constants/actionCategories'
import { actionDetailsPath } from '@/constants/routes'
import { ATTENDANCE_STATUS } from '@/features/attendance/utils/attendanceStatus'
import { PARTICIPATION_STATUS } from '../utils/participationStatus'

const props = defineProps({
  participation: {
    type: Object,
    required: true
  },
  // `null` when the referenced action can no longer be found (e.g. a
  // malformed/tampered participation record) — rendered as a distinct
  // "unknown action" state rather than crashing on missing fields.
  action: {
    type: Object,
    default: null
  },
  cancellable: {
    type: Boolean,
    default: false
  },
  // `null` when no attendance record exists yet — only meaningful for a
  // still-confirmed participation, never shown for a cancelled one.
  attendance: {
    type: Object,
    default: null
  }
})

defineEmits(['cancel'])

const { t, locale } = useI18n()

const category = computed(() => (props.action ? getActionCategory(props.action.categoryId) : null))

const formattedDate = computed(() => {
  if (!props.action) return ''
  const formatter = new Intl.DateTimeFormat(locale.value === 'en' ? 'en-GB' : 'el-GR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  })
  return formatter.format(new Date(props.action.date))
})

const showAttendance = computed(() => props.participation.status === PARTICIPATION_STATUS.CONFIRMED)
const attendanceStatus = computed(() => props.attendance?.status ?? ATTENDANCE_STATUS.NOT_CHECKED_IN)
const attendanceColor = computed(() => (attendanceStatus.value === ATTENDANCE_STATUS.NOT_CHECKED_IN ? 'textSecondary' : 'success'))

const formattedCheckedInAt = computed(() => {
  if (!props.attendance?.checkedInAt) return ''
  const formatter = new Intl.DateTimeFormat(locale.value === 'en' ? 'en-GB' : 'el-GR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
  return formatter.format(new Date(props.attendance.checkedInAt))
})
</script>

<template>
  <OHCard class="oh-action-card oh-card-interactive h-100 d-flex flex-column">
    <span
      v-if="category"
      class="oh-action-card__rail"
      :class="`bg-${category.accent}`"
      aria-hidden="true"
    />

    <div class="oh-action-card__body pa-5 d-flex flex-column flex-grow-1">
      <template v-if="action">
        <div class="oh-action-card__badges d-flex align-center flex-wrap ga-2 mb-2">
          <div v-if="category" class="oh-icon-well oh-action-card__category-well" :class="`bg-${category.accent}`">
            <VIcon :icon="category.icon" size="16" color="white" aria-hidden="true" />
          </div>
          <SignalStatusBadge
            size="small"
            :color="participation.status === PARTICIPATION_STATUS.CONFIRMED ? 'success' : 'textSecondary'"
            :label="t(`participation.status.${participation.status}`)"
          />
          <SignalStatusBadge v-if="showAttendance" size="small" :color="attendanceColor" :label="t(`attendance.myActions.${attendanceStatus}`)" />
        </div>

        <h3 class="oh-action-card__title font-weight-bold mb-1">
          {{ action.title }}
        </h3>
        <div class="oh-action-card__checkin mb-3">
          <p v-if="showAttendance && formattedCheckedInAt" class="text-caption text-textSecondary mb-0">
            {{ t('attendance.myActions.checkedInAt', { date: formattedCheckedInAt }) }}
          </p>
        </div>

        <div class="oh-action-card__meta mb-4">
          <div class="oh-action-card__meta-cell">
            <VIcon icon="mdi-calendar-blank-outline" size="16" aria-hidden="true" />
            <span class="text-capitalize">{{ formattedDate }} · {{ action.startTime }}</span>
          </div>
          <div class="oh-action-card__meta-cell">
            <VIcon icon="mdi-map-marker-outline" size="16" aria-hidden="true" />
            <span class="oh-action-card__meta-truncate">{{ action.locationName }}</span>
          </div>
          <div class="oh-action-card__meta-cell oh-action-card__meta-cell--wide">
            <VIcon icon="mdi-account-group-outline" size="16" aria-hidden="true" />
            <span class="oh-action-card__meta-truncate">{{ action.organization }}</span>
          </div>
        </div>

        <div class="d-flex flex-wrap ga-2 mt-auto">
          <OHButton variant="tonal" color="primary" size="large" :to="actionDetailsPath(action.id)">
            {{ t('participation.myActions.viewDetails') }}
          </OHButton>
          <OHButton
            v-if="cancellable"
            variant="outlined"
            color="error"
            size="large"
            :aria-label="t('participation.myActions.cancelAriaLabel', { title: action.title })"
            @click="$emit('cancel')"
          >
            {{ t('participation.myActions.cancelParticipation') }}
          </OHButton>
        </div>
      </template>

      <template v-else>
        <VAlert type="warning" variant="tonal" density="comfortable">
          <p class="font-weight-bold mb-1">{{ t('participation.myActions.unknownAction') }}</p>
          <p class="text-body-2 mb-0">{{ t('participation.myActions.unknownActionMessage') }}</p>
        </VAlert>
        <OHButton
          v-if="cancellable"
          class="mt-3 mt-auto"
          variant="outlined"
          color="error"
          size="large"
          @click="$emit('cancel')"
        >
          {{ t('participation.myActions.cancelParticipation') }}
        </OHButton>
      </template>
    </div>
  </OHCard>
</template>

<style scoped>
.oh-action-card {
  position: relative;
  overflow: hidden;
}

.oh-action-card__rail {
  position: absolute;
  inset: 0 auto 0 0;
  width: 5px;
  z-index: 1;
}

.oh-action-card__body {
  padding-inline-start: calc(var(--oh-space-lg) + 4px);
}

.oh-action-card__category-well {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
}

/* Reserves room for the worst case (icon well + two badges wrapping to
   a second line) so the title below always starts at the same Y
   regardless of how many badges a given participation has. */
.oh-action-card__badges {
  min-height: 58px;
  align-content: flex-start;
}

.oh-action-card__title {
  min-height: 3rem;
  font-size: 1.0625rem;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.oh-action-card__checkin {
  min-height: 1.25rem;
}

.oh-action-card__meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 10px;
  font-size: 0.8125rem;
  color: rgb(var(--v-theme-textSecondary));
}

.oh-action-card__meta-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.oh-action-card__meta-cell--wide {
  grid-column: 1 / -1;
}

.oh-action-card__meta-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
