<script setup>
import { useDisplay } from 'vuetify'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { DESKTOP_NAVIGATION_ITEMS } from '@/constants/navigation'
import OHLogo from '@/components/common/OHLogo.vue'
import OHLanguageSwitcher from '@/components/common/OHLanguageSwitcher.vue'

const { mobile } = useDisplay()
const { t } = useI18n()
const route = useRoute()
</script>

<template>
  <VAppBar color="surface" elevation="0" density="comfortable" class="oh-app-bar">
    <VAppBarTitle>
      <OHLogo />
    </VAppBarTitle>

    <template #append>
      <nav v-if="!mobile" :aria-label="t('navigation.desktopLandmark')" class="d-flex ga-1 mr-2">
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

      <OHLanguageSwitcher />
    </template>
  </VAppBar>
</template>

<style scoped>
.oh-app-bar {
  border-bottom: 1px solid rgb(var(--v-theme-border));
}
</style>
