<script setup>
defineProps({
  title: {
    type: String,
    default: 'Δεν υπάρχουν δεδομένα'
  },
  message: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: 'mdi-inbox-outline'
  }
})
</script>

<template>
  <div class="d-flex flex-column align-center justify-center text-center pa-8">
    <VIcon :icon="icon" size="48" color="on-surface" class="mb-4" />
    <p class="text-h6">{{ title }}</p>
    <p v-if="message" class="text-body-2">{{ message }}</p>
    <slot />
  </div>
</template>
