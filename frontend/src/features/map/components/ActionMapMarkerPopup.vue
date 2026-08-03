<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import OHCard from '@/components/common/OHCard.vue'
import OHButton from '@/components/common/OHButton.vue'
import SignalStatusBadge from '@/components/common/SignalStatusBadge.vue'
import { getActionCategory } from '@/constants/actionCategories'
import { actionDetailsPath } from '@/constants/routes'
import { hasValidCoordinates } from '../utils/mapCoordinates'
import { buildDirectionsUrl } from '../utils/externalDirections'

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

const directionsUrl = computed(() => {
  if (!props.action || !hasValidCoordinates(props.action)) return null
  return buildDirectionsUrl(props.action.latitude, props.action.longitude)
})
</script>

<template>
  <OHCard v-if="action" class="oh-action-card oh-map-popup-card">
    <span v-if="category" class="oh-action-card__rail" :class="`bg-${category.accent}`" aria-hidden="true" />

    <div class="oh-action-card__body pa-4">
      <div class="d-flex align-start justify-space-between ga-2 mb-2">
        <div class="d-flex align-center flex-wrap ga-2">
          <div v-if="category" class="oh-icon-well oh-action-card__category-well" :class="`bg-${category.accent}`">
            <VIcon :icon="category.icon" size="16" color="white" aria-hidden="true" />
          </div>
          <SignalStatusBadge size="small" :color="statusColor" :label="t(`actions.status.${action.status}`)" />
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

      <div class="d-flex flex-column ga-2">
        <OHButton color="primary" variant="tonal" size="large" block :to="actionDetailsPath(action.id)">
          {{ t('map.selected.viewDetails') }}
        </OHButton>
        <OHButton
          v-if="directionsUrl"
          variant="outlined"
          size="large"
          block
          prepend-icon="mdi-directions"
          :href="directionsUrl"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="t('map.selected.directionsAriaLabel', { title: action.title })"
        >
          {{ t('map.selected.directions') }}
        </OHButton>
      </div>
    </div>
  </OHCard>
</template>

<style scoped>
.oh-map-popup-card {
  position: relative;
  overflow: hidden;
  animation: oh-panel-enter var(--oh-transition-slow) both;
}

.oh-action-card__rail {
  position: absolute;
  inset: 0 auto 0 0;
  width: 5px;
  z-index: 1;
}

.oh-action-card__body {
  padding-inline-start: calc(var(--oh-space-md) + 4px);
}

.oh-action-card__category-well {
  width: 28px;
  height: 28px;
}

.oh-map-popup-card__description {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

@keyframes oh-panel-enter {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .oh-map-popup-card {
    animation: none;
  }
}
</style>
