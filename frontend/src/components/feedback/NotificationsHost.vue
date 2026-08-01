<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNotificationsStore } from '@/stores/notifications.store'

const { t } = useI18n()
const notificationsStore = useNotificationsStore()
const current = computed(() => notificationsStore.notifications.at(-1) ?? null)
</script>

<template>
  <VSnackbar
    v-if="current"
    :model-value="true"
    :timeout="current.timeout"
    :color="current.type"
    location="bottom right"
    @update:model-value="notificationsStore.dismiss(current.id)"
  >
    {{ current.message }}

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
