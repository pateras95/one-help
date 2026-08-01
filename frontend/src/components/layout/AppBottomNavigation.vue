<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { MOBILE_NAVIGATION_ITEMS } from '@/constants/navigation'

const route = useRoute()
const { t } = useI18n()
const activeValue = computed(() => route.path)
</script>

<template>
  <VBottomNavigation
    :model-value="activeValue"
    tag="nav"
    :aria-label="t('navigation.mobileLandmark')"
    color="primary"
    grow
    elevation="0"
    class="oh-bottom-nav"
  >
    <VBtn
      v-for="item in MOBILE_NAVIGATION_ITEMS"
      :key="item.to"
      :value="item.to"
      :to="item.to"
    >
      <VIcon :icon="item.icon" aria-hidden="true" />
      <span>{{ t(item.labelKey) }}</span>
    </VBtn>
  </VBottomNavigation>
</template>

<style scoped>
.oh-bottom-nav {
  padding-bottom: env(safe-area-inset-bottom);
  border-top: 1px solid rgb(var(--v-theme-border));
}

.oh-bottom-nav :deep(.v-btn--selected) {
  font-weight: 700;
  position: relative;
}

.oh-bottom-nav :deep(.v-btn--selected)::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 3px;
  border-radius: 0 0 var(--oh-radius-sm) var(--oh-radius-sm);
  background: rgb(var(--v-theme-primary));
}

@media (prefers-reduced-motion: reduce) {
  .oh-bottom-nav :deep(.v-btn) {
    transition: none;
  }
}
</style>
