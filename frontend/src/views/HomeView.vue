<script setup>
import { useI18n } from 'vue-i18n'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import OHSection from '@/components/common/OHSection.vue'
import OHButton from '@/components/common/OHButton.vue'
import SignalIllustration from '@/components/common/SignalIllustration.vue'
import { ROUTES } from '@/constants/routes'
import { ACTION_CATEGORIES } from '@/constants/actionCategories'

const { t } = useI18n()

const trustKeys = ['trust1', 'trust2', 'trust3']

const steps = [
  { key: 'step1', icon: 'mdi-magnify' },
  { key: 'step2', icon: 'mdi-account-check-outline' },
  { key: 'step3', icon: 'mdi-hand-heart-outline' }
]

// Presentational-only composition variety per category tile — same
// underlying category data/order/links as before, just five distinct
// visual treatments instead of one repeated card template. 'health' and
// 'environment' share Emergency's rich solid-color recipe (own hue,
// own composition) so every tile reads as the same quality family.
const TILE_LAYOUTS = ['featured', 'health', 'environment', 'corner', 'tinted']

function categoryTarget(categoryId) {
  return { path: ROUTES.ACTIONS, query: { category: categoryId } }
}
</script>

<template>
  <DefaultLayout>
    <section class="oh-hero oh-surface-wash">
      <div class="oh-hero__grid">
        <div class="oh-hero__copy oh-reveal">
          <span class="oh-eyebrow mb-4">{{ t('home.hero.eyebrow') }}</span>
          <h1 class="oh-display font-weight-bold text-textPrimary">
            {{ t('home.hero.headline') }}
          </h1>

          <p class="text-body-1 text-textSecondary mt-5 oh-measure">
            {{ t('home.hero.lead') }}
          </p>

          <div class="d-flex flex-column flex-sm-row ga-3 mt-7">
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

          <ul class="oh-hero__trust mt-9" role="list">
            <li v-for="key in trustKeys" :key="key">
              <VIcon icon="mdi-check-decagram" size="16" color="secondary" aria-hidden="true" />
              <span>{{ t(`home.hero.${key}`) }}</span>
            </li>
          </ul>
        </div>

        <div class="oh-hero__visual oh-reveal oh-reveal--delay-2">
          <SignalIllustration />
          <div class="oh-hero__floating-card" aria-hidden="true">
            <VIcon icon="mdi-check-circle" size="18" color="success" />
            <span>{{ t(ACTION_CATEGORIES[2].labelKey) }}</span>
          </div>
        </div>
      </div>
    </section>

    <div class="oh-section-divider" aria-hidden="true">
      <span class="oh-section-divider__dot" />
    </div>

    <OHSection
      variant="tinted"
      center
      eyebrow="OneHelp"
      :title="t('home.categories.title')"
      :subtitle="t('home.categories.subtitle')"
    >
      <div class="oh-categories" role="list">
        <RouterLink
          v-for="(category, index) in ACTION_CATEGORIES"
          :key="category.id"
          :to="categoryTarget(category.id)"
          class="oh-category-tile"
          :class="`oh-category-tile--${TILE_LAYOUTS[index] ?? 'tinted'}`"
          role="listitem"
          :aria-label="t('home.categories.viewActionsAriaLabel', { category: t(category.labelKey) })"
        >
          <!-- Featured: a full solid color field, the visual anchor of the grid. -->
          <template v-if="TILE_LAYOUTS[index] === 'featured'">
            <VIcon :icon="category.icon" size="130" class="oh-category-tile__watermark" aria-hidden="true" />
            <div class="oh-icon-well oh-icon-well--xl bg-white">
              <VIcon :icon="category.icon" size="40" :color="category.accent" aria-hidden="true" />
            </div>
            <p class="oh-category-tile__label font-weight-bold mt-4 mb-1">{{ t(category.labelKey) }}</p>
            <p class="text-body-2 oh-category-tile__description mb-0">{{ t(category.descriptionKey) }}</p>
          </template>

          <!-- Health: Emergency's rich solid-field recipe in its own hue,
               mirrored (watermark top-left, icon well bottom-right) so it
               reads as the same family without being a literal copy. -->
          <template v-else-if="TILE_LAYOUTS[index] === 'health'">
            <VIcon :icon="category.icon" size="104" class="oh-category-tile__watermark oh-category-tile__watermark--health" aria-hidden="true" />
            <div class="oh-category-tile__spacer" />
            <div class="oh-icon-well oh-icon-well--lg bg-white">
              <VIcon :icon="category.icon" size="30" :color="category.accent" aria-hidden="true" />
            </div>
            <p class="oh-category-tile__label font-weight-bold mt-4 mb-1">{{ t(category.labelKey) }}</p>
            <p class="text-body-2 oh-category-tile__description mb-0">{{ t(category.descriptionKey) }}</p>
          </template>

          <!-- Environment: the same solid-field richness, centered instead
               of left-anchored, with a dashed halo behind the icon for an
               organic/growth feel distinct from Health's composition. -->
          <template v-else-if="TILE_LAYOUTS[index] === 'environment'">
            <div class="oh-category-tile__center">
              <div class="oh-category-tile__halo">
                <div class="oh-icon-well oh-icon-well--lg bg-white">
                  <VIcon :icon="category.icon" size="30" :color="category.accent" aria-hidden="true" />
                </div>
              </div>
              <p class="oh-category-tile__label font-weight-bold mt-4 mb-1">{{ t(category.labelKey) }}</p>
              <p class="text-body-2 oh-category-tile__description mb-0">{{ t(category.descriptionKey) }}</p>
            </div>
          </template>

          <!-- Corner: a large ghost icon watermark behind standard content. -->
          <template v-else-if="TILE_LAYOUTS[index] === 'corner'">
            <VIcon :icon="category.icon" size="96" class="oh-category-tile__watermark oh-category-tile__watermark--corner" aria-hidden="true" />
            <div class="oh-icon-well" :class="`bg-${category.accent}`">
              <VIcon :icon="category.icon" size="24" color="white" aria-hidden="true" />
            </div>
            <p class="oh-category-tile__label font-weight-bold mt-4 mb-1">{{ t(category.labelKey) }}</p>
            <p class="text-body-2 text-textSecondary oh-category-tile__description mb-0">{{ t(category.descriptionKey) }}</p>
          </template>

          <!-- Tinted: a soft full-tile wash in the category's own hue. -->
          <template v-else>
            <div class="oh-category-tile__tint" :style="{ background: `rgba(var(--v-theme-${category.accent}), 0.12)` }" aria-hidden="true" />
            <div class="oh-icon-well bg-white oh-category-tile__tinted-well">
              <VIcon :icon="category.icon" size="24" :color="category.accent" aria-hidden="true" />
            </div>
            <p class="oh-category-tile__label font-weight-bold mt-4 mb-1">{{ t(category.labelKey) }}</p>
            <p class="text-body-2 text-textSecondary oh-category-tile__description mb-0">{{ t(category.descriptionKey) }}</p>
          </template>
        </RouterLink>
      </div>
    </OHSection>

    <OHSection
      full-bleed
      background="surface"
      center
      eyebrow="OneHelp"
      :title="t('home.howItWorks.title')"
      :subtitle="t('home.howItWorks.subtitle')"
    >
      <ol class="oh-journey">
        <li
          v-for="(step, index) in steps"
          :key="step.key"
          class="oh-journey__step"
          :class="{ 'oh-journey__step--reverse': index % 2 === 1 }"
        >
          <div class="oh-journey__marker">
            <div class="oh-icon-well oh-icon-well--lg bg-primary">
              <VIcon :icon="step.icon" size="26" color="white" aria-hidden="true" />
            </div>
            <span class="oh-journey__number" aria-hidden="true">{{ index + 1 }}</span>
          </div>
          <div class="oh-journey__text">
            <h3 class="oh-headline font-weight-bold" style="font-size: 1.375rem">
              {{ t(`home.howItWorks.steps.${step.key}.title`) }}
            </h3>
            <p class="text-body-1 text-textSecondary mt-2 oh-measure">
              {{ t(`home.howItWorks.steps.${step.key}.description`) }}
            </p>
          </div>
        </li>
      </ol>
    </OHSection>

    <section class="oh-container">
      <div class="oh-cta-panel">
        <span class="oh-cta-panel__glow" aria-hidden="true" />
        <div class="oh-cta-panel__mark" aria-hidden="true">
          <div class="oh-icon-well oh-icon-well--xl bg-white">
            <VIcon icon="mdi-hand-heart-outline" size="40" color="primary" aria-hidden="true" />
          </div>
        </div>
        <div class="oh-cta-panel__text">
          <h2 class="oh-headline font-weight-bold text-white mb-2">{{ t('home.cta.title') }}</h2>
          <p class="text-body-1 oh-cta-panel__message mb-0">{{ t('home.cta.message') }}</p>
        </div>
        <OHButton
          color="white"
          variant="flat"
          size="large"
          class="oh-cta-panel__button"
          :to="ROUTES.ACTIONS"
          :aria-label="t('home.hero.primaryCtaAriaLabel')"
        >
          {{ t('home.cta.button') }}
        </OHButton>
      </div>
    </section>
  </DefaultLayout>
</template>

<style scoped>
/* ---------- Hero ---------- */

.oh-hero {
  padding-block: var(--oh-space-xl) var(--oh-space-2xl);
}

@media (min-width: 960px) {
  .oh-hero {
    padding-block: var(--oh-space-3xl) var(--oh-space-2xl);
  }
}

.oh-hero__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--oh-space-2xl);
  align-items: center;
}

@media (min-width: 960px) {
  .oh-hero__grid {
    grid-template-columns: 1.15fr 0.85fr;
    gap: var(--oh-space-3xl);
  }
}

/* A quiet, on-brand seam between the hero and the next section — a
   thin gradient rule with a single coral spark at its center, echoing
   the logo's handoff motif, rather than a heavy border. */
.oh-section-divider {
  position: relative;
  height: 1px;
  margin-block: var(--oh-space-lg) 0;
  background: linear-gradient(90deg, transparent, rgba(19, 42, 77, 0.14) 50%, transparent);
}

.oh-section-divider__dot {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: rgb(var(--v-theme-secondary));
  transform: translate(-50%, -50%);
}

.oh-hero__trust {
  display: flex;
  flex-direction: column;
  gap: var(--oh-space-sm);
  list-style: none;
  padding: 0;
  margin: 0;
}

.oh-hero__trust li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  color: rgb(var(--v-theme-textSecondary));
}

.oh-hero__visual {
  position: relative;
}

.oh-hero__floating-card {
  position: absolute;
  bottom: 6%;
  left: -4%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: var(--oh-radius-md);
  background: rgb(var(--v-theme-surface));
  box-shadow: var(--oh-shadow-lg);
  font-size: 0.8125rem;
  font-weight: 700;
  z-index: 4;
}

@media (max-width: 599px) {
  .oh-hero__floating-card {
    left: 4%;
  }
}

/* ---------- Category tiles ---------- */

.oh-categories {
  display: flex;
  overflow-x: auto;
  gap: var(--oh-space-md);
  padding-bottom: var(--oh-space-sm);
  scroll-snap-type: x mandatory;
  scrollbar-width: thin;
  text-align: left;
}

.oh-category-tile {
  position: relative;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  scroll-snap-align: start;
  flex: 0 0 78%;
  max-width: 320px;
  min-height: 200px;
  border-radius: var(--oh-radius-lg);
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgb(var(--v-theme-border));
  padding: var(--oh-space-lg);
  display: flex;
  flex-direction: column;
  transition: transform var(--oh-transition-base), box-shadow var(--oh-transition-base);
}

.oh-category-tile:hover,
.oh-category-tile:focus-visible {
  transform: translateY(-4px);
  box-shadow: var(--oh-shadow-md);
}

.oh-category-tile__label { font-size: 1.0625rem; }
.oh-category-tile__description { max-width: 32ch; }

/* Featured */
.oh-category-tile--featured {
  background: rgb(var(--v-theme-categoryEmergency));
  color: #fff;
  border-color: transparent;
}
.oh-category-tile--featured .oh-category-tile__label { font-size: 1.375rem; color: #fff; }
.oh-category-tile--featured .oh-category-tile__description { color: rgba(255, 255, 255, 0.85); max-width: 40ch; }
.oh-category-tile__watermark {
  position: absolute;
  right: -18px;
  bottom: -18px;
  opacity: 0.16;
  color: #fff;
}

/* Health & Environment: the same rich solid-field recipe as Emergency
   (own hue, white text, ghost watermark) so the whole grid reads as one
   premium family — composition varies so each keeps its own identity. */
.oh-category-tile--health,
.oh-category-tile--environment {
  color: #fff;
  border-color: transparent;
}
.oh-category-tile--health { background: rgb(var(--v-theme-categoryHealth)); }
.oh-category-tile--environment { background: rgb(var(--v-theme-categoryEnvironment)); }

.oh-category-tile--health .oh-category-tile__label,
.oh-category-tile--environment .oh-category-tile__label { color: #fff; }
.oh-category-tile--health .oh-category-tile__description,
.oh-category-tile--environment .oh-category-tile__description { color: rgba(255, 255, 255, 0.85); }

.oh-category-tile__spacer { flex: 1 1 auto; }

.oh-category-tile__watermark--health {
  left: -14px;
  top: -14px;
  right: auto;
  bottom: auto;
  opacity: 0.14;
}

.oh-category-tile--environment { display: flex; }
.oh-category-tile__center {
  margin: auto;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.oh-category-tile__halo {
  position: relative;
  padding: 10px;
  border-radius: 50%;
  border: 2px dashed rgba(255, 255, 255, 0.35);
}

/* Corner */
.oh-category-tile--corner { position: relative; }
.oh-category-tile__watermark--corner {
  right: -12px;
  bottom: -12px;
  color: rgb(var(--v-theme-textPrimary));
  opacity: 0.05;
}

/* Tinted */
.oh-category-tile--tinted { position: relative; border-color: transparent; }
.oh-category-tile__tint { position: absolute; inset: 0; z-index: 0; }
.oh-category-tile__tinted-well { position: relative; z-index: 1; box-shadow: var(--oh-shadow-sm); }
.oh-category-tile--tinted .oh-category-tile__label,
.oh-category-tile--tinted .oh-category-tile__description { position: relative; z-index: 1; }

@media (min-width: 768px) {
  .oh-categories {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-auto-rows: 190px;
    overflow: visible;
    padding-bottom: 0;
  }

  .oh-category-tile { max-width: none; min-height: 0; }

  .oh-category-tile--featured {
    grid-column: span 2;
    grid-row: span 2;
  }
}

/* ---------- How it works: editorial zigzag journey ---------- */

.oh-journey {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--oh-space-xl);
  max-width: 720px;
  margin: var(--oh-space-lg) auto 0;
  padding: 0;
  list-style: none;
}

.oh-journey::before {
  content: '';
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 34px;
  width: 2px;
  background-image: linear-gradient(rgba(19, 42, 77, 0.2) 50%, transparent 50%);
  background-size: 2px 12px;
}

.oh-journey__step {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: var(--oh-space-lg);
  text-align: left;
}

.oh-journey__marker {
  position: relative;
  flex-shrink: 0;
  z-index: 1;
}

.oh-journey__number {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgb(var(--v-theme-secondary));
  color: #fff;
  font-size: 0.6875rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgb(var(--v-theme-surface));
}

@media (min-width: 768px) {
  .oh-journey::before { left: 50%; transform: translateX(-1px); }

  .oh-journey__step {
    justify-content: flex-start;
    padding-inline-end: 52%;
  }

  .oh-journey__step--reverse {
    flex-direction: row-reverse;
    text-align: right;
    padding-inline-end: 0;
    padding-inline-start: 52%;
  }
}

/* ---------- CTA: an integrated dark panel, not an isolated gradient block ---------- */

.oh-cta-panel {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  border-radius: var(--oh-radius-xl);
  background: var(--oh-gradient-operational);
  padding: var(--oh-space-xl) var(--oh-space-lg);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--oh-space-md);
  margin-block: var(--oh-space-lg);
}

.oh-cta-panel__glow {
  position: absolute;
  inset: -20% -20% auto auto;
  width: 50%;
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(232, 92, 63, 0.32), transparent 70%);
  z-index: 0;
}

.oh-cta-panel__mark,
.oh-cta-panel__text,
.oh-cta-panel__button {
  position: relative;
  z-index: 1;
}

.oh-cta-panel__message {
  color: rgba(255, 255, 255, 0.85);
  max-width: 46ch;
}

@media (min-width: 768px) {
  .oh-cta-panel {
    flex-direction: row;
    text-align: left;
    padding: var(--oh-space-xl) var(--oh-space-2xl);
  }
  .oh-cta-panel__text { flex: 1 1 auto; }
  .oh-cta-panel__button { flex-shrink: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .oh-category-tile {
    transition: none;
  }
}
</style>
