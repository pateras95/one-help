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
  retryLabel: {
    type: String,
    default: ''
  },
  showRetry: {
    type: Boolean,
    default: true
  }
})

defineEmits(['retry'])

const { t } = useI18n()
const resolvedTitle = computed(() => props.title || t('common.feedback.errorTitle'))
const resolvedMessage = computed(() => props.message || t('common.feedback.errorMessage'))
const resolvedRetryLabel = computed(() => props.retryLabel || t('common.feedback.retry'))
</script>

<template>
  <div class="d-flex flex-column align-center justify-center text-center pa-8" role="alert">
    <VIcon icon="mdi-alert-circle-outline" size="48" color="error" class="mb-4" />
    <p class="text-h6">{{ resolvedTitle }}</p>
    <p class="text-body-2 text-textSecondary">{{ resolvedMessage }}</p>
    <VBtn
      v-if="showRetry"
      color="primary"
      class="mt-4"
      :aria-label="resolvedRetryLabel"
      @click="$emit('retry')"
    >
      {{ resolvedRetryLabel }}
    </VBtn>
  </div>
</template>
