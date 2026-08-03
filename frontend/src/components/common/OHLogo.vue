<script setup>
import BrandLogo from '@/components/common/BrandLogo.vue'

defineProps({
  variant: {
    type: String,
    default: 'horizontal'
  },
  size: {
    type: Number,
    default: 30
  }
})
</script>

<template>
  <RouterLink to="/" class="oh-logo text-decoration-none">
    <BrandLogo :variant="variant" :size="size" />
  </RouterLink>
</template>

<style scoped>
.oh-logo {
  color: inherit;
  display: inline-flex;
}
</style>
