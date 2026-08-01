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
    <h2 v-if="title" class="oh-section-title font-weight-bold mb-4">{{ title }}</h2>
    <slot />
  </section>
</template>

<style scoped>
.oh-section + .oh-section {
  margin-top: var(--oh-space-xl);
}

@media (min-width: 960px) {
  .oh-section + .oh-section {
    margin-top: var(--oh-space-2xl);
  }
}
</style>
