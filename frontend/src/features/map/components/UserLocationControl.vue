<script setup>
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import OHButton from '@/components/common/OHButton.vue'
import { useUserLocation, GEOLOCATION_STATE } from '../composables/useUserLocation'

/**
 * "Near me" trigger: requests the browser's one-time location only when
 * clicked (never on mount) and surfaces every outcome (loading, denied,
 * unavailable, timeout, success) as translated text — never silently.
 */
const emit = defineEmits(['located', 'reset'])

const { t } = useI18n()
const { state, position, locate, reset } = useUserLocation()

function handleClick() {
  if (state.value === GEOLOCATION_STATE.SUCCESS) {
    reset()
    emit('reset')
    return
  }
  locate()
}

watch(position, (value) => {
  if (value) emit('located', value)
})

const label = computed(() => {
  if (state.value === GEOLOCATION_STATE.SUCCESS) return t('map.nearMe.reset')
  if (state.value === GEOLOCATION_STATE.LOADING) return t('map.nearMe.loading')
  return t('map.nearMe.action')
})

const feedbackKey = computed(() => {
  if (state.value === GEOLOCATION_STATE.DENIED) return 'map.nearMe.denied'
  if (state.value === GEOLOCATION_STATE.TIMEOUT) return 'map.nearMe.timeout'
  if (state.value === GEOLOCATION_STATE.UNAVAILABLE) return 'map.nearMe.unavailable'
  if (state.value === GEOLOCATION_STATE.SUCCESS) return 'map.nearMe.successNote'
  return ''
})
</script>

<template>
  <div>
    <OHButton
      variant="tonal"
      :color="state === 'success' ? undefined : 'primary'"
      prepend-icon="mdi-crosshairs-gps"
      :loading="state === 'loading'"
      :disabled="state === 'loading'"
      :aria-label="label"
      @click="handleClick"
    >
      {{ label }}
    </OHButton>
    <p
      v-if="feedbackKey"
      class="text-caption mt-1 mb-0"
      :class="state === 'success' ? 'text-textSecondary' : 'text-error'"
      role="status"
    >
      {{ t(feedbackKey) }}
    </p>
  </div>
</template>
