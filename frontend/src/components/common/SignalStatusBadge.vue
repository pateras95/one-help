<script setup>
/**
 * A small dot-plus-label status indicator — the shared "Signal" status
 * language, visually distinct from a plain Vuetify tonal chip so
 * status/urgency reads consistently across public, organizer and admin
 * screens. Not a replacement for VChip everywhere (category badges
 * still use VChip's icon support) — specifically for status/urgency/
 * moderation states, where a colored dot is the fastest possible scan.
 */
defineProps({
  label: {
    type: String,
    required: true
  },
  color: {
    type: String,
    default: 'textSecondary'
  },
  // 'solid' for emphasis (emergency/urgent), 'soft' for routine states.
  emphasis: {
    type: String,
    default: 'soft',
    validator: (value) => ['soft', 'solid'].includes(value)
  },
  size: {
    type: String,
    default: 'default',
    validator: (value) => ['small', 'default'].includes(value)
  }
})
</script>

<template>
  <span
    class="oh-status-badge"
    :class="[
      `oh-status-badge--${emphasis}`,
      size === 'small' && 'oh-status-badge--small',
      emphasis === 'solid' ? `bg-${color}` : `text-${color}`
    ]"
  >
    <span
      class="oh-status-badge__dot"
      :class="emphasis === 'solid' ? 'bg-white' : `bg-${color}`"
      aria-hidden="true"
    />
    {{ label }}
  </span>
</template>

<style scoped>
.oh-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.3;
  background: rgba(27, 35, 51, 0.05);
  white-space: nowrap;
}

.oh-status-badge--small {
  padding: 2px 8px;
  font-size: 0.6875rem;
}

.oh-status-badge__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.oh-status-badge--solid {
  color: #fff;
}
</style>
