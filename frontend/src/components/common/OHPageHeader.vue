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
  <header class="oh-page-header mb-6">
    <h1 class="text-h4 font-weight-bold">{{ title }}</h1>
    <p v-if="subtitle" class="text-body-1 mt-1">{{ subtitle }}</p>
    <div v-if="$slots.actions" class="mt-4">
      <slot name="actions" />
    </div>
  </header>
</template>
