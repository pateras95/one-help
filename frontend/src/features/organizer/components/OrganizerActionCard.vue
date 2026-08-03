<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import OHCard from '@/components/common/OHCard.vue'
import SignalStatusBadge from '@/components/common/SignalStatusBadge.vue'
import { getActionCategory } from '@/constants/actionCategories'
import { isPastDate } from '@/utils/date'
import { useParticipationStore } from '@/features/participation/stores/participation.store'
import { getLocalConfirmedCount } from '@/features/participation/utils/participationCount'
import { localizeField } from '../utils/localizeField'
import { ORGANIZER_ACTION_STATUS, allowedNextStatuses } from '../utils/organizerActionStatus'

const props = defineProps({
  action: {
    type: Object,
    required: true
  }
})

defineEmits(['view', 'edit', 'participants', 'transition', 'check-in'])

const { t, locale } = useI18n()
const participationStore = useParticipationStore()

const title = computed(() => localizeField(props.action.title, locale.value))
const category = computed(() => getActionCategory(props.action.categoryId))

const confirmedCount = computed(() => {
  void participationStore.countVersion
  return props.action.registeredCount + getLocalConfirmedCount(props.action.id)
})

const formattedDate = computed(() => {
  const formatter = new Intl.DateTimeFormat(locale.value === 'en' ? 'en-GB' : 'el-GR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
  return formatter.format(new Date(props.action.date))
})

const statusColor = computed(() => {
  if (props.action.organizerStatus === ORGANIZER_ACTION_STATUS.PUBLISHED) return 'success'
  if (props.action.organizerStatus === ORGANIZER_ACTION_STATUS.DRAFT) return 'textSecondary'
  if (props.action.organizerStatus === ORGANIZER_ACTION_STATUS.CLOSED) return 'warning'
  return 'error'
})

// 'closed' -> 'published' (republish) is only offered when the date is
// still valid — the service would reject it otherwise, but hiding it
// here keeps the menu from offering a transition that can't succeed.
const availableTransitions = computed(() =>
  allowedNextStatuses(props.action.organizerStatus).filter(
    (status) => !(status === ORGANIZER_ACTION_STATUS.PUBLISHED && isPastDate(props.action.date))
  )
)

function transitionLabel(status) {
  if (props.action.organizerStatus === ORGANIZER_ACTION_STATUS.CLOSED && status === ORGANIZER_ACTION_STATUS.PUBLISHED) {
    return t('organizer.card.republish')
  }
  if (status === ORGANIZER_ACTION_STATUS.PUBLISHED) return t('organizer.card.publish')
  if (status === ORGANIZER_ACTION_STATUS.CLOSED) return t('organizer.card.close')
  if (status === ORGANIZER_ACTION_STATUS.CANCELLED) return t('organizer.card.cancel')
  return status
}

function transitionKind(status) {
  if (props.action.organizerStatus === ORGANIZER_ACTION_STATUS.CLOSED && status === ORGANIZER_ACTION_STATUS.PUBLISHED) {
    return 'republish'
  }
  return status === ORGANIZER_ACTION_STATUS.PUBLISHED ? 'publish' : status === ORGANIZER_ACTION_STATUS.CLOSED ? 'close' : 'cancel'
}
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
      <div class="d-flex align-center justify-space-between mb-3 ga-2">
        <div class="d-flex align-center ga-2">
          <div v-if="category" class="oh-icon-well oh-icon-well--sm" :class="`bg-${category.accent}`">
            <VIcon :icon="category.icon" size="16" color="white" aria-hidden="true" />
          </div>
        </div>
        <SignalStatusBadge size="small" :color="statusColor" :label="t(`organizer.status.${action.organizerStatus}`)" />
      </div>

      <h3 class="oh-action-card__title font-weight-bold mb-2">{{ title }}</h3>

      <div class="oh-action-card__meta mb-4">
        <div class="oh-action-card__meta-cell oh-action-card__meta-cell--wide">
          <VIcon icon="mdi-calendar-blank-outline" size="16" aria-hidden="true" />
          <span>{{ t('organizer.card.upcomingDate', { date: formattedDate }) }}</span>
        </div>
        <div class="oh-action-card__meta-cell oh-action-card__meta-cell--wide">
          <VIcon icon="mdi-account-group-outline" size="16" aria-hidden="true" />
          <span>{{ t('organizer.card.capacity', { confirmed: confirmedCount, capacity: action.capacity }) }}</span>
        </div>
      </div>

      <div class="oh-action-card__footer d-flex flex-wrap align-content-start ga-2 mt-auto">
        <VBtn variant="tonal" color="primary" size="small" @click="$emit('view')">
          {{ t('organizer.card.view') }}
        </VBtn>
        <VBtn variant="tonal" size="small" @click="$emit('edit')">
          {{ t('organizer.card.edit') }}
        </VBtn>
        <VBtn variant="tonal" size="small" @click="$emit('participants')">
          {{ t('organizer.card.participants') }}
        </VBtn>
        <VBtn
          v-if="action.organizerStatus === ORGANIZER_ACTION_STATUS.PUBLISHED"
          variant="tonal"
          color="primary"
          size="small"
          prepend-icon="mdi-qrcode"
          @click="$emit('check-in')"
        >
          {{ t('attendance.checkIn.pageTitle') }}
        </VBtn>

        <VMenu v-if="availableTransitions.length">
          <template #activator="{ props: menuProps }">
            <VBtn
              v-bind="menuProps"
              icon="mdi-dots-vertical"
              size="small"
              variant="text"
              :aria-label="t('organizer.card.actionsMenuAriaLabel', { title })"
            />
          </template>
          <VList density="compact">
            <VListItem
              v-for="status in availableTransitions"
              :key="status"
              :title="transitionLabel(status)"
              @click="$emit('transition', { kind: transitionKind(status), status })"
            />
          </VList>
        </VMenu>
      </div>
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

/* The management-button row can wrap to a second line depending on how
   many actions apply to this action's status (e.g. a published action
   also offers check-in). Reserving room for the worst case keeps the
   gap above this row consistent across every card in the grid. */
.oh-action-card__footer {
  min-height: 64px;
}

.oh-action-card__title {
  min-height: 3.5rem;
  font-size: 1.0625rem;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.oh-action-card__meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.8125rem;
  color: rgb(var(--v-theme-textSecondary));
}

.oh-action-card__meta-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
</style>
