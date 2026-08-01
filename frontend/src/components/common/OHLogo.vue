<script setup>
import { branding } from '@/config/branding'

defineProps({
  textClass: {
    type: String,
    default: 'text-h6'
  }
})
</script>

<template>
  <RouterLink to="/" class="oh-logo d-flex align-center ga-2 text-decoration-none">
    <VIcon icon="mdi-hand-heart" />
    <span class="font-weight-bold" :class="textClass">{{ branding.appName }}</span>
  </RouterLink>
</template>

<style scoped>
.oh-logo {
  color: inherit;
}
</style>
