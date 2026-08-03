<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import BrandLogo from '@/components/common/BrandLogo.vue'

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
    <div class="oh-loading-state__spinner">
      <VProgressCircular color="primary" indeterminate size="56" width="3" />
      <BrandLogo variant="icon" :size="22" class="oh-loading-state__mark" />
    </div>
    <p class="mt-4 text-body-2 text-textSecondary">{{ resolvedLabel }}</p>
  </div>
</template>

<style scoped>
.oh-loading-state__spinner {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.oh-loading-state__mark {
  position: absolute;
  animation: oh-loading-pulse 1.8s ease-in-out infinite;
}

@keyframes oh-loading-pulse {
  0%, 100% { opacity: 0.55; transform: scale(0.9); }
  50% { opacity: 1; transform: scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .oh-loading-state__mark {
    animation: none;
  }
}
</style>
