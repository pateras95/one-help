<script setup>
import OHCard from '@/components/common/OHCard.vue'

defineProps({
  label: {
    type: String,
    required: true
  },
  value: {
    type: [Number, String],
    required: true
  },
  icon: {
    type: String,
    required: true
  },
  color: {
    type: String,
    default: 'primary'
  }
})
</script>

<template>
  <OHCard class="pa-4 d-flex align-center ga-3 h-100">
    <VAvatar :color="color" variant="tonal" size="44">
      <VIcon :icon="icon" aria-hidden="true" />
    </VAvatar>
    <div>
      <p class="text-h5 font-weight-bold mb-0">{{ value }}</p>
      <p class="text-caption text-textSecondary mb-0">{{ label }}</p>
    </div>
  </OHCard>
</template>
