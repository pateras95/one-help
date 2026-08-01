<script setup>
defineProps({
  label: {
    type: String,
    default: 'Φόρτωση...'
  }
})
</script>

<template>
  <div class="d-flex flex-column align-center justify-center pa-8" role="status">
    <VProgressCircular color="primary" indeterminate size="48" />
    <p class="mt-4 text-body-2">{{ label }}</p>
  </div>
</template>
