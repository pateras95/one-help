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
      variant="tinted"
      center
      :title="t('home.categories.title')"
      :subtitle="t('home.categories.subtitle')"
    >
      <div class="oh-categories" role="list">
        <RouterLink
          v-for="(category, index) in ACTION_CATEGORIES"
          :key="category.id"
          :to="categoryTarget(category.id)"
          class="oh-category-card"
          :class="{ 'oh-category-card--featured': index === 0 }"
          role="listitem"
          :aria-label="t('home.categories.viewActionsAriaLabel', { category: t(category.labelKey) })"
        >
          <OHCard class="oh-category-card__inner pa-5 h-100">
            <VIcon
              v-if="index === 0"
              :icon="category.icon"
              size="140"
              class="oh-category-card__watermark"
              aria-hidden="true"
            />
            <div
              class="oh-icon-chip"
              :class="[`bg-${category.accent}`, index === 0 ? 'oh-icon-chip--featured' : 'oh-icon-chip--lg']"
            >
              <VIcon :icon="category.icon" :size="index === 0 ? 40 : 32" color="white" aria-hidden="true" />
            </div>
            <p class="oh-category-card__label font-weight-bold mt-4 mb-1">
              {{ t(category.labelKey) }}
            </p>
            <p class="text-body-2 text-textSecondary oh-category-card__description mb-0">
              {{ t(category.descriptionKey) }}
            </p>
          </OHCard>
        </RouterLink>
      </div>
    </OHSection>

    <OHSection
      full-bleed
      background="surface"
      center
      :title="t('home.howItWorks.title')"
      :subtitle="t('home.howItWorks.subtitle')"
    >
      <div class="oh-steps">
        <div class="oh-steps__line" aria-hidden="true" />

        <div
          v-for="(step, index) in steps"
          :key="step.key"
          class="oh-step"
        >
          <div class="oh-step__icon-wrap">
            <div class="oh-step__halo">
              <div class="oh-icon-chip oh-icon-chip--lg bg-primary">
                <VIcon :icon="step.icon" size="28" color="white" aria-hidden="true" />
              </div>
            </div>
            <span class="oh-step__number" aria-hidden="true">{{ index + 1 }}</span>
          </div>

          <h3 class="text-subtitle-1 font-weight-bold mt-4">
            {{ t(`home.howItWorks.steps.${step.key}.title`) }}
          </h3>
          <p class="text-body-2 text-textSecondary mt-1">
            {{ t(`home.howItWorks.steps.${step.key}.description`) }}
          </p>
        </div>
      </div>
    </OHSection>

    <OHSection variant="emphasis" center :title="t('home.cta.title')">
      <p class="text-body-1 oh-hero-lead mx-auto">
        {{ t('home.cta.message') }}
      </p>
      <OHButton
        color="white"
        variant="flat"
        size="large"
        class="mt-6"
        :to="ROUTES.ACTIONS"
        :aria-label="t('home.hero.primaryCtaAriaLabel')"
      >
        {{ t('home.cta.button') }}
      </OHButton>
    </OHSection>
  </DefaultLayout>
</template>

<style scoped>
.oh-hero {
  padding-block-end: var(--oh-space-lg);
}

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
  /* The section heading above is centered (OHSection's `center` prop),
     but card copy itself reads better left-aligned — override the
     inherited centering here rather than on every text element inside. */
  text-align: left;
}

.oh-category-card {
  text-decoration: none;
  color: inherit;
  scroll-snap-align: start;
  flex: 0 0 78%;
  max-width: 320px;
  border-radius: var(--oh-radius-lg);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.oh-category-card:hover,
.oh-category-card:focus-visible {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px -12px rgba(21, 34, 56, 0.25);
}

.oh-category-card:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 3px;
}

.oh-category-card__inner {
  position: relative;
  overflow: hidden;
  pointer-events: none;
}

.oh-category-card__label {
  font-size: 1.125rem;
}

.oh-category-card__description {
  max-width: 32ch;
}

.oh-category-card__watermark {
  display: none;
}

.oh-icon-chip--featured {
  width: 88px;
  height: 88px;
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

  .oh-category-card--featured {
    grid-column: span 2;
    grid-row: span 2;
  }

  .oh-category-card--featured .oh-category-card__label {
    font-size: 1.5rem;
  }

  .oh-category-card--featured .oh-category-card__description {
    max-width: 44ch;
    font-size: 1rem;
  }

  .oh-category-card__watermark {
    display: block;
    position: absolute;
    right: -24px;
    bottom: -24px;
    color: rgb(var(--v-theme-on-surface));
    opacity: 0.06;
  }
}

/*
 * How it works: the heading/subtitle render above this via OHSection's
 * own title/subtitle slot, so they're never part of this element's own
 * stacking/positioning context — the connecting line below can only ever
 * exist inside `.oh-steps`, never behind the heading.
 *
 * Mobile: a plain vertical stack (no connecting line — a line here would
 * need to track three rows of variable-height text, which is fragile;
 * generous spacing + numbered icons already group the steps clearly).
 * Desktop: three balanced grid columns in a width-capped, centered
 * container, with a connecting line spanning icon-center to icon-center
 * (proportional to the steps container via `100% / 6`, not a viewport
 * percentage) sitting behind the icons. Each icon has a "halo" the same
 * color as the section background, so it visually masks the line
 * passing behind it instead of the line touching the icon's edge.
 */
.oh-steps {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--oh-space-xl);
  max-width: 760px;
  margin-inline: auto;
  margin-top: var(--oh-space-lg);
  text-align: center;
}

.oh-step {
  position: relative;
  z-index: 1;
}

.oh-step__icon-wrap {
  position: relative;
  width: 72px;
  margin-inline: auto;
}

.oh-step__halo {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgb(var(--v-theme-surface));
  display: flex;
  align-items: center;
  justify-content: center;
}

.oh-step__number {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  font-size: 0.75rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgb(var(--v-theme-surface));
}

.oh-steps__line {
  display: none;
}

@media (min-width: 768px) {
  .oh-steps {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    align-items: start;
    gap: var(--oh-space-lg);
  }

  .oh-steps__line {
    display: block;
    position: absolute;
    top: 36px;
    left: calc(100% / 6);
    right: calc(100% / 6);
    height: 2px;
    background: rgb(var(--v-theme-border));
    z-index: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .oh-category-card {
    transition: none;
  }
}
</style>
