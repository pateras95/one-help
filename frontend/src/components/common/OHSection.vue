<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  eyebrow: {
    type: String,
    default: ''
  },
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

// A one-time "reveal" as the section scrolls into view, rather than
// everything on the page animating in at once on load. Falls back to
// immediately visible if IntersectionObserver isn't available, so this
// can never leave content permanently hidden.
const sectionRef = ref(null)
const isVisible = ref(typeof IntersectionObserver === 'undefined')
let observer = null

onMounted(() => {
  if (isVisible.value || !sectionRef.value) return
  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        isVisible.value = true
        observer?.disconnect()
      }
    },
    { threshold: 0.15 }
  )
  observer.observe(sectionRef.value)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <section
    ref="sectionRef"
    class="oh-section"
    :class="[
      resolved.fullBleed && 'oh-section--full-bleed',
      resolved.background && `bg-${resolved.background}`,
      variant !== 'default' && `oh-section--${variant}`,
      isVisible && 'oh-section--visible'
    ]"
  >
    <div
      class="oh-section__inner"
      :class="[resolved.fullBleed && 'oh-container', center && 'text-center']"
    >
      <span v-if="eyebrow" class="oh-eyebrow mb-2 d-inline-flex">{{ eyebrow }}</span>
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
  position: relative;
  overflow: hidden;
  border-radius: var(--oh-radius-lg);
  padding: var(--oh-space-xl) var(--oh-space-lg);
  color: rgb(var(--v-theme-on-primary));
  background: var(--oh-gradient-brand);
}

/* A faint decorative circle, purely CSS — restrained enough to read as
   texture rather than a "flashy gradient" on top of a gradient. */
.oh-section--emphasis::after {
  content: '';
  position: absolute;
  width: 320px;
  height: 320px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  top: -120px;
  right: -80px;
  pointer-events: none;
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

.oh-section__inner {
  opacity: 0;
  transform: translateY(18px);
  transition: opacity var(--oh-transition-slow), transform var(--oh-transition-slow);
}

.oh-section--visible .oh-section__inner {
  opacity: 1;
  transform: none;
}

@media (prefers-reduced-motion: reduce) {
  .oh-section__inner {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
</style>
