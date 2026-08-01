<script>
export default {
  inheritAttrs: false
}
</script>

<script setup>
</script>

<template>
  <VBtn v-bind="$attrs">
    <slot />
  </VBtn>
</template>
