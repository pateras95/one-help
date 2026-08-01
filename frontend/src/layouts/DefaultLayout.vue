<script setup>
import AppNavigation from '@/components/layout/AppNavigation.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import PageContainer from '@/components/layout/PageContainer.vue'
</script>

<template>
  <VApp>
    <AppNavigation />

    <VMain>
      <PageContainer>
        <slot />
      </PageContainer>
    </VMain>

    <AppFooter />
  </VApp>
</template>
