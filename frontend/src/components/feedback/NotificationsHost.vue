<script setup>
import { computed } from 'vue'
import { useNotificationsStore } from '@/stores/notifications.store'

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
        aria-label="Κλείσιμο ειδοποίησης"
        @click="notificationsStore.dismiss(current.id)"
      />
    </template>
  </VSnackbar>
</template>
