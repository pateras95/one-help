<script setup>
import { useI18n } from 'vue-i18n'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import OHSection from '@/components/common/OHSection.vue'
import OHCard from '@/components/common/OHCard.vue'
import OHButton from '@/components/common/OHButton.vue'
import SignalIllustration from '@/components/common/SignalIllustration.vue'
import { ROUTES } from '@/constants/routes'

const { t } = useI18n()

const whyCards = [
  { key: 'people', icon: 'mdi-account-heart-outline', color: 'primary' },
  { key: 'organizations', icon: 'mdi-account-group-outline', color: 'accent' },
  { key: 'safety', icon: 'mdi-shield-check-outline', color: 'secondary' }
]

const howItWorksSteps = [
  { key: 'register', icon: 'mdi-account-plus-outline' },
  { key: 'discover', icon: 'mdi-compass-outline' },
  { key: 'join', icon: 'mdi-calendar-check-outline' },
  { key: 'attend', icon: 'mdi-map-marker-check-outline' },
  { key: 'checkIn', icon: 'mdi-qrcode-scan' },
  { key: 'help', icon: 'mdi-hand-heart-outline' },
  { key: 'completed', icon: 'mdi-check-decagram-outline' }
]

const volunteerJourneyItems = [
  { key: 'registration', icon: 'mdi-account-plus-outline' },
  { key: 'profile', icon: 'mdi-account-circle-outline' },
  { key: 'discover', icon: 'mdi-compass-outline' },
  { key: 'join', icon: 'mdi-calendar-check-outline' },
  { key: 'qrAttendance', icon: 'mdi-qrcode-scan' },
  { key: 'myActions', icon: 'mdi-format-list-checks' }
]

const organizerChain = [
  { key: 'volunteer', icon: 'mdi-account-outline', color: 'primary', connector: null },
  { key: 'organizer', icon: 'mdi-badge-account-outline', color: 'secondary', connector: 'connectorOne' },
  { key: 'organization', icon: 'mdi-domain', color: 'accent', connector: 'connectorMany' },
  { key: 'actions', icon: 'mdi-clipboard-text-outline', color: 'success', connector: null }
]

const verifiedPoints = [
  { key: 'why', icon: 'mdi-help-circle-outline' },
  { key: 'trust', icon: 'mdi-clipboard-check-outline' },
  { key: 'protect', icon: 'mdi-account-lock-outline' }
]

const qrSteps = [
  { key: 'arrive', icon: 'mdi-walk' },
  { key: 'scan', icon: 'mdi-qrcode-scan' },
  { key: 'confirmed', icon: 'mdi-check-circle-outline' }
]

const faqKeys = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6']
</script>

<template>
  <DefaultLayout>
    <!-- Section 1 — Hero: an editorial "manifesto panel", deliberately not
         the Home hero's open left-text/right-illustration composition —
         a bounded, quote-styled spread with the illustration shrunk into
         a side aside instead of a co-equal visual column. -->
    <section class="oh-about-hero">
      <div class="oh-about-hero__panel oh-reveal">
        <span class="oh-about-hero__quote-mark" aria-hidden="true">&ldquo;</span>

        <div class="oh-about-hero__grid">
          <aside class="oh-about-hero__aside">
            <span class="oh-eyebrow">{{ t('pages.about.hero.eyebrow') }}</span>
            <div class="oh-about-hero__illustration-wrap">
              <SignalIllustration />
            </div>
          </aside>

          <div class="oh-about-hero__main">
            <h1 class="oh-about-hero__headline font-weight-bold text-textPrimary">
              {{ t('pages.about.hero.headline') }}
            </h1>
            <p class="text-body-1 text-textSecondary oh-about-hero__lead">
              {{ t('pages.about.hero.lead') }}
            </p>
            <div class="d-flex flex-column flex-sm-row ga-3 oh-about-hero__actions">
              <OHButton
                color="primary"
                size="large"
                :to="ROUTES.ACTIONS"
                :aria-label="t('pages.about.hero.primaryCtaAriaLabel')"
              >
                {{ t('pages.about.hero.primaryCta') }}
              </OHButton>
              <OHButton
                variant="outlined"
                size="large"
                :to="ROUTES.REGISTER"
                :aria-label="t('pages.about.hero.secondaryCtaAriaLabel')"
              >
                {{ t('pages.about.hero.secondaryCta') }}
              </OHButton>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 2 — Why OneHelp -->
    <OHSection
      variant="tinted"
      center
      :eyebrow="t('pages.about.why.eyebrow')"
      :title="t('pages.about.why.title')"
      :subtitle="t('pages.about.why.subtitle')"
    >
      <div class="oh-about-cards" role="list">
        <OHCard
          v-for="card in whyCards"
          :key="card.key"
          class="pa-5 oh-card-interactive oh-about-cards__card"
          role="listitem"
        >
          <div class="oh-icon-well oh-icon-well--lg" :class="`bg-${card.color}`">
            <VIcon :icon="card.icon" size="28" color="white" aria-hidden="true" />
          </div>
          <h3 class="text-subtitle-1 font-weight-bold mt-4 mb-1">
            {{ t(`pages.about.why.cards.${card.key}.title`) }}
          </h3>
          <p class="text-body-2 text-textSecondary mb-0">
            {{ t(`pages.about.why.cards.${card.key}.description`) }}
          </p>
        </OHCard>
      </div>
    </OHSection>

    <!-- Section 3 — How the platform works -->
    <OHSection
      full-bleed
      background="surface"
      center
      :eyebrow="t('pages.about.howItWorks.eyebrow')"
      :title="t('pages.about.howItWorks.title')"
      :subtitle="t('pages.about.howItWorks.subtitle')"
    >
      <ol class="oh-timeline" role="list">
        <li
          v-for="(step, index) in howItWorksSteps"
          :key="step.key"
          class="oh-timeline__step"
          :class="{ 'oh-timeline__step--reverse': index % 2 === 1 }"
        >
          <div class="oh-timeline__marker">
            <div class="oh-icon-well oh-icon-well--lg bg-primary">
              <VIcon :icon="step.icon" size="26" color="white" aria-hidden="true" />
            </div>
            <span class="oh-timeline__number" aria-hidden="true">{{ index + 1 }}</span>
          </div>
          <div class="oh-timeline__text">
            <h3 class="text-h6 font-weight-bold">
              {{ t(`pages.about.howItWorks.steps.${step.key}.title`) }}
            </h3>
            <p class="text-body-1 text-textSecondary mt-2 oh-measure">
              {{ t(`pages.about.howItWorks.steps.${step.key}.description`) }}
            </p>
          </div>
        </li>
      </ol>
    </OHSection>

    <!-- Section 4 — Volunteer Journey -->
    <OHSection
      center
      :eyebrow="t('pages.about.volunteerJourney.eyebrow')"
      :title="t('pages.about.volunteerJourney.title')"
      :subtitle="t('pages.about.volunteerJourney.subtitle')"
    >
      <div class="oh-about-grid" role="list">
        <div v-for="item in volunteerJourneyItems" :key="item.key" class="oh-about-grid__item" role="listitem">
          <div class="oh-icon-well bg-surfaceVariant">
            <VIcon :icon="item.icon" size="24" color="secondary" aria-hidden="true" />
          </div>
          <h3 class="text-subtitle-1 font-weight-bold mt-3 mb-1">
            {{ t(`pages.about.volunteerJourney.items.${item.key}.title`) }}
          </h3>
          <p class="text-body-2 text-textSecondary mb-0">
            {{ t(`pages.about.volunteerJourney.items.${item.key}.description`) }}
          </p>
        </div>
      </div>
    </OHSection>

    <!-- Section 5 — Organizer Journey -->
    <OHSection
      full-bleed
      background="surfaceOperational"
      center
      :eyebrow="t('pages.about.organizerJourney.eyebrow')"
      :title="t('pages.about.organizerJourney.title')"
      :subtitle="t('pages.about.organizerJourney.subtitle')"
    >
      <p class="text-body-1 text-textSecondary oh-measure mx-auto mb-9">
        {{ t('pages.about.organizerJourney.intro') }}
      </p>

      <div class="oh-chain" role="list">
        <template v-for="(node, index) in organizerChain" :key="node.key">
          <div class="oh-chain__node" role="listitem">
            <div class="oh-icon-well oh-icon-well--lg" :class="`bg-${node.color}`">
              <VIcon :icon="node.icon" size="28" color="white" aria-hidden="true" />
            </div>
            <h3 class="text-subtitle-1 font-weight-bold mt-3 mb-1">
              {{ t(`pages.about.organizerJourney.chain.${node.key}.title`) }}
            </h3>
            <p class="text-body-2 text-textSecondary mb-0">
              {{ t(`pages.about.organizerJourney.chain.${node.key}.description`) }}
            </p>
          </div>

          <div v-if="index < organizerChain.length - 1" class="oh-chain__connector" aria-hidden="true">
            <VIcon icon="mdi-arrow-right-thin" size="28" color="textSecondary" class="oh-chain__arrow-icon" />
            <span v-if="node.connector" class="oh-chain__connector-label">
              {{ t(`pages.about.organizerJourney.${node.connector}`) }}
            </span>
          </div>
        </template>
      </div>

      <div class="oh-panel oh-about-note mt-8 mx-auto">
        <VIcon icon="mdi-information-outline" size="22" color="secondary" aria-hidden="true" />
        <p class="text-body-2 font-weight-medium mb-0">{{ t('pages.about.organizerJourney.note') }}</p>
      </div>
    </OHSection>

    <!-- Section 6 — Verified Organizations -->
    <OHSection variant="tinted">
      <div class="oh-about-split">
        <div class="oh-about-split__visual" aria-hidden="true">
          <div class="oh-about-badge">
            <VIcon icon="mdi-shield-check" size="64" color="white" aria-hidden="true" />
          </div>
        </div>
        <div class="oh-about-split__text">
          <span class="oh-eyebrow mb-2">{{ t('pages.about.verified.eyebrow') }}</span>
          <h2 class="oh-section-title font-weight-bold mb-1">{{ t('pages.about.verified.title') }}</h2>
          <p class="text-body-1 text-textSecondary mb-6 oh-measure">{{ t('pages.about.verified.subtitle') }}</p>

          <ul class="oh-about-point-list" role="list">
            <li v-for="point in verifiedPoints" :key="point.key" class="oh-about-point-list__item">
              <div class="oh-icon-well bg-white">
                <VIcon :icon="point.icon" size="22" color="secondary" aria-hidden="true" />
              </div>
              <div>
                <h3 class="text-subtitle-1 font-weight-bold mb-1">
                  {{ t(`pages.about.verified.points.${point.key}.title`) }}
                </h3>
                <p class="text-body-2 text-textSecondary mb-0">
                  {{ t(`pages.about.verified.points.${point.key}.description`) }}
                </p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </OHSection>

    <!-- Section 7 — QR Check-In -->
    <OHSection
      center
      :eyebrow="t('pages.about.qrCheckIn.eyebrow')"
      :title="t('pages.about.qrCheckIn.title')"
      :subtitle="t('pages.about.qrCheckIn.subtitle')"
    >
      <div class="oh-qr-flow" role="list">
        <template v-for="(step, index) in qrSteps" :key="step.key">
          <div class="oh-qr-flow__step" role="listitem">
            <div class="oh-icon-well oh-icon-well--xl bg-primary">
              <VIcon :icon="step.icon" size="36" color="white" aria-hidden="true" />
            </div>
            <h3 class="text-subtitle-1 font-weight-bold mt-4 mb-1">
              {{ t(`pages.about.qrCheckIn.steps.${step.key}.title`) }}
            </h3>
            <p class="text-body-2 text-textSecondary mb-0 oh-measure">
              {{ t(`pages.about.qrCheckIn.steps.${step.key}.description`) }}
            </p>
          </div>
          <VIcon
            v-if="index < qrSteps.length - 1"
            icon="mdi-arrow-right-thin"
            size="28"
            color="border"
            class="oh-qr-flow__arrow"
            aria-hidden="true"
          />
        </template>
      </div>
    </OHSection>

    <!-- Section 8 — FAQ -->
    <OHSection
      variant="muted"
      :eyebrow="t('pages.about.faq.eyebrow')"
      :title="t('pages.about.faq.title')"
      :subtitle="t('pages.about.faq.subtitle')"
    >
      <VExpansionPanels variant="accordion" class="oh-about-faq mx-auto">
        <VExpansionPanel v-for="key in faqKeys" :key="key">
          <VExpansionPanelTitle class="font-weight-bold">
            {{ t(`pages.about.faq.items.${key}.question`) }}
          </VExpansionPanelTitle>
          <VExpansionPanelText class="text-body-2 text-textSecondary">
            {{ t(`pages.about.faq.items.${key}.answer`) }}
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </OHSection>

    <!-- Section 9 — Final CTA -->
    <section class="oh-container">
      <div class="oh-cta-panel">
        <span class="oh-cta-panel__glow" aria-hidden="true" />
        <div class="oh-cta-panel__mark" aria-hidden="true">
          <div class="oh-icon-well oh-icon-well--xl bg-white">
            <VIcon icon="mdi-hand-heart-outline" size="40" color="primary" aria-hidden="true" />
          </div>
        </div>
        <div class="oh-cta-panel__text">
          <h2 class="oh-headline font-weight-bold text-white mb-2">{{ t('pages.about.finalCta.title') }}</h2>
          <p class="text-body-1 oh-cta-panel__message mb-0">{{ t('pages.about.finalCta.message') }}</p>
        </div>
        <div class="oh-cta-panel__actions">
          <OHButton
            color="white"
            variant="flat"
            size="large"
            :to="ROUTES.ACTIONS"
            :aria-label="t('pages.about.finalCta.primaryCtaAriaLabel')"
          >
            {{ t('pages.about.finalCta.primaryCta') }}
          </OHButton>
          <OHButton
            variant="outlined"
            size="large"
            class="oh-cta-panel__secondary"
            :to="ROUTES.REGISTER"
            :aria-label="t('pages.about.finalCta.secondaryCtaAriaLabel')"
          >
            {{ t('pages.about.finalCta.secondaryCta') }}
          </OHButton>
        </div>
      </div>
    </section>
  </DefaultLayout>
</template>

<style scoped>
/* ---------- Hero: editorial manifesto panel ----------
 * Deliberately not the Home hero's open, borderless left-text/
 * right-illustration split — a single bounded, elevated panel (its own
 * radius/shadow/gradient, like a printed page) with a decorative giant
 * quote mark, an asymmetric narrow-aside/wide-main grid (illustration
 * shrunk to a side accent, not a co-equal column), and the lead copy
 * set off with its own left rule like a pull-quote annotation.
 */

.oh-about-hero {
  padding-block: var(--oh-space-lg) var(--oh-space-xl);
}

.oh-about-hero__panel {
  position: relative;
  overflow: hidden;
  border-radius: var(--oh-radius-xl);
  border: 1px solid rgb(var(--v-theme-border));
  background: var(--oh-gradient-brand-soft);
  box-shadow: var(--oh-shadow-lg);
  padding: var(--oh-space-xl) var(--oh-space-lg);
}

@media (min-width: 960px) {
  .oh-about-hero__panel {
    padding: var(--oh-space-3xl) var(--oh-space-2xl);
  }
}

.oh-about-hero__quote-mark {
  position: absolute;
  top: -0.28em;
  left: var(--oh-space-lg);
  font-size: 9rem;
  line-height: 1;
  font-weight: 800;
  font-family: Georgia, 'Times New Roman', serif;
  color: rgb(var(--v-theme-secondary));
  opacity: 0.1;
  pointer-events: none;
  user-select: none;
}

@media (min-width: 960px) {
  .oh-about-hero__quote-mark {
    left: var(--oh-space-2xl);
    font-size: 13rem;
  }
}

.oh-about-hero__grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--oh-space-xl);
}

@media (min-width: 960px) {
  .oh-about-hero__grid {
    grid-template-columns: 0.32fr 0.68fr;
    gap: var(--oh-space-2xl);
    align-items: center;
  }
}

.oh-about-hero__aside {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--oh-space-md);
}

@media (min-width: 960px) {
  .oh-about-hero__aside {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--oh-space-lg);
  }
}

.oh-about-hero__illustration-wrap {
  width: 96px;
  flex-shrink: 0;
}

@media (min-width: 960px) {
  .oh-about-hero__illustration-wrap {
    width: 100%;
    max-width: 168px;
  }
}

.oh-about-hero__headline {
  font-size: var(--oh-text-display);
  line-height: 1.1;
  letter-spacing: -0.01em;
}

.oh-about-hero__lead {
  margin-top: var(--oh-space-lg);
  padding-inline-start: var(--oh-space-md);
  border-inline-start: 3px solid rgb(var(--v-theme-secondary));
  max-width: 56ch;
}

.oh-about-hero__actions {
  margin-top: var(--oh-space-xl);
}

/* ---------- Why OneHelp cards ---------- */

.oh-about-cards {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--oh-space-md);
}

@media (min-width: 768px) {
  .oh-about-cards {
    grid-template-columns: repeat(3, 1fr);
  }
}

.oh-about-cards__card {
  height: 100%;
}

/* ---------- How it works: editorial zigzag timeline ---------- */

.oh-timeline {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--oh-space-xl);
  max-width: 720px;
  margin: var(--oh-space-lg) auto 0;
  padding: 0;
  list-style: none;
}

.oh-timeline::before {
  content: '';
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 34px;
  width: 2px;
  background-image: linear-gradient(rgba(var(--v-theme-primary), 0.2) 50%, transparent 50%);
  background-size: 2px 12px;
}

.oh-timeline__step {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: var(--oh-space-lg);
  text-align: left;
}

.oh-timeline__marker {
  position: relative;
  flex-shrink: 0;
  z-index: 1;
}

.oh-timeline__number {
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
  .oh-timeline::before { left: 50%; transform: translateX(-1px); }

  .oh-timeline__step {
    justify-content: flex-start;
    padding-inline-end: 52%;
  }

  .oh-timeline__step--reverse {
    flex-direction: row-reverse;
    text-align: right;
    padding-inline-end: 0;
    padding-inline-start: 52%;
  }
}

/* ---------- Volunteer journey grid ---------- */

.oh-about-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--oh-space-lg);
  text-align: left;
}

@media (min-width: 600px) {
  .oh-about-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 960px) {
  .oh-about-grid { grid-template-columns: repeat(3, 1fr); }
}

/* ---------- Organizer journey chain ---------- */

.oh-chain {
  display: flex;
  flex-direction: column;
  gap: var(--oh-space-md);
  max-width: 1080px;
  margin-inline: auto;
}

.oh-chain__node {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgb(var(--v-theme-border));
  border-radius: var(--oh-radius-lg);
  padding: var(--oh-space-lg);
}

.oh-chain__connector {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--oh-space-xs);
  flex-shrink: 0;
}

.oh-chain__arrow-icon {
  transform: rotate(90deg);
}

.oh-chain__connector-label {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-secondary));
  white-space: nowrap;
}

@media (min-width: 960px) {
  .oh-chain {
    flex-direction: row;
    align-items: stretch;
  }
  .oh-chain__arrow-icon {
    transform: none;
  }
}

.oh-about-note {
  display: flex;
  align-items: flex-start;
  gap: var(--oh-space-sm);
  max-width: 640px;
  padding: var(--oh-space-md) var(--oh-space-lg);
  background: rgb(var(--v-theme-surface));
}

/* ---------- Verified organizations split layout ---------- */

.oh-about-split {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--oh-space-xl);
  align-items: center;
}

@media (min-width: 960px) {
  .oh-about-split {
    grid-template-columns: 0.4fr 0.6fr;
  }
}

.oh-about-split__visual {
  display: flex;
  justify-content: center;
}

.oh-about-badge {
  width: 160px;
  height: 160px;
  border-radius: var(--oh-radius-squircle);
  background: var(--oh-gradient-brand);
  box-shadow: var(--oh-shadow-coral);
  display: flex;
  align-items: center;
  justify-content: center;
}

.oh-about-point-list {
  display: flex;
  flex-direction: column;
  gap: var(--oh-space-md);
  list-style: none;
  padding: 0;
  margin: 0;
}

.oh-about-point-list__item {
  display: flex;
  align-items: flex-start;
  gap: var(--oh-space-md);
  text-align: left;
}

/* ---------- QR check-in flow ---------- */

.oh-qr-flow {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--oh-space-lg);
  max-width: 960px;
  margin-inline: auto;
}

.oh-qr-flow__step {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 260px;
}

.oh-qr-flow__arrow {
  transform: rotate(90deg);
}

@media (min-width: 768px) {
  .oh-qr-flow {
    flex-direction: row;
    align-items: flex-start;
    justify-content: center;
  }
  .oh-qr-flow__arrow {
    transform: none;
    margin-top: 32px;
  }
}

/* ---------- FAQ ---------- */

.oh-about-faq {
  max-width: 760px;
}

/* ---------- Final CTA: an integrated dark panel ---------- */

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
  background: radial-gradient(circle, rgba(var(--v-theme-secondary), 0.32), transparent 70%);
  z-index: 0;
}

.oh-cta-panel__mark,
.oh-cta-panel__text,
.oh-cta-panel__actions {
  position: relative;
  z-index: 1;
}

.oh-cta-panel__message {
  color: rgba(255, 255, 255, 0.85);
  max-width: 46ch;
}

.oh-cta-panel__actions {
  display: flex;
  flex-direction: column;
  gap: var(--oh-space-sm);
}

.oh-cta-panel__secondary {
  color: #fff !important;
  border-color: rgba(255, 255, 255, 0.5) !important;
}

@media (min-width: 600px) {
  .oh-cta-panel__actions {
    flex-direction: row;
  }
}

@media (min-width: 768px) {
  .oh-cta-panel {
    flex-direction: row;
    text-align: left;
    padding: var(--oh-space-xl) var(--oh-space-2xl);
  }
  .oh-cta-panel__text { flex: 1 1 auto; }
  .oh-cta-panel__actions { flex-shrink: 0; }
}
</style>
