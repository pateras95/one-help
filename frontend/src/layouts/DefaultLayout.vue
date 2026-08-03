<script setup>
import { useDisplay } from 'vuetify'
import AppNavigation from '@/components/layout/AppNavigation.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import AppBottomNavigation from '@/components/layout/AppBottomNavigation.vue'
import PageContainer from '@/components/layout/PageContainer.vue'

const { mobile } = useDisplay()
</script>

<template>
  <VApp>
    <AppNavigation />

    <VMain>
      <div class="oh-app-shell" :class="{ 'oh-mobile-nav-spacer': mobile }">
        <PageContainer class="oh-app-shell__content">
          <slot />
        </PageContainer>

        <AppFooter />
      </div>
    </VMain>

    <AppBottomNavigation v-if="mobile" />
  </VApp>
</template>

<style scoped>
/*
 * Sticky footer: VMain already stretches to fill the remaining viewport
 * height on short-content pages (Vuetify's own `flex: 1 0 auto` on
 * `.v-main` inside the app's `min-height: 100dvh` flex column) — this
 * shell just turns that into a flex column of its own so the route
 * content can grow to fill it, pushing the footer to the bottom instead
 * of leaving it stuck under a short page. On long pages the content
 * simply exceeds this height and the footer follows it down normally,
 * same as any other flex-column-with-a-growing-child layout.
 */
.oh-app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}
.oh-app-shell__content {
  flex: 1 0 auto;
}

/*
 * VMain already reserves space for the bottom navigation's declared
 * height automatically (Vuetify's layout system). This only adds the
 * extra safe-area inset the nav's own padding consumes beyond that,
 * so content and the footer are never hidden behind it.
 */
.oh-mobile-nav-spacer {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
