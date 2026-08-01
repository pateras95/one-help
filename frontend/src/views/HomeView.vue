<script setup>
import { useI18n } from 'vue-i18n'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import OHSection from '@/components/common/OHSection.vue'
import OHCard from '@/components/common/OHCard.vue'
import OHButton from '@/components/common/OHButton.vue'
import { ROUTES } from '@/constants/routes'
import { ACTION_CATEGORIES } from '@/constants/actionCategories'

const { t } = useI18n()

const steps = [
  { key: 'step1', icon: 'mdi-magnify' },
  { key: 'step2', icon: 'mdi-account-check-outline' },
  { key: 'step3', icon: 'mdi-hand-heart-outline' }
]

function categoryTarget(categoryId) {
  return { path: ROUTES.ACTIONS, query: { category: categoryId } }
}
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

    <OHSection
      full-bleed
      background="surfaceVariant"
      :title="t('home.categories.title')"
      :subtitle="t('home.categories.subtitle')"
    >
      <div class="oh-categories" role="list">
        <RouterLink
          v-for="category in ACTION_CATEGORIES"
          :key="category.id"
          :to="categoryTarget(category.id)"
          class="oh-category-card"
          role="listitem"
          :aria-label="t('home.categories.viewActionsAriaLabel', { category: t(category.labelKey) })"
        >
          <OHCard class="oh-category-card__inner pa-5 h-100">
            <div class="oh-icon-chip oh-icon-chip--lg" :class="`bg-${category.accent}`">
              <VIcon :icon="category.icon" size="32" color="white" aria-hidden="true" />
            </div>
            <p class="oh-category-card__label font-weight-bold mt-4 mb-1">
              {{ t(category.labelKey) }}
            </p>
            <p class="text-body-2 text-textSecondary mb-0">
              {{ t(category.descriptionKey) }}
            </p>
          </OHCard>
        </RouterLink>
      </div>
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

/*
 * Mobile: horizontal snap-scroll, one prominent card at a time with a
 * peek of the next (native affordance that more content is available).
 * The scrollbar stays visible (thin, not hidden) for usability.
 */
.oh-categories {
  display: flex;
  overflow-x: auto;
  gap: var(--oh-space-md);
  padding-bottom: var(--oh-space-sm);
  scroll-snap-type: x mandatory;
  scrollbar-width: thin;
}

.oh-category-card {
  text-decoration: none;
  color: inherit;
  scroll-snap-align: start;
  flex: 0 0 78%;
  max-width: 320px;
  border-radius: var(--oh-radius-lg);
  transition: transform 0.15s ease;
}

.oh-category-card:hover,
.oh-category-card:focus-visible {
  transform: translateY(-4px);
}

.oh-category-card__inner {
  pointer-events: none;
}

.oh-category-card__label {
  font-size: 1.125rem;
}

/*
 * Desktop/tablet: an editorial bento grid — the first category (health)
 * is featured larger, the remaining four fill the rest of an even 4x2
 * cell grid. This intentionally matches the branding breakpoint config
 * (768px, see src/config/branding.js) since plain CSS can't reference
 * Vuetify's JS-level display thresholds directly.
 */
@media (min-width: 768px) {
  .oh-categories {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-auto-rows: 190px;
    overflow: visible;
    padding-bottom: 0;
  }

  .oh-category-card {
    flex: initial;
    max-width: none;
  }

  .oh-category-card:nth-child(1) {
    grid-column: span 2;
    grid-row: span 2;
  }

  .oh-category-card:nth-child(1) .oh-category-card__label {
    font-size: 1.375rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .oh-category-card {
    transition: none;
  }
}
</style>
