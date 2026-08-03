<script setup>
import BrandLogo from '@/components/common/BrandLogo.vue'

/**
 * The shared decorative "Signal" moment — dashed relay-arc rings around
 * the brand mark, with a few floating accent dots — reused at hero
 * scale (Home) and panel scale (Auth). Purely decorative (aria-hidden);
 * the surrounding page always carries the real textual content.
 */
defineProps({
  tone: {
    type: String,
    default: 'light',
    validator: (value) => ['light', 'dark'].includes(value)
  }
})
</script>

<template>
  <div class="oh-illustration" :class="`oh-illustration--${tone}`" aria-hidden="true">
    <span class="oh-illustration__ring oh-illustration__ring--1" />
    <span class="oh-illustration__ring oh-illustration__ring--2" />
    <div class="oh-illustration__stage">
      <BrandLogo variant="icon" :size="72" />
    </div>
    <span class="oh-illustration__dot oh-illustration__dot--a" />
    <span class="oh-illustration__dot oh-illustration__dot--b" />
    <span class="oh-illustration__dot oh-illustration__dot--c" />
  </div>
</template>

<style scoped>
.oh-illustration {
  position: relative;
  aspect-ratio: 1 / 1;
  width: 100%;
  max-width: 380px;
  margin-inline: auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.oh-illustration__stage {
  position: relative;
  z-index: 2;
  width: 42%;
  aspect-ratio: 1 / 1;
  border-radius: var(--oh-radius-squircle);
  background: rgb(var(--v-theme-surface));
  box-shadow: var(--oh-shadow-lg);
  display: flex;
  align-items: center;
  justify-content: center;
}

.oh-illustration--dark .oh-illustration__stage {
  background: rgba(255, 255, 255, 0.96);
}

.oh-illustration__ring {
  position: absolute;
  border-radius: 50%;
  border: 2px dashed rgba(19, 42, 77, 0.18);
}
.oh-illustration--dark .oh-illustration__ring {
  border-color: rgba(255, 255, 255, 0.28);
}

.oh-illustration__ring--1 { inset: 6%; animation: oh-illustration-spin 60s linear infinite; }
.oh-illustration__ring--2 { inset: 20%; border-style: dotted; animation: oh-illustration-spin 40s linear infinite reverse; }

.oh-illustration__dot {
  position: absolute;
  width: 15%;
  aspect-ratio: 1 / 1;
  border-radius: var(--oh-radius-squircle);
  z-index: 3;
  box-shadow: var(--oh-shadow-sm);
  animation: oh-illustration-float 4.5s ease-in-out infinite;
}

.oh-illustration__dot--a { top: 6%; right: 14%; background: rgb(var(--v-theme-categoryEnvironment)); animation-delay: 0s; }
.oh-illustration__dot--b { bottom: 12%; left: 8%; background: rgb(var(--v-theme-categoryAnimals)); animation-delay: 0.6s; }
.oh-illustration__dot--c { bottom: 4%; right: 24%; background: rgb(var(--v-theme-categoryHealth)); animation-delay: 1.2s; }

@keyframes oh-illustration-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes oh-illustration-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

@media (prefers-reduced-motion: reduce) {
  .oh-illustration__ring,
  .oh-illustration__dot {
    animation: none;
  }
}
</style>
