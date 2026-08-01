<script setup>
defineProps({
  title: {
    type: String,
    default: 'Παρουσιάστηκε σφάλμα'
  },
  message: {
    type: String,
    default: 'Δοκιμάστε ξανά σε λίγο.'
  },
  retryLabel: {
    type: String,
    default: 'Επανάληψη'
  },
  showRetry: {
    type: Boolean,
    default: true
  }
})

defineEmits(['retry'])
</script>

<template>
  <div class="d-flex flex-column align-center justify-center text-center pa-8" role="alert">
    <VIcon icon="mdi-alert-circle-outline" size="48" color="error" class="mb-4" />
    <p class="text-h6">{{ title }}</p>
    <p class="text-body-2">{{ message }}</p>
    <VBtn
      v-if="showRetry"
      color="primary"
      class="mt-4"
      :aria-label="retryLabel"
      @click="$emit('retry')"
    >
      {{ retryLabel }}
    </VBtn>
  </div>
</template>
