<script setup>
defineProps({
  title: {
    type: String,
    default: ''
  }
})
</script>

<template>
  <section class="oh-section">
    <h2 v-if="title" class="text-h5 font-weight-bold mb-4">{{ title }}</h2>
    <slot />
  </section>
</template>

<style scoped>
.oh-section + .oh-section {
  margin-top: var(--oh-space-xl);
}
</style>
