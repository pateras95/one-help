<script setup>
import { useDisplay } from 'vuetify'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { DESKTOP_NAVIGATION_ITEMS } from '@/constants/navigation'
import { ROUTES } from '@/constants/routes'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import OHLogo from '@/components/common/OHLogo.vue'
import OHLanguageSwitcher from '@/components/common/OHLanguageSwitcher.vue'
import OHButton from '@/components/common/OHButton.vue'
import AccountMenu from '@/features/auth/components/AccountMenu.vue'

const { mobile } = useDisplay()
const { t } = useI18n()
const route = useRoute()
const authStore = useAuthStore()
</script>

<template>
  <VAppBar color="surface" elevation="0" density="comfortable" class="oh-app-bar">
    <div class="oh-container oh-app-bar__inner">
      <div class="oh-app-bar__brand">
        <OHLogo />
      </div>

      <nav
        v-if="!mobile"
        :aria-label="t('navigation.desktopLandmark')"
        class="oh-app-bar__nav d-flex ga-1"
      >
        <VBtn
          v-for="item in DESKTOP_NAVIGATION_ITEMS"
          :key="item.to"
          :to="item.to"
          :variant="route.path === item.to ? 'tonal' : 'text'"
          :color="route.path === item.to ? 'primary' : undefined"
        >
          {{ t(item.labelKey) }}
        </VBtn>
      </nav>

      <div class="oh-app-bar__actions d-flex align-center ga-2">
        <template v-if="!mobile">
          <AccountMenu v-if="authStore.isAuthenticated" />
          <template v-else>
            <OHButton variant="text" :to="ROUTES.LOGIN">{{ t('navigation.login') }}</OHButton>
            <OHButton variant="tonal" color="primary" :to="ROUTES.REGISTER">{{ t('navigation.register') }}</OHButton>
          </template>
        </template>

        <AccountMenu v-else-if="authStore.isAuthenticated" compact />
        <VBtn
          v-else
          icon="mdi-login"
          variant="text"
          size="small"
          :to="ROUTES.LOGIN"
          :aria-label="t('navigation.login')"
        />

        <OHLanguageSwitcher />
      </div>
    </div>
  </VAppBar>
</template>

<style scoped>
.oh-app-bar {
  border-bottom: 1px solid rgb(var(--v-theme-border));
}

/*
 * Vuetify's own toolbar content padding is replaced by `.oh-container`
 * (imported via the shared class above) so the logo/nav/actions align to
 * the exact same column as the rest of the page, instead of Vuetify's
 * smaller built-in bar inset.
 */
.oh-app-bar :deep(.v-toolbar__content) {
  padding-inline: 0;
}

.oh-app-bar__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  gap: var(--oh-space-md);
}

.oh-app-bar__brand,
.oh-app-bar__actions {
  flex: 0 0 auto;
}

.oh-app-bar__nav {
  flex: 1 1 auto;
  justify-content: center;
}
</style>
