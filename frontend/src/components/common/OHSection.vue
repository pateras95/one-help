<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  subtitle: {
    type: String,
    default: ''
  },
  /** Centers the heading/subtitle (and any text content in the default slot). */
  center: {
    type: Boolean,
    default: false
  },
  /**
   * Breaks the section out of the page's constrained width to span the
   * full viewport — for sections that need to feel expansive rather than
   * sitting inside the standard narrow content column. Ignored when
   * `variant` is set to anything other than 'default'.
   */
  fullBleed: {
    type: Boolean,
    default: false
  },
  /**
   * Vuetify theme color name applied as the full-bleed background.
   * Ignored when `variant` is set to anything other than 'default'.
   */
  background: {
    type: String,
    default: ''
  },
  /**
   * Semantic surface preset, so pages don't need to hand-assemble the
   * same background/fullBleed/padding combinations repeatedly:
   * - default: no background change, uses `fullBleed`/`background` as passed
   * - muted: a very subtle full-bleed wash using the app's base background
   * - tinted: a clearly branded full-bleed wash (surfaceVariant)
   * - emphasis: a strong, wide (not full-bleed) branded panel with a
   *   restrained primary→secondary gradient and light text — for a
   *   section that should read as the page's visual conclusion
   */
  variant: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'muted', 'tinted', 'emphasis'].includes(value)
  }
})

const VARIANT_PRESETS = {
  muted: { fullBleed: true, background: 'background' },
  tinted: { fullBleed: true, background: 'surfaceVariant' },
  emphasis: { fullBleed: false, background: '' }
}

const resolved = computed(() => {
  if (props.variant === 'default') {
    return { fullBleed: props.fullBleed, background: props.background }
  }
  return VARIANT_PRESETS[props.variant]
})
</script>

<template>
  <section
    class="oh-section"
    :class="[
      resolved.fullBleed && 'oh-section--full-bleed',
      resolved.background && `bg-${resolved.background}`,
      variant !== 'default' && `oh-section--${variant}`
    ]"
  >
    <div
      class="oh-section__inner"
      :class="[resolved.fullBleed && 'oh-container', center && 'text-center']"
    >
      <h2 v-if="title" class="oh-section-title font-weight-bold mb-1">{{ title }}</h2>
      <p
        v-if="subtitle"
        class="text-body-1 mb-4"
        :class="variant === 'emphasis' ? 'oh-section__subtitle' : 'text-textSecondary'"
      >
        {{ subtitle }}
      </p>
      <slot />
    </div>
  </section>
</template>

<style scoped>
.oh-section {
  padding-block: var(--oh-space-lg);
}

.oh-section + .oh-section {
  margin-top: var(--oh-space-xl);
}

@media (min-width: 960px) {
  .oh-section + .oh-section {
    margin-top: var(--oh-space-2xl);
  }
}

/*
 * Full-bleed section: breaks out of PageContainer's constrained width to
 * span the viewport edge-to-edge. Its content stays inside the shared
 * `.oh-container` (added to `.oh-section__inner` above) — the exact same
 * max-width/gutter recipe used by the header, page content and footer,
 * so a full-bleed section's heading/content align to the same column as
 * everything else on the page. This is the standard "full-bleed section
 * inside a centered container" technique, applied once here and reused
 * via the `fullBleed` prop rather than repeated per-component.
 */
.oh-section--full-bleed {
  margin-inline: calc(50% - 50vw);
  padding-block: var(--oh-space-xl);
}

@media (min-width: 960px) {
  .oh-section--full-bleed {
    padding-block: var(--oh-space-2xl);
  }
}

/*
 * Emphasis: a wide (not full-bleed) branded panel — visible rounded
 * corners and a restrained gradient rather than a flat, edge-to-edge
 * wash, so it reads as a deliberate "closing" panel rather than another
 * full-width background section.
 */
.oh-section--emphasis {
  border-radius: var(--oh-radius-lg);
  padding: var(--oh-space-xl) var(--oh-space-lg);
  color: rgb(var(--v-theme-on-primary));
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)) 0%, rgb(var(--v-theme-secondary)) 100%);
}

@media (min-width: 960px) {
  .oh-section--emphasis {
    padding: var(--oh-space-2xl);
  }

  .oh-section--emphasis .oh-section-title {
    font-size: var(--oh-text-page-title);
  }
}

.oh-section__subtitle {
  color: rgb(var(--v-theme-on-primary));
  opacity: 0.92;
}
</style>
