<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  // One of 'publish' | 'close' | 'cancel' | 'republish' — picks which
  // `organizer.transitions.*` copy set to show.
  transition: {
    type: String,
    default: null
  },
  actionTitle: {
    type: String,
    default: ''
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const { t } = useI18n()

const confirmColor = computed(() => (props.transition === 'cancel' ? 'error' : 'primary'))

function close() {
  emit('update:modelValue', false)
}
</script>

<template>
  <VDialog :model-value="modelValue" max-width="480" @update:model-value="close">
    <VCard v-if="transition">
      <VCardTitle>{{ t(`organizer.transitions.${transition}DialogTitle`) }}</VCardTitle>
      <VCardText>
        <p class="mb-0">{{ t(`organizer.transitions.${transition}DialogMessage`, { title: actionTitle }) }}</p>
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn variant="text" :disabled="loading" @click="close">
          {{ t('organizer.transitions.dialogCancel') }}
        </VBtn>
        <VBtn
          :color="confirmColor"
          :loading="loading"
          :disabled="loading"
          @click="$emit('confirm')"
        >
          {{ t(`organizer.transitions.${transition}Confirm`) }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
