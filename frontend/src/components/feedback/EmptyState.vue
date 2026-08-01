<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  title: {
    type: String,
    default: ''
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

const { t } = useI18n()
const resolvedTitle = computed(() => props.title || t('common.feedback.emptyTitle'))
</script>

<template>
  <div class="d-flex flex-column align-center justify-center text-center pa-8">
    <VIcon :icon="icon" size="48" color="textSecondary" aria-hidden="true" class="mb-4" />
    <p class="text-h6">{{ resolvedTitle }}</p>
    <p v-if="message" class="text-body-2 text-textSecondary">{{ message }}</p>
    <slot />
  </div>
</template>
