<script setup>
import { useI18n } from 'vue-i18n'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import OHSection from '@/components/common/OHSection.vue'
import OHCard from '@/components/common/OHCard.vue'
import OHButton from '@/components/common/OHButton.vue'
import { ROUTES } from '@/constants/routes'

const { t } = useI18n()

const categories = [
  { key: 'health', icon: 'mdi-heart-pulse' },
  { key: 'environment', icon: 'mdi-leaf' },
  { key: 'social', icon: 'mdi-hand-heart' },
  { key: 'animals', icon: 'mdi-paw' },
  { key: 'emergency', icon: 'mdi-alert-decagram-outline' }
]

const steps = [
  { key: 'step1', icon: 'mdi-magnify' },
  { key: 'step2', icon: 'mdi-account-check-outline' },
  { key: 'step3', icon: 'mdi-hand-heart-outline' }
]
</script>

<template>
  <DefaultLayout>
    <section class="oh-hero">
      <VRow align="center">
        <VCol cols="12" md="6" class="text-center text-md-left">
          <h1 class="oh-display font-weight-bold text-textPrimary">
            {{ t('home.hero.headline') }}
          </h1>

          <p class="text-body-1 text-textSecondary mt-4 oh-hero-lead">
            {{ t('home.hero.lead') }}
          </p>

          <div class="d-flex flex-column flex-sm-row ga-3 mt-6 justify-center justify-md-start">
            <OHButton
              color="primary"
              size="large"
              :to="ROUTES.ACTIONS"
              :aria-label="t('home.hero.primaryCtaAriaLabel')"
            >
              {{ t('home.hero.primaryCta') }}
            </OHButton>
            <OHButton
              variant="outlined"
              size="large"
              :to="ROUTES.ABOUT"
              :aria-label="t('home.hero.secondaryCtaAriaLabel')"
            >
              {{ t('home.hero.secondaryCta') }}
            </OHButton>
          </div>
        </VCol>

        <VCol cols="12" md="6">
          <div class="oh-hero-illustration" aria-hidden="true">
            <div class="oh-hero-illustration__main">
              <VIcon icon="mdi-hand-heart" size="64" color="primary" />
            </div>
            <div class="oh-hero-illustration__accent oh-hero-illustration__accent--a bg-success">
              <VIcon icon="mdi-leaf" size="24" color="white" />
            </div>
            <div class="oh-hero-illustration__accent oh-hero-illustration__accent--b bg-secondary">
              <VIcon icon="mdi-heart-pulse" size="24" color="white" />
            </div>
            <div class="oh-hero-illustration__accent oh-hero-illustration__accent--c bg-primary">
              <VIcon icon="mdi-paw" size="24" color="white" />
            </div>
          </div>
        </VCol>
      </VRow>
    </section>

    <OHSection :title="t('home.categories.title')">
      <VRow>
        <VCol
          v-for="category in categories"
          :key="category.key"
          cols="6"
          sm="4"
          md="2"
        >
          <OHCard color="surfaceVariant" class="pa-4 h-100 oh-category-card">
            <div class="oh-icon-chip bg-primary mb-3">
              <VIcon :icon="category.icon" size="24" color="white" aria-hidden="true" />
            </div>
            <p class="text-body-2 font-weight-bold mb-1">
              {{ t(`home.categories.${category.key}.label`) }}
            </p>
            <p class="text-caption text-textSecondary mb-0">
              {{ t(`home.categories.${category.key}.description`) }}
            </p>
          </OHCard>
        </VCol>
      </VRow>
    </OHSection>

    <OHSection :title="t('home.howItWorks.title')">
      <VRow>
        <VCol
          v-for="(step, index) in steps"
          :key="step.key"
          cols="12"
          sm="4"
          class="text-center"
        >
          <div class="oh-icon-chip oh-icon-chip--lg bg-primary mx-auto mb-3">
            <VIcon :icon="step.icon" size="32" color="white" aria-hidden="true" />
          </div>
          <h3 class="text-subtitle-1 font-weight-bold">
            {{ index + 1 }}. {{ t(`home.howItWorks.${step.key}`) }}
          </h3>
        </VCol>
      </VRow>
    </OHSection>

    <OHSection :title="t('home.cta.title')">
      <OHCard color="primary" variant="flat" :border="false" class="pa-6 pa-md-8 text-center">
        <p class="text-body-1 text-white oh-hero-lead mx-auto">
          {{ t('home.cta.message') }}
        </p>
        <OHButton
          color="white"
          variant="flat"
          size="large"
          class="mt-4"
          :to="ROUTES.ACTIONS"
          :aria-label="t('home.hero.primaryCtaAriaLabel')"
        >
          {{ t('home.cta.button') }}
        </OHButton>
      </OHCard>
    </OHSection>
  </DefaultLayout>
</template>

<style scoped>
.oh-hero-lead {
  max-width: 560px;
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

.oh-icon-chip--lg {
  width: 64px;
  height: 64px;
}

.oh-category-card {
  transition: transform 0.15s ease;
}

.oh-hero-illustration {
  position: relative;
  aspect-ratio: 1 / 1;
  max-width: 360px;
  margin-inline: auto;
  border-radius: var(--oh-radius-lg);
  background: rgb(var(--v-theme-surfaceVariant));
  display: flex;
  align-items: center;
  justify-content: center;
}

.oh-hero-illustration__main {
  width: 128px;
  height: 128px;
  border-radius: 50%;
  background: rgb(var(--v-theme-surface));
  display: flex;
  align-items: center;
  justify-content: center;
}

.oh-hero-illustration__accent {
  position: absolute;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.oh-hero-illustration__accent--a {
  top: 12%;
  right: 12%;
}

.oh-hero-illustration__accent--b {
  bottom: 18%;
  left: 10%;
}

.oh-hero-illustration__accent--c {
  bottom: 8%;
  right: 22%;
}

@media (prefers-reduced-motion: reduce) {
  .oh-category-card {
    transition: none;
  }
}
</style>
