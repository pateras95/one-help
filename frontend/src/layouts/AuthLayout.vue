<script setup>
import SignalAuthPanel from '@/components/common/SignalAuthPanel.vue'

defineProps({
  panelTitle: {
    type: String,
    required: true
  },
  panelMessage: {
    type: String,
    required: true
  }
})
</script>

<template>
  <VApp>
    <VMain>
      <div class="oh-auth-shell">
        <aside class="oh-auth-shell__panel d-none d-md-flex">
          <SignalAuthPanel :title="panelTitle" :message="panelMessage" />
        </aside>

        <div class="oh-auth-shell__panel-compact d-md-none">
          <SignalAuthPanel compact :title="panelTitle" :message="panelMessage" />
        </div>

        <div class="oh-auth-shell__form">
          <div class="oh-auth-shell__form-inner oh-reveal">
            <slot />
          </div>
        </div>
      </div>
    </VMain>
  </VApp>
</template>

<style scoped>
.oh-auth-shell {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}

.oh-auth-shell__panel {
  flex: 0 0 auto;
}

.oh-auth-shell__form {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--oh-space-xl) var(--oh-space-md);
  background: rgb(var(--v-theme-background));
}

.oh-auth-shell__form-inner {
  width: 100%;
  max-width: 440px;
}

@media (min-width: 960px) {
  .oh-auth-shell {
    flex-direction: row;
  }

  .oh-auth-shell__panel {
    flex: 0 0 42%;
    max-width: 560px;
  }

  .oh-auth-shell__form {
    flex: 1 1 auto;
    padding: var(--oh-space-2xl);
  }
}
</style>
