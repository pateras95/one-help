<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import OHPageHeader from '@/components/common/OHPageHeader.vue'
import OHCard from '@/components/common/OHCard.vue'
import OHButton from '@/components/common/OHButton.vue'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { useNotificationsStore } from '@/stores/notifications.store'
import { ROUTES } from '@/constants/routes'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const notificationsStore = useNotificationsStore()

const fullName = computed(() => {
  const user = authStore.currentUser
  return user ? `${user.firstName} ${user.lastName}` : ''
})
const roleLabel = computed(() => {
  const role = authStore.currentUser?.role
  return role ? t(`auth.roles.${role}`) : ''
})

async function handleLogout() {
  await authStore.logout()
  notificationsStore.notify(t('auth.notifications.logoutSuccess'), { type: 'info' })
  router.push(ROUTES.HOME)
}
</script>

<template>
  <DefaultLayout>
    <OHPageHeader :title="t('navigation.account')" />

    <OHCard v-if="authStore.currentUser" class="pa-6" max-width="480">
      <div class="d-flex align-center ga-4 mb-5">
        <VAvatar size="56" color="primary">
          <span class="text-h6 font-weight-bold">{{ authStore.currentUser.avatarInitials }}</span>
        </VAvatar>
        <div>
          <p class="text-subtitle-1 font-weight-bold mb-0">{{ fullName }}</p>
          <VChip size="small" color="primary" variant="tonal">{{ roleLabel }}</VChip>
        </div>
      </div>

      <div class="d-flex flex-column ga-1 mb-6">
        <span class="text-caption text-textSecondary">{{ t('auth.account.emailLabel') }}</span>
        <span class="text-body-2">{{ authStore.currentUser.email }}</span>
      </div>

      <OHButton
        color="primary"
        variant="outlined"
        prepend-icon="mdi-logout"
        @click="handleLogout"
      >
        {{ t('auth.account.logout') }}
      </OHButton>
    </OHCard>
  </DefaultLayout>
</template>
