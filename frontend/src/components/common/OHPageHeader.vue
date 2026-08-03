<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    default: ''
  },
  eyebrow: {
    type: String,
    default: ''
  }
})
</script>

<template>
  <header class="oh-page-header mb-8">
    <div class="oh-page-header__text">
      <span v-if="eyebrow" class="oh-eyebrow mb-2 d-block">{{ eyebrow }}</span>
      <h1 class="oh-page-title font-weight-bold text-textPrimary">{{ title }}</h1>
      <p v-if="subtitle" class="text-body-1 text-textSecondary mt-2 oh-measure">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="oh-page-header__actions mt-4">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.oh-page-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--oh-space-md);
  padding-bottom: var(--oh-space-lg);
  border-bottom: 1px solid rgb(var(--v-theme-border));
}

.oh-page-header__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--oh-space-sm);
}
</style>
