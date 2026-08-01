<script>
export default {
  inheritAttrs: false
}
</script>

<script setup>
</script>

<template>
  <VCard v-bind="$attrs">
    <slot />
  </VCard>
</template>
