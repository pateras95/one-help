<script setup>
import BrandLogo from '@/components/common/BrandLogo.vue'
import SignalIllustration from '@/components/common/SignalIllustration.vue'

/**
 * The branded left-hand panel shared by Login and Register on tablet+
 * screens (and collapsed to a compact masthead on mobile via the
 * `compact` prop) — replaces the previous "logo above a centered white
 * card on a blank background" pattern with a deliberate brand moment,
 * without touching any auth logic, fields, or validation.
 */
defineProps({
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  compact: {
    type: Boolean,
    default: false
  }
})
</script>

<template>
  <div class="oh-auth-panel" :class="{ 'oh-auth-panel--compact': compact }">
    <div class="oh-auth-panel__glow" aria-hidden="true" />

    <template v-if="!compact">
      <BrandLogo variant="monochrome" :size="26" class="oh-auth-panel__logo oh-reveal" />
      <SignalIllustration tone="dark" class="oh-auth-panel__illustration oh-reveal mt-8" />
      <h2 class="oh-headline font-weight-bold text-white mt-6 mb-2 oh-reveal oh-reveal--delay-1">{{ title }}</h2>
      <p class="text-body-1 oh-auth-panel__message oh-reveal oh-reveal--delay-2">{{ message }}</p>
    </template>

    <template v-else>
      <BrandLogo variant="monochrome" :size="28" class="oh-auth-panel__compact-logo" />
      <span class="text-body-2 oh-auth-panel__compact-message">{{ title }}</span>
    </template>
  </div>
</template>

<style scoped>
.oh-auth-panel {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  background: var(--oh-gradient-operational);
  color: #fff;
  padding: var(--oh-space-2xl) var(--oh-space-xl);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  height: 100%;
}

.oh-auth-panel__glow {
  position: absolute;
  inset: -20% -30% auto auto;
  width: 60%;
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(232, 92, 63, 0.35), transparent 70%);
  z-index: 0;
}

.oh-auth-panel__illustration {
  max-width: 260px;
}

.oh-auth-panel__message {
  max-width: 38ch;
  color: rgba(255, 255, 255, 0.86);
}

.oh-auth-panel--compact {
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: var(--oh-space-md);
  color: #fff;
}

.oh-auth-panel__compact-message {
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
}
</style>
