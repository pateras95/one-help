<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { MOBILE_NAVIGATION_ITEMS, AUTHENTICATED_MOBILE_NAVIGATION } from '@/constants/navigation'
import { useAuthStore } from '@/features/auth/stores/auth.store'

const route = useRoute()
const { t } = useI18n()
const authStore = useAuthStore()
const activeValue = computed(() => route.path)

/**
 * Logged-out users keep the standard four-item nav; authenticated users
 * get a role-specific set (still four items — see
 * `AUTHENTICATED_MOBILE_NAVIGATION`). Falls back to the logged-out set if
 * the current role has no defined set (shouldn't happen with today's
 * roles, but keeps this resilient rather than rendering nothing).
 */
const items = computed(() => {
  if (!authStore.isAuthenticated) return MOBILE_NAVIGATION_ITEMS
  return AUTHENTICATED_MOBILE_NAVIGATION[authStore.currentUser.role] ?? MOBILE_NAVIGATION_ITEMS
})
</script>

<template>
  <VBottomNavigation
    :model-value="activeValue"
    tag="nav"
    :aria-label="t('navigation.mobileLandmark')"
    color="secondary"
    grow
    elevation="0"
    class="oh-bottom-nav"
  >
    <VBtn
      v-for="item in items"
      :key="item.to"
      :value="item.to"
      :to="item.to"
    >
      <VIcon :icon="item.icon" aria-hidden="true" />
      <span>{{ t(item.mobileLabelKey ?? item.labelKey) }}</span>
    </VBtn>
  </VBottomNavigation>
</template>

<style scoped>
.oh-bottom-nav {
  padding-bottom: env(safe-area-inset-bottom);
  border-top: 1px solid rgb(var(--v-theme-border));
  box-shadow: var(--oh-shadow-sm);
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
  width: 28px;
  height: 3px;
  border-radius: 0 0 var(--oh-radius-sm) var(--oh-radius-sm);
  background: rgb(var(--v-theme-secondary));
}

@media (prefers-reduced-motion: reduce) {
  .oh-bottom-nav :deep(.v-btn) {
    transition: none;
  }
}
</style>
