<script setup>
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import OHPageHeader from '@/components/common/OHPageHeader.vue'
import OHCard from '@/components/common/OHCard.vue'
import OHButton from '@/components/common/OHButton.vue'
import SignalStatusBadge from '@/components/common/SignalStatusBadge.vue'
import LoadingState from '@/components/feedback/LoadingState.vue'
import ErrorState from '@/components/feedback/ErrorState.vue'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { useNotificationsStore } from '@/stores/notifications.store'
import { useOrganizationApplicationStore } from '@/features/organizerApplication/stores/organizationApplication.store'
import { ORGANIZATION_STATUS } from '@/features/admin/utils/organizationStatus'
import { localizeField } from '@/features/organizer/utils/localizeField'
import { ROLES } from '@/constants/roles'
import { ROUTES } from '@/constants/routes'

const { t, locale } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const notificationsStore = useNotificationsStore()
const organizationApplicationStore = useOrganizationApplicationStore()

const fullName = computed(() => {
  const user = authStore.currentUser
  return user ? `${user.firstName} ${user.lastName}` : ''
})
const roleLabel = computed(() => {
  const role = authStore.currentUser?.role
  return role ? t(`auth.roles.${role}`) : ''
})

// A lightweight summary only — the full application/organization detail
// lives at `/become-organizer` (`BecomeOrganizerView.vue`), this panel
// just tells the user which state they're in and links there.
const showOrganizationPanel = computed(() => !authStore.hasRole(ROLES.ADMINISTRATOR))
const organizationPanelState = computed(() => organizationApplicationStore.application?.status ?? 'none')
const organizationName = computed(() => localizeField(organizationApplicationStore.application?.name, locale.value))

onMounted(() => {
  if (showOrganizationPanel.value) {
    organizationApplicationStore.fetchApplication()
  }
})

async function handleLogout() {
  await authStore.logout()
  notificationsStore.notify(t('auth.notifications.logoutSuccess'), { type: 'info' })
  router.push(ROUTES.HOME)
}
</script>

<template>
  <DefaultLayout>
    <OHPageHeader eyebrow="OneHelp" :title="t('navigation.account')" />

    <OHCard v-if="authStore.currentUser" class="pa-6" max-width="480">
      <div class="d-flex align-center ga-4 mb-5">
        <VAvatar size="56" class="oh-account-avatar">
          <span class="text-h6 font-weight-bold">{{ authStore.currentUser.avatarInitials }}</span>
        </VAvatar>
        <div>
          <p class="text-subtitle-1 font-weight-bold mb-1">{{ fullName }}</p>
          <SignalStatusBadge color="primary" :label="roleLabel" />
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

    <OHCard v-if="showOrganizationPanel" class="pa-6 mt-4" max-width="480">
      <LoadingState v-if="organizationApplicationStore.loading" />

      <ErrorState
        v-else-if="organizationApplicationStore.error"
        @retry="organizationApplicationStore.fetchApplication"
      />

      <template v-else-if="organizationPanelState === 'none'">
        <h2 class="text-subtitle-2 font-weight-bold mb-2">{{ t('becomeOrganizer.account.introTitle') }}</h2>
        <p class="text-body-2 text-textSecondary mb-4">{{ t('becomeOrganizer.account.introMessage') }}</p>
        <OHButton color="primary" variant="tonal" :to="ROUTES.BECOME_ORGANIZER">
          {{ t('becomeOrganizer.account.introCta') }}
        </OHButton>
      </template>

      <template v-else-if="organizationPanelState === ORGANIZATION_STATUS.PENDING">
        <h2 class="text-subtitle-2 font-weight-bold mb-2">{{ t('becomeOrganizer.account.pendingTitle') }}</h2>
        <p class="text-body-2 text-textSecondary mb-4">{{ t('becomeOrganizer.account.pendingMessage') }}</p>
        <OHButton color="primary" variant="text" :to="ROUTES.BECOME_ORGANIZER">
          {{ t('becomeOrganizer.account.viewDetailsCta') }}
        </OHButton>
      </template>

      <template v-else-if="organizationPanelState === ORGANIZATION_STATUS.REJECTED">
        <h2 class="text-subtitle-2 font-weight-bold mb-2">{{ t('becomeOrganizer.account.rejectedTitle') }}</h2>
        <p class="text-body-2 text-textSecondary mb-4">{{ t('becomeOrganizer.account.rejectedMessage') }}</p>
        <OHButton color="primary" variant="tonal" :to="ROUTES.BECOME_ORGANIZER">
          {{ t('becomeOrganizer.account.viewDetailsCta') }}
        </OHButton>
      </template>

      <template v-else-if="organizationPanelState === ORGANIZATION_STATUS.APPROVED">
        <h2 class="text-subtitle-2 font-weight-bold mb-2">{{ t('becomeOrganizer.account.approvedTitle') }}</h2>
        <p class="text-body-2 text-textSecondary mb-4">
          {{ t('becomeOrganizer.account.approvedMessage', { name: organizationName }) }}
        </p>
        <OHButton color="primary" prepend-icon="mdi-briefcase-outline" :to="ROUTES.ORGANIZER">
          {{ t('becomeOrganizer.account.dashboardCta') }}
        </OHButton>
      </template>

      <template v-else-if="organizationPanelState === ORGANIZATION_STATUS.SUSPENDED">
        <h2 class="text-subtitle-2 font-weight-bold mb-2">{{ t('becomeOrganizer.account.suspendedTitle') }}</h2>
        <p class="text-body-2 text-textSecondary mb-0">{{ t('becomeOrganizer.account.suspendedMessage') }}</p>
      </template>
    </OHCard>
  </DefaultLayout>
</template>

<style scoped>
.oh-account-avatar {
  background: var(--oh-gradient-brand) !important;
  color: #fff !important;
}
</style>
