<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import OHPageHeader from '@/components/common/OHPageHeader.vue'
import EmptyState from '@/components/feedback/EmptyState.vue'
import { useAuthStore } from '@/features/auth/stores/auth.store'

const { t } = useI18n()
const authStore = useAuthStore()

const fullName = computed(() => {
  const user = authStore.currentUser
  return user ? `${user.firstName} ${user.lastName}` : ''
})
const roleLabel = computed(() => {
  const role = authStore.currentUser?.role
  return role ? t(`auth.roles.${role}`) : ''
})
</script>

<template>
  <DefaultLayout>
    <OHPageHeader :title="t('navigation.myActions')" />

    <EmptyState
      :title="t('auth.placeholder.comingSoon')"
      icon="mdi-hand-heart-outline"
    >
      <p class="text-body-2 text-textSecondary mt-2 mb-0">
        {{ t('auth.placeholder.signedInAs', { name: fullName }) }}
      </p>
      <p class="text-body-2 text-textSecondary mb-0">
        {{ t('auth.placeholder.roleLine', { role: roleLabel }) }}
      </p>
    </EmptyState>
  </DefaultLayout>
</template>
