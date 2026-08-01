<script setup>
defineProps({
  title: {
    type: String,
    default: ''
  },
  subtitle: {
    type: String,
    default: ''
  },
  /**
   * Breaks the section out of the page's constrained width to span the
   * full viewport — for sections that need to feel expansive rather than
   * sitting inside the standard narrow content column.
   */
  fullBleed: {
    type: Boolean,
    default: false
  },
  /** Vuetify theme color name applied as the full-bleed background. */
  background: {
    type: String,
    default: ''
  }
})
</script>

<template>
  <section
    class="oh-section"
    :class="[
      fullBleed && 'oh-section--full-bleed',
      background && `bg-${background}`
    ]"
  >
    <div class="oh-section__inner" :class="fullBleed && 'oh-section__inner--wide'">
      <h2 v-if="title" class="oh-section-title font-weight-bold mb-1">{{ title }}</h2>
      <p v-if="subtitle" class="text-body-1 text-textSecondary mb-4">{{ subtitle }}</p>
      <slot />
    </div>
  </section>
</template>

<style scoped>
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
 * span the viewport edge-to-edge, while its content stays inside a wide
 * (not edge-to-edge) inner wrapper. This is the standard "full-bleed
 * section inside a centered container" technique, applied once here and
 * reused via the `fullBleed` prop rather than repeated per-component.
 */
.oh-section--full-bleed {
  margin-inline: calc(50% - 50vw);
  padding-inline: max(env(safe-area-inset-left), 16px) max(env(safe-area-inset-right), 16px);
  padding-block: var(--oh-space-xl);
}

.oh-section__inner--wide {
  max-width: 1400px;
  margin-inline: auto;
}
</style>
