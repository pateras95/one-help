<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import OHButton from '@/components/common/OHButton.vue'

/**
 * The one shared confirmation dialog for `demoteOrganizerToVolunteer` —
 * used identically by an admin's "Remove organizer and organization"
 * action and by an organizer's own "Become a volunteer again" self-
 * service flow, so the destructive consequences are explained the same
 * way everywhere this operation can be triggered from. Deliberately not
 * `window.confirm()` — a real dialog with an explicit checkbox.
 */
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  organizationName: {
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

const confirmed = ref(false)

watch(
  () => props.modelValue,
  (open) => {
    if (open) confirmed.value = false
  }
)

function close() {
  emit('update:modelValue', false)
}

function confirm() {
  if (!confirmed.value) return
  emit('confirm')
}
</script>

<template>
  <VDialog :model-value="modelValue" max-width="520" @update:model-value="close">
    <VCard role="alertdialog" aria-labelledby="organizer-demotion-dialog-title">
      <VCardTitle id="organizer-demotion-dialog-title" class="text-error">
        {{ t('becomeOrganizer.demotion.dialogTitle') }}
      </VCardTitle>
      <VCardText>
        <p class="mb-3">{{ t('becomeOrganizer.demotion.dialogMessage', { name: organizationName }) }}</p>
        <p class="text-body-2 font-weight-bold mb-1">{{ t('becomeOrganizer.demotion.consequencesTitle') }}</p>
        <ul class="text-body-2 mb-4">
          <li>{{ t('becomeOrganizer.demotion.consequenceOrganization') }}</li>
          <li>{{ t('becomeOrganizer.demotion.consequenceActions') }}</li>
          <li>{{ t('becomeOrganizer.demotion.consequenceParticipations') }}</li>
          <li>{{ t('becomeOrganizer.demotion.consequenceAttendance') }}</li>
          <li>{{ t('becomeOrganizer.demotion.consequenceReports') }}</li>
        </ul>
        <VCheckbox
          v-model="confirmed"
          density="comfortable"
          color="error"
          :label="t('becomeOrganizer.demotion.confirmCheckboxLabel')"
        />
      </VCardText>
      <VCardActions>
        <VSpacer />
        <OHButton variant="text" :disabled="loading" @click="close">
          {{ t('becomeOrganizer.demotion.cancel') }}
        </OHButton>
        <OHButton color="error" :loading="loading" :disabled="loading || !confirmed" @click="confirm">
          {{ t('becomeOrganizer.demotion.confirmAction') }}
        </OHButton>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
