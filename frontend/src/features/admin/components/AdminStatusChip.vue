<script setup>
import SignalStatusBadge from '@/components/common/SignalStatusBadge.vue'

/**
 * Renders any admin status (account, organization, moderation, report)
 * via the shared Signal status badge (a color dot + translated label) —
 * status is never communicated by color alone, since the label text is
 * always present. `icon` is still accepted so every call site keeps
 * passing one (kept for backward compatibility / possible future use),
 * but the badge language itself uses a dot, not an icon.
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
  <SignalStatusBadge :label="label" :color="color" :size="size === 'small' ? 'small' : 'default'" />
</template>
