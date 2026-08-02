<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import OHCard from '@/components/common/OHCard.vue'
import OHButton from '@/components/common/OHButton.vue'
import { getActionCategory } from '@/constants/actionCategories'
import { actionDetailsPath } from '@/constants/routes'

/**
 * The rich "selected action" panel shown alongside/below the map (not
 * inside Leaflet's own popup — see `ActionsMap.vue` for why). This is
 * the accessible surface: everything a sighted marker-click would show
 * is available here as plain text and a real link, for anyone using
 * the results list instead of the map.
 */
const props = defineProps({
  action: {
    type: Object,
    default: null
  },
  // { value, unit: 'm'|'km' } | null — only present once user location is known.
  distance: {
    type: Object,
    default: null
  }
})

defineEmits(['close'])

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

const statusColor = computed(() => {
  const status = props.action?.status
  if (status === 'open') return 'success'
  return 'textSecondary'
})

const distanceLabel = computed(() => {
  if (!props.distance) return ''
  return t(`map.distance.${props.distance.unit}`, { value: props.distance.value })
})
</script>

<template>
  <OHCard v-if="action" class="pa-4">
    <div class="d-flex align-start justify-space-between ga-2 mb-2">
      <div class="d-flex align-center flex-wrap ga-2">
        <VChip v-if="category" size="small" :color="category.accent" variant="tonal" :prepend-icon="category.icon">
          {{ t(category.labelKey) }}
        </VChip>
        <VChip size="small" :color="statusColor" variant="tonal">
          {{ t(`actions.status.${action.status}`) }}
        </VChip>
      </div>
      <VBtn
        icon="mdi-close"
        variant="text"
        size="small"
        :aria-label="t('map.selected.close')"
        @click="$emit('close')"
      />
    </div>

    <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ action.title }}</h3>
    <p class="text-body-2 text-textSecondary oh-map-popup-card__description mb-3">{{ action.description }}</p>

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
      <div v-if="distanceLabel" class="d-flex align-center ga-2">
        <VIcon icon="mdi-navigation-variant-outline" size="18" aria-hidden="true" />
        <span>{{ distanceLabel }}</span>
      </div>
    </div>

    <p class="text-caption text-textSecondary mb-3">
      {{ t('actions.card.participants', { registered: action.registeredCount, capacity: action.capacity }) }}
    </p>

    <OHButton color="primary" variant="tonal" block :to="actionDetailsPath(action.id)">
      {{ t('map.selected.viewDetails') }}
    </OHButton>
  </OHCard>
</template>

<style scoped>
.oh-map-popup-card__description {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
