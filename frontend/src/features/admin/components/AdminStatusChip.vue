<script setup>
/**
 * Renders any admin status (account, organization, moderation, report)
 * as an icon + text chip — status is never communicated by color alone,
 * so every call site must pass both a translated `label` and an `icon`.
 */
defineProps({
  label: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    required: true
  },
  color: {
    type: String,
    default: undefined
  },
  size: {
    type: String,
    default: 'small'
  }
})
</script>

<template>
  <VChip :color="color" :size="size" variant="tonal" :prepend-icon="icon">
    {{ label }}
  </VChip>
</template>
