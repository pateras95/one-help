<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNotificationsStore } from '@/stores/notifications.store'

const { t } = useI18n()
const notificationsStore = useNotificationsStore()
const current = computed(() => notificationsStore.notifications.at(-1) ?? null)

const ICON_BY_TYPE = {
  success: 'mdi-check-circle-outline',
  error: 'mdi-alert-circle-outline',
  warning: 'mdi-alert-outline',
  info: 'mdi-information-outline'
}
</script>

<template>
  <VSnackbar
    v-if="current"
    :model-value="true"
    :timeout="current.timeout"
    :color="current.type"
    location="bottom right"
    class="oh-notification"
    @update:model-value="notificationsStore.dismiss(current.id)"
  >
    <div class="d-flex align-center ga-2">
      <VIcon :icon="ICON_BY_TYPE[current.type] ?? 'mdi-information-outline'" aria-hidden="true" />
      <span>{{ current.message }}</span>
    </div>

    <template #actions>
      <VBtn
        variant="text"
        icon="mdi-close"
        :aria-label="t('common.notifications.close')"
        @click="notificationsStore.dismiss(current.id)"
      />
    </template>
  </VSnackbar>
</template>

<style scoped>
.oh-notification :deep(.v-snackbar__wrapper) {
  border-radius: var(--oh-radius-md);
}
</style>

