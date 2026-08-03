<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

/**
 * Generic confirmation dialog reused by every admin moderation action
 * (suspend/reactivate a user, approve/reject/suspend/restore an
 * organization or action, change a report's status) — one component
 * instead of five near-identical `VDialog`s.
 */
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    default: ''
  },
  confirmLabel: {
    type: String,
    required: true
  },
  confirmColor: {
    type: String,
    default: 'primary'
  },
  loading: {
    type: Boolean,
    default: false
  },
  // When set, shows a required free-text reason field (e.g. rejecting an
  // organization/action) and disables confirm until it's non-empty.
  reasonLabel: {
    type: String,
    default: ''
  },
  reasonRequired: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const { t } = useI18n()

const reason = ref('')

watch(
  () => props.modelValue,
  (open) => {
    if (open) reason.value = ''
  }
)

function close() {
  emit('update:modelValue', false)
}

function confirm() {
  emit('confirm', props.reasonLabel ? reason.value.trim() : undefined)
}
</script>

<template>
  <VDialog :model-value="modelValue" max-width="480" @update:model-value="close">
    <VCard>
      <VCardTitle>{{ title }}</VCardTitle>
      <VCardText>
        <div :class="confirmColor === 'error' ? 'oh-panel oh-panel--danger pa-4' : ''">
          <p class="mb-0">{{ message }}</p>
          <VTextarea
            v-if="reasonLabel"
            v-model="reason"
            class="mt-4"
            :label="reasonLabel"
            variant="outlined"
            rows="3"
            auto-grow
          />
        </div>
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn variant="text" :disabled="loading" @click="close">
          {{ t('admin.common.cancel') }}
        </VBtn>
        <VBtn
          :color="confirmColor"
          :loading="loading"
          :disabled="loading || (reasonRequired && !reason.trim())"
          @click="confirm"
        >
          {{ confirmLabel }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
