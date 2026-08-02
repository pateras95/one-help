<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { useNotificationsStore } from '@/stores/notifications.store'
import { ROLES } from '@/constants/roles'
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
  <VMenu v-if="authStore.currentUser">
    <template #activator="{ props: menuProps }">
      <VBtn
        v-bind="menuProps"
        variant="tonal"
        color="primary"
        class="oh-account-menu__trigger text-none"
        :aria-label="`${t('navigation.accountMenuAriaLabel')}: ${fullName}, ${roleLabel}`"
      >
        <VAvatar size="28" color="primary" class="mr-2">
          <span class="text-caption font-weight-bold" aria-hidden="true">
            {{ authStore.currentUser.avatarInitials }}
          </span>
        </VAvatar>
        <span class="oh-account-menu__name">{{ fullName }}</span>
        <VIcon icon="mdi-chevron-down" size="16" class="ml-1" aria-hidden="true" />
      </VBtn>
    </template>

    <VList density="compact" min-width="220" :aria-label="t('navigation.accountMenuAriaLabel')">
      <VListItem :title="fullName" :subtitle="roleLabel" />

      <VDivider class="my-1" />

      <VListItem
        v-if="authStore.hasRole(ROLES.VOLUNTEER)"
        :to="ROUTES.MY_ACTIONS"
        prepend-icon="mdi-hand-heart-outline"
        :title="t('navigation.myActions')"
      />
      <VListItem
        v-if="authStore.hasRole(ROLES.VOLUNTEER)"
        :to="ROUTES.CHECK_IN"
        prepend-icon="mdi-qrcode-scan"
        :title="t('navigation.checkIn')"
      />
      <VListItem
        v-if="authStore.hasRole(ROLES.ORGANIZER)"
        :to="ROUTES.ORGANIZER"
        prepend-icon="mdi-briefcase-outline"
        :title="t('navigation.organizerArea')"
      />
      <VListItem
        v-if="authStore.hasRole(ROLES.ORGANIZER)"
        :to="ROUTES.ORGANIZER_NEW_ACTION"
        prepend-icon="mdi-plus-circle-outline"
        :title="t('navigation.createAction')"
      />

      <VDivider class="my-1" />

      <VListItem
        prepend-icon="mdi-logout"
        :title="t('navigation.logout')"
        @click="handleLogout"
      />
    </VList>
  </VMenu>
</template>

<style scoped>
.oh-account-menu__name {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
