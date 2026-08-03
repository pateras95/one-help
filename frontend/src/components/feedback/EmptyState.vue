<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  message: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: 'mdi-inbox-outline'
  },
  // Gives "no data yet" / "no search results" / "access restricted"
  // visually distinct treatments instead of one identical icon-badge
  // everywhere — same structure, different accent per context.
  tone: {
    type: String,
    default: 'neutral',
    validator: (value) => ['neutral', 'search', 'restricted'].includes(value)
  }
})

const { t } = useI18n()
const resolvedTitle = computed(() => props.title || t('common.feedback.emptyTitle'))

const toneColor = computed(() => ({ neutral: 'primary', search: 'secondary', restricted: 'warning' })[props.tone])
</script>

<template>
  <div class="oh-empty-state oh-reveal d-flex flex-column align-center justify-center text-center pa-8">
    <div class="oh-icon-well oh-icon-well--xl oh-empty-state__icon-wrap mb-4" :class="`oh-empty-state__icon-wrap--${tone}`">
      <VIcon :icon="icon" size="40" :color="toneColor" aria-hidden="true" />
    </div>
    <p class="text-h6 font-weight-bold mb-1">{{ resolvedTitle }}</p>
    <p v-if="message" class="text-body-2 text-textSecondary oh-empty-state__message">{{ message }}</p>
    <div v-if="$slots.default" class="mt-4">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.oh-empty-state__icon-wrap {
  background: rgb(var(--v-theme-surfaceVariant));
}

.oh-empty-state__icon-wrap--search {
  background: rgba(var(--v-theme-secondary), 0.1);
}

.oh-empty-state__icon-wrap--restricted {
  background: rgba(var(--v-theme-warning), 0.12);
}

.oh-empty-state__message {
  max-width: 40ch;
}
</style>
