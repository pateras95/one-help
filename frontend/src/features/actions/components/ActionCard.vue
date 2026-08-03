<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { getActionCategory } from '@/constants/actionCategories'
import { actionDetailsPath } from '@/constants/routes'
import OHCard from '@/components/common/OHCard.vue'
import OHButton from '@/components/common/OHButton.vue'
import SignalStatusBadge from '@/components/common/SignalStatusBadge.vue'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { useParticipationStore } from '@/features/participation/stores/participation.store'
import { withOverlaidCount } from '@/features/participation/utils/participationCount'
import { ROLES } from '@/constants/roles'

const props = defineProps({
  action: {
    type: Object,
    required: true
  }
})

const { t, locale } = useI18n()
const authStore = useAuthStore()
const participationStore = useParticipationStore()

const category = computed(() => getActionCategory(props.action.categoryId))

// Overlays the local confirmed-participation count on the base mock
// figure, and re-derives 'full' the same way ActionDetailsView does, so
// the list and details page can never disagree on a count/status.
const displayAction = computed(() => {
  void participationStore.countVersion
  const overlaid = withOverlaidCount(props.action)
  const status = props.action.status === 'completed' || props.action.status === 'closed'
    ? props.action.status
    : overlaid.registeredCount >= overlaid.capacity ? 'full' : 'open'
  return { ...overlaid, status }
})

const isJoined = computed(
  () => authStore.hasRole(ROLES.VOLUNTEER) && participationStore.isParticipating(props.action.id)
)

const formattedDate = computed(() => {
  const formatter = new Intl.DateTimeFormat(locale.value === 'en' ? 'en-GB' : 'el-GR', {
    day: 'numeric',
    month: 'short'
  })
  return formatter.format(new Date(props.action.date))
})

const statusColor = computed(() => {
  if (displayAction.value.status === 'full') return 'textSecondary'
  if (displayAction.value.status === 'completed') return 'textSecondary'
  if (displayAction.value.status === 'closed') return 'textSecondary'
  return 'success'
})

// Emergency-category and "urgent"-priority actions get a structurally
// different card (a bolder rail + a faint tinted surface), not just a
// differently-colored chip — both conditions share the one reserved
// emergency/error hue, so they read as one consistent "this is urgent"
// signal rather than two unrelated colors.
const isEmphasized = computed(
  () => props.action.urgency === 'urgent' || props.action.categoryId === 'emergency'
)

const capacityRatio = computed(() => {
  if (!displayAction.value.capacity) return 0
  return Math.min(100, Math.round((displayAction.value.registeredCount / displayAction.value.capacity) * 100))
})
</script>

<template>
  <OHCard
    class="oh-action-card oh-card-interactive h-100 d-flex flex-column"
    :class="{ 'oh-action-card--emphasized': isEmphasized }"
  >
    <span class="oh-action-card__rail" :class="`bg-${category?.accent ?? 'primary'}`" aria-hidden="true" />

    <div class="oh-action-card__body pa-5 d-flex flex-column flex-grow-1">
      <div class="oh-action-card__header d-flex align-center justify-space-between mb-3 ga-2">
        <div class="oh-action-card__category d-flex align-center ga-2">
          <div v-if="category" class="oh-icon-well oh-icon-well--sm" :class="`bg-${category.accent}`">
            <VIcon :icon="category.icon" size="16" color="white" aria-hidden="true" />
          </div>
          <span class="text-caption font-weight-bold oh-action-card__category-label">
            {{ category ? t(category.labelKey) : '' }}
          </span>
        </div>
        <SignalStatusBadge
          v-if="action.urgency !== 'normal'"
          emphasis="solid"
          :color="action.urgency === 'urgent' ? 'error' : 'warning'"
          size="small"
          class="oh-action-card__header-badge"
          :label="t(`actions.urgency.${action.urgency}`)"
        />
      </div>

      <div class="oh-action-card__joined mb-2">
        <div v-if="isJoined" class="d-flex align-center ga-1">
          <VIcon icon="mdi-check-circle" size="16" color="success" aria-hidden="true" />
          <span class="text-caption text-success font-weight-bold">{{ t('participation.card.alreadyJoined') }}</span>
        </div>
      </div>

      <h3 class="oh-action-card__title font-weight-bold mb-1">{{ action.title }}</h3>
      <p class="text-body-2 text-textSecondary oh-action-card__description mb-3">
        {{ action.description }}
      </p>

      <div class="oh-action-card__meta mb-3">
        <div class="oh-action-card__meta-cell">
          <VIcon icon="mdi-calendar-blank-outline" size="16" aria-hidden="true" />
          <span>{{ formattedDate }} · {{ action.startTime }}</span>
        </div>
        <div class="oh-action-card__meta-cell">
          <VIcon icon="mdi-map-marker-outline" size="16" aria-hidden="true" />
          <span class="oh-action-card__meta-truncate">{{ action.locationName }}</span>
        </div>
        <div class="oh-action-card__meta-cell oh-action-card__meta-cell--wide">
          <VIcon icon="mdi-account-group-outline" size="16" aria-hidden="true" />
          <span class="oh-action-card__meta-truncate">{{ t('actions.card.organizedBy', { organization: action.organization }) }}</span>
        </div>
      </div>

      <div class="oh-action-card__capacity mb-4">
        <div class="d-flex align-center justify-space-between ga-2 mb-1">
          <span class="text-caption text-textSecondary oh-action-card__capacity-label">
            {{ t('actions.card.participants', { registered: displayAction.registeredCount, capacity: displayAction.capacity }) }}
          </span>
          <SignalStatusBadge
            size="small"
            :color="statusColor"
            class="oh-action-card__header-badge"
            :label="t(`actions.status.${displayAction.status}`)"
          />
        </div>
        <div class="oh-action-card__capacity-track">
          <div
            class="oh-action-card__capacity-fill"
            :class="`bg-${statusColor}`"
            :style="{ width: `${capacityRatio}%` }"
          />
        </div>
      </div>

      <OHButton
        class="mt-auto"
        color="primary"
        variant="tonal"
        size="large"
        block
        :to="actionDetailsPath(action.id)"
        :aria-label="t('actions.card.viewDetailsAriaLabel', { title: action.title })"
      >
        {{ t('actions.card.viewDetails') }}
      </OHButton>
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

.oh-action-card--emphasized .oh-action-card__rail {
  width: 8px;
}

.oh-action-card--emphasized {
  background: rgba(var(--v-theme-error), 0.035);
}

.oh-action-card__body {
  padding-inline-start: calc(var(--oh-space-lg) + 4px);
}

.oh-action-card__header {
  flex-wrap: nowrap;
}

.oh-action-card__category {
  min-width: 0;
  flex: 1 1 auto;
}

.oh-action-card__category-label {
  color: rgb(var(--v-theme-textSecondary));
  letter-spacing: 0.01em;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.oh-action-card__header-badge {
  flex-shrink: 0;
}

.oh-action-card__capacity-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.oh-action-card__joined {
  min-height: 20px;
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

.oh-action-card__description {
  min-height: 2.5rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
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

.oh-action-card__capacity-track {
  height: 5px;
  border-radius: 999px;
  background: rgb(var(--v-theme-border));
  overflow: hidden;
}

.oh-action-card__capacity-fill {
  height: 100%;
  border-radius: 999px;
  transition: width var(--oh-transition-slow);
}

@media (prefers-reduced-motion: reduce) {
  .oh-action-card__capacity-fill {
    transition: none;
  }
}
</style>
