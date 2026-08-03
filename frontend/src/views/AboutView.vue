<script setup>
import { useI18n } from 'vue-i18n'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import OHSection from '@/components/common/OHSection.vue'
import OHCard from '@/components/common/OHCard.vue'
import OHLogo from '@/components/common/OHLogo.vue'

const { t } = useI18n()

const pillars = [
  { key: 'community', icon: 'mdi-account-group-outline' },
  { key: 'trust', icon: 'mdi-shield-check-outline' },
  { key: 'impact', icon: 'mdi-hand-heart-outline' }
]
</script>

<template>
  <DefaultLayout>
    <header class="oh-about-hero text-center mb-8">
      <OHLogo variant="primary" :size="56" class="mb-4" />
      <h1 class="oh-page-title font-weight-bold text-textPrimary">{{ t('navigation.about') }}</h1>
      <p class="text-body-1 text-textSecondary mt-2 oh-about-hero__subtitle">{{ t('pages.about.subtitle') }}</p>
    </header>

    <OHSection>
      <p class="text-body-1 text-textSecondary">
        {{ t('pages.about.body') }}
      </p>
    </OHSection>

    <OHSection variant="tinted">
      <div class="oh-about-pillars">
        <OHCard v-for="pillar in pillars" :key="pillar.key" class="pa-5 oh-about-pillars__card">
          <div class="oh-icon-chip bg-primary mb-3">
            <VIcon :icon="pillar.icon" size="24" color="white" aria-hidden="true" />
          </div>
          <h2 class="text-subtitle-1 font-weight-bold mb-1">{{ t(`pages.about.pillars.${pillar.key}.title`) }}</h2>
          <p class="text-body-2 text-textSecondary mb-0">{{ t(`pages.about.pillars.${pillar.key}.description`) }}</p>
        </OHCard>
      </div>
    </OHSection>
  </DefaultLayout>
</template>

<style scoped>
.oh-about-hero__subtitle {
  max-width: 480px;
  margin-inline: auto;
}

.oh-icon-chip {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.oh-about-pillars {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--oh-space-md);
}
</style>
