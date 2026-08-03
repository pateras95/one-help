<script setup>
/**
 * The one shared "stat card" used by both the organizer dashboard and
 * the admin dashboard — a squircle icon well + a large number + a
 * label. Replaces two previously-divergent treatments (plain text-only
 * cards on the organizer dashboard, icon+avatar cards on admin) with a
 * single component so both workspaces read as the same product.
 */
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
  <div class="oh-metric-card oh-card-interactive pa-4 h-100 d-flex align-center ga-3">
    <div class="oh-icon-well" :class="`bg-${color}`">
      <VIcon :icon="icon" color="white" aria-hidden="true" />
    </div>
    <div class="oh-metric-card__text">
      <p class="oh-metric-card__value font-weight-bold mb-0">{{ value }}</p>
      <p class="text-caption text-textSecondary mb-0">{{ label }}</p>
    </div>
  </div>
</template>

<style scoped>
.oh-metric-card {
  border-radius: var(--oh-radius-lg);
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgb(var(--v-theme-border));
}

.oh-metric-card__value {
  font-size: 1.75rem;
  line-height: 1.1;
}
</style>
