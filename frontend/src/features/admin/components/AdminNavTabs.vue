<script setup>
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ROUTES } from '@/constants/routes'

/**
 * Persistent sub-navigation shown at the top of every `/admin/*` view —
 * six sections is too many to expect someone to reach every time via
 * the bottom nav / account menu, so the workspace gets its own local
 * nav, same idea as a real admin dashboard's sidebar/tab bar.
 */
const route = useRoute()
const { t } = useI18n()

const items = [
  { to: ROUTES.ADMIN, labelKey: 'admin.navigation.dashboard', icon: 'mdi-view-dashboard-outline' },
  { to: ROUTES.ADMIN_USERS, labelKey: 'admin.navigation.users', icon: 'mdi-account-group-outline' },
  { to: ROUTES.ADMIN_ORGANIZATIONS, labelKey: 'admin.navigation.organizations', icon: 'mdi-domain' },
  { to: ROUTES.ADMIN_ACTIONS, labelKey: 'admin.navigation.actions', icon: 'mdi-clipboard-check-outline' },
  { to: ROUTES.ADMIN_REPORTS, labelKey: 'admin.navigation.reports', icon: 'mdi-flag-outline' },
  { to: ROUTES.ADMIN_ACTIVITY, labelKey: 'admin.navigation.activity', icon: 'mdi-history' }
]
</script>

<template>
  <nav :aria-label="t('admin.navigation.landmark')" class="oh-admin-nav-tabs mb-6">
    <VTabs :model-value="route.path" show-arrows density="comfortable" color="primary">
      <VTab v-for="item in items" :key="item.to" :value="item.to" :to="item.to" :prepend-icon="item.icon">
        {{ t(item.labelKey) }}
      </VTab>
    </VTabs>
  </nav>
</template>

<style scoped>
.oh-admin-nav-tabs {
  border-bottom: 1px solid rgb(var(--v-theme-border));
}
</style>
