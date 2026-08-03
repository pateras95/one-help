<script setup>
import { computed } from 'vue'
import { branding } from '@/config/branding'

/**
 * The OneHelp "Signal" mark: two asymmetric wing-like forms leaning
 * toward a shared center, with a small spark between their tips — one
 * person's help reaching the next. Deliberately not a heart, not
 * literal hands, not a medical cross, not petals, not network nodes.
 *
 * variant:
 * - 'primary'     mark + wordmark, stacked — hero/auth-page usage
 * - 'horizontal'  mark + wordmark, side by side — header/footer usage
 * - 'icon'        mark only — compact/mobile/favicon-style contexts
 * - 'monochrome'  mark + wordmark, single currentColor — tinted/dark surfaces
 */
const props = defineProps({
  variant: {
    type: String,
    default: 'horizontal',
    validator: (value) => ['primary', 'horizontal', 'icon', 'monochrome'].includes(value)
  },
  size: {
    type: Number,
    default: 32
  },
  // Animates the handoff spark traveling between the two wing tips —
  // used only by LoadingState, so a page full of static logos never
  // has motion competing with it.
  animated: {
    type: Boolean,
    default: false
  }
})

const showWordmark = computed(() => props.variant !== 'icon')
const isStacked = computed(() => props.variant === 'primary')
const isMonochrome = computed(() => props.variant === 'monochrome')
</script>

<template>
  <span
    class="oh-brand-logo"
    :class="[`oh-brand-logo--${variant}`, isStacked && 'oh-brand-logo--stacked', animated && 'oh-brand-logo--animated']"
  >
    <svg
      class="oh-brand-logo__mark"
      :class="{ 'oh-brand-logo__mark--mono': isMonochrome }"
      :width="size"
      :height="size"
      viewBox="-60 -60 120 120"
      :role="showWordmark ? undefined : 'img'"
      :aria-hidden="showWordmark ? 'true' : undefined"
      :aria-label="showWordmark ? undefined : branding.appName"
    >
      <path
        class="oh-brand-logo__trail"
        d="M -46,40 Q 0,58 46,40"
        fill="none"
      />
      <path
        class="oh-brand-logo__wing oh-brand-logo__wing--1"
        d="M0,-2 C -17,-15 -17,-41 0,-49 C 17,-41 17,-15 0,-2 Z"
        transform="translate(-30,25) rotate(25)"
      />
      <path
        class="oh-brand-logo__wing oh-brand-logo__wing--2"
        d="M0,-2 C -17,-15 -17,-41 0,-49 C 17,-41 17,-15 0,-2 Z"
        transform="translate(30,25) rotate(-25)"
      />
      <g class="oh-brand-logo__spark-track">
        <circle class="oh-brand-logo__spark" cx="0" cy="-18" r="7" />
      </g>
    </svg>

    <span v-if="showWordmark" class="oh-brand-logo__wordmark">
      <span class="oh-brand-logo__wordmark-one">One</span><span class="oh-brand-logo__wordmark-help">Help</span>
    </span>
  </span>
</template>

<style scoped>
.oh-brand-logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: inherit;
}

.oh-brand-logo--stacked {
  flex-direction: column;
  gap: 12px;
  text-align: center;
}

.oh-brand-logo__mark {
  flex-shrink: 0;
  overflow: visible;
}

.oh-brand-logo__wing--1 { fill: rgb(var(--v-theme-primary)); }
.oh-brand-logo__wing--2 { fill: rgb(var(--v-theme-secondary)); }

.oh-brand-logo__trail {
  stroke: rgb(var(--v-theme-primary));
  stroke-width: 2;
  stroke-dasharray: 3 6;
  stroke-linecap: round;
  opacity: 0.22;
}

.oh-brand-logo__spark {
  fill: rgb(var(--v-theme-accent));
}

/* Monochrome: both wings + spark in one currentColor at layered
   opacities, so the handoff silhouette still reads on any single
   background without needing per-shape background-matched fills. */
.oh-brand-logo__mark--mono .oh-brand-logo__wing--1,
.oh-brand-logo__mark--mono .oh-brand-logo__wing--2,
.oh-brand-logo__mark--mono .oh-brand-logo__spark {
  fill: currentColor;
}
.oh-brand-logo__mark--mono .oh-brand-logo__wing--1 { opacity: 1; }
.oh-brand-logo__mark--mono .oh-brand-logo__wing--2 { opacity: 0.72; }
.oh-brand-logo__mark--mono .oh-brand-logo__spark { opacity: 0.55; }
.oh-brand-logo__mark--mono .oh-brand-logo__trail { stroke: currentColor; opacity: 0.18; }

.oh-brand-logo__wordmark {
  font-weight: 800;
  letter-spacing: -0.01em;
  line-height: 1;
  white-space: nowrap;
}

.oh-brand-logo__wordmark-one { color: rgb(var(--v-theme-primary)); }
.oh-brand-logo__wordmark-help { color: rgb(var(--v-theme-secondary)); }

.oh-brand-logo--monochrome .oh-brand-logo__wordmark-one,
.oh-brand-logo--monochrome .oh-brand-logo__wordmark-help {
  color: currentColor;
}

.oh-brand-logo--stacked .oh-brand-logo__wordmark {
  font-size: 1.6rem;
}

/* The handoff: the spark travels between the two wing tips in a loop —
   used only when `animated` (LoadingState), never a passive page-load pulse. */
.oh-brand-logo--animated .oh-brand-logo__spark-track {
  animation: oh-logo-handoff 1.6s ease-in-out infinite;
}

@keyframes oh-logo-handoff {
  0%, 100% { transform: translateX(-13px) translateY(2px); }
  50% { transform: translateX(13px) translateY(2px); }
}

@media (prefers-reduced-motion: reduce) {
  .oh-brand-logo--animated .oh-brand-logo__spark-track {
    animation: none;
  }
}
</style>
