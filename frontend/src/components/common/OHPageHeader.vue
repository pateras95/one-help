<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    default: ''
  }
})
</script>

<template>
  <header class="oh-page-header mb-8">
    <h1 class="oh-page-title font-weight-bold text-textPrimary">{{ title }}</h1>
    <p v-if="subtitle" class="text-body-1 text-textSecondary mt-2">{{ subtitle }}</p>
    <div v-if="$slots.actions" class="mt-4">
      <slot name="actions" />
    </div>
  </header>
</template>
