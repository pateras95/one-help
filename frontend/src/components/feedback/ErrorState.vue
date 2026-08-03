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
  },
  // 'recoverable' (default): a transient failure, retry is the primary
  // action. 'destructive': something failed in a way that isn't just
  // "try again" (e.g. a blocked/irreversible operation) — rendered in
  // a bordered danger panel instead of a plain centered message.
  tone: {
    type: String,
    default: 'recoverable',
    validator: (value) => ['recoverable', 'destructive'].includes(value)
  }
})

defineEmits(['retry'])

const { t } = useI18n()
const resolvedTitle = computed(() => props.title || t('common.feedback.errorTitle'))
const resolvedMessage = computed(() => props.message || t('common.feedback.errorMessage'))
const resolvedRetryLabel = computed(() => props.retryLabel || t('common.feedback.retry'))
</script>

<template>
  <div
    class="oh-error-state d-flex flex-column align-center justify-center text-center pa-8"
    :class="{ 'oh-panel oh-panel--danger': tone === 'destructive' }"
    role="alert"
  >
    <div class="oh-error-state__icon-wrap mb-4" :class="{ 'oh-error-state__icon-wrap--destructive': tone === 'destructive' }">
      <VIcon icon="mdi-alert-circle-outline" size="40" color="error" aria-hidden="true" />
    </div>
    <p class="text-h6 font-weight-bold">{{ resolvedTitle }}</p>
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

<style scoped>
.oh-error-state__icon-wrap {
  width: 88px;
  height: 88px;
  border-radius: var(--oh-radius-squircle);
  background: rgba(200, 64, 46, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}

.oh-error-state__icon-wrap--destructive {
  background: rgba(200, 64, 46, 0.14);
}
</style>
