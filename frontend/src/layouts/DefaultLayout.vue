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
      <div :class="{ 'oh-mobile-nav-spacer': mobile }">
        <PageContainer>
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
 * VMain already reserves space for the bottom navigation's declared
 * height automatically (Vuetify's layout system). This only adds the
 * extra safe-area inset the nav's own padding consumes beyond that,
 * so content and the footer are never hidden behind it.
 */
.oh-mobile-nav-spacer {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
