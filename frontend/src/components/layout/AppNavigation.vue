<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
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

// Purely presentational scroll-elevation — the header gains a soft
// shadow once the page has scrolled, instead of a flat border that
// never changes. No navigation behavior is affected.
const isElevated = ref(false)
function handleScroll() {
  isElevated.value = window.scrollY > 4
}
onMounted(() => window.addEventListener('scroll', handleScroll, { passive: true }))
onUnmounted(() => window.removeEventListener('scroll', handleScroll))
</script>

<template>
  <VAppBar
    color="surface"
    elevation="0"
    density="comfortable"
    class="oh-app-bar"
    :class="{ 'oh-app-bar--elevated': isElevated }"
  >
    <div class="oh-container oh-app-bar__inner">
      <div class="oh-app-bar__brand">
        <OHLogo variant="horizontal" :size="30" />
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
          variant="text"
          class="oh-app-bar__nav-item"
          :class="{ 'oh-app-bar__nav-item--active': route.path === item.to }"
        >
          {{ t(item.labelKey) }}
        </VBtn>
      </nav>

      <div class="oh-app-bar__actions d-flex align-center ga-2">
        <template v-if="!mobile">
          <AccountMenu v-if="authStore.isAuthenticated" />
          <template v-else>
            <OHButton variant="text" :to="ROUTES.LOGIN">{{ t('navigation.login') }}</OHButton>
            <OHButton variant="tonal" color="primary" class="oh-app-bar__cta" :to="ROUTES.REGISTER">
              {{ t('navigation.register') }}
            </OHButton>
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

        <span class="oh-app-bar__divider" aria-hidden="true" />
        <OHLanguageSwitcher />
      </div>
    </div>
  </VAppBar>
</template>

<style scoped>
.oh-app-bar {
  border-bottom: 1px solid rgb(var(--v-theme-border));
  transition: box-shadow var(--oh-transition-base);
}

.oh-app-bar--elevated {
  box-shadow: var(--oh-shadow-sm) !important;
  border-bottom-color: transparent;
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

.oh-app-bar__divider {
  width: 1px;
  height: 24px;
  background: rgb(var(--v-theme-border));
  margin-inline: 2px;
}

.oh-app-bar__cta {
  box-shadow: none;
}

/*
 * Mirrors AppBottomNavigation's selected-item bar indicator (a small
 * brand-colored bar on the edge nearest the content) so desktop and
 * mobile navigation share one visual language instead of the desktop
 * version reading as a plain default Vuetify tonal-button state.
 */
.oh-app-bar__nav-item {
  position: relative;
  font-weight: 500;
  transition: color var(--oh-transition-fast);
}

.oh-app-bar__nav-item--active {
  color: rgb(var(--v-theme-primary));
  font-weight: 700;
}

.oh-app-bar__nav-item::after {
  content: '';
  position: absolute;
  bottom: 6px;
  left: 50%;
  transform: translateX(-50%) scaleX(0);
  width: 22px;
  height: 3px;
  border-radius: var(--oh-radius-sm);
  background: rgb(var(--v-theme-secondary));
  transition: transform var(--oh-transition-base);
}

.oh-app-bar__nav-item--active::after {
  transform: translateX(-50%) scaleX(1);
}

@media (prefers-reduced-motion: reduce) {
  .oh-app-bar__nav-item,
  .oh-app-bar__nav-item::after,
  .oh-app-bar {
    transition: none;
  }
}
</style>
