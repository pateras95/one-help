<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { getActionCategory } from '@/constants/actionCategories'
import { actionDetailsPath } from '@/constants/routes'
import OHCard from '@/components/common/OHCard.vue'
import OHButton from '@/components/common/OHButton.vue'
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
  const status = props.action.status === 'completed'
    ? 'completed'
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
  return 'success'
})

const urgencyColor = computed(() => {
  if (props.action.urgency === 'urgent') return 'error'
  if (props.action.urgency === 'high') return 'warning'
  return undefined
})
</script>

<template>
  <OHCard class="oh-action-card pa-5 h-100 d-flex flex-column">
    <div class="d-flex align-center justify-space-between mb-3 ga-2">
      <VChip
        v-if="category"
        size="small"
        :color="category.accent"
        variant="tonal"
        :prepend-icon="category.icon"
      >
        {{ t(category.labelKey) }}
      </VChip>

      <VChip
        v-if="urgencyColor"
        size="small"
        :color="urgencyColor"
        variant="flat"
      >
        {{ t(`actions.urgency.${action.urgency}`) }}
      </VChip>
    </div>

    <div v-if="isJoined" class="d-flex align-center ga-1 mb-2">
      <VIcon icon="mdi-check-circle" size="16" color="success" aria-hidden="true" />
      <span class="text-caption text-success">{{ t('participation.card.alreadyJoined') }}</span>
    </div>

    <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ action.title }}</h3>
    <p class="text-body-2 text-textSecondary oh-action-card__description mb-3">
      {{ action.description }}
    </p>

    <div class="d-flex flex-column ga-1 text-body-2 text-textSecondary mb-3">
      <div class="d-flex align-center ga-2">
        <VIcon icon="mdi-calendar-blank-outline" size="18" aria-hidden="true" />
        <span>{{ formattedDate }} · {{ action.startTime }}</span>
      </div>
      <div class="d-flex align-center ga-2">
        <VIcon icon="mdi-map-marker-outline" size="18" aria-hidden="true" />
        <span>{{ action.locationName }}, {{ action.municipality }}</span>
      </div>
      <div class="d-flex align-center ga-2">
        <VIcon icon="mdi-account-group-outline" size="18" aria-hidden="true" />
        <span>{{ t('actions.card.organizedBy', { organization: action.organization }) }}</span>
      </div>
    </div>

    <div class="d-flex align-center justify-space-between mb-4">
      <span class="text-caption text-textSecondary">
        {{ t('actions.card.participants', { registered: displayAction.registeredCount, capacity: displayAction.capacity }) }}
      </span>
      <VChip size="x-small" :color="statusColor" variant="tonal">
        {{ t(`actions.status.${displayAction.status}`) }}
      </VChip>
    </div>

    <OHButton
      class="mt-auto"
      color="primary"
      variant="tonal"
      block
      :to="actionDetailsPath(action.id)"
      :aria-label="t('actions.card.viewDetailsAriaLabel', { title: action.title })"
    >
      {{ t('actions.card.viewDetails') }}
    </OHButton>
  </OHCard>
</template>

<style scoped>
.oh-action-card__description {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
