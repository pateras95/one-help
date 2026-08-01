<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  label: {
    type: String,
    default: ''
  }
})

const { t } = useI18n()
const resolvedLabel = computed(() => props.label || t('common.feedback.loadingLabel'))
</script>

<template>
  <div class="d-flex flex-column align-center justify-center pa-8" role="status">
    <VProgressCircular color="primary" indeterminate size="48" />
    <p class="mt-4 text-body-2 text-textSecondary">{{ resolvedLabel }}</p>
  </div>
</template>
