<script setup>
import { computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { useNotificationsStore } from '@/stores/notifications.store'
import { useOrganizationApplicationStore } from '@/features/organizerApplication/stores/organizationApplication.store'
import { ORGANIZATION_STATUS } from '@/features/admin/utils/organizationStatus'
import { ROLES } from '@/constants/roles'
import { ROUTES } from '@/constants/routes'

// Compact mode swaps the named/avatar trigger for an icon-only button
// (mobile top bar) and trims the menu to the smaller set the mobile
// bottom navigation doesn't already cover (see the role-specific blocks
// below) — same menu logic/component, not a parallel one. Read directly
// in the template (no script-side usage needed).
defineProps({
  compact: {
    type: Boolean,
    default: false
  }
})

const { t } = useI18n()
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

// A volunteer's "Become an organizer" entry relabels itself to
// "Application status" once they have a pending or rejected
// application on file — same route, `BecomeOrganizerView.vue` renders
// the right state. Approved/suspended volunteers never occur (role
// becomes organizer on approval), so no extra label is needed there.
const organizerApplicationLabel = computed(() => {
  const status = organizationApplicationStore.application?.status
  if (status === ORGANIZATION_STATUS.PENDING || status === ORGANIZATION_STATUS.REJECTED) {
    return t('navigation.applicationStatus')
  }
  return t('navigation.becomeOrganizer')
})

function refreshApplicationState() {
  if (authStore.hasRole(ROLES.VOLUNTEER)) {
    organizationApplicationStore.fetchApplication()
  }
}

onMounted(refreshApplicationState)
watch(() => authStore.currentUser?.id, refreshApplicationState)

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
        v-if="compact"
        v-bind="menuProps"
        icon
        variant="tonal"
        color="primary"
        size="small"
        class="oh-account-menu__trigger--compact"
        :aria-label="`${t('navigation.accountMenuAriaLabel')}: ${fullName}, ${roleLabel}`"
      >
        <span class="text-caption font-weight-bold" aria-hidden="true">
          {{ authStore.currentUser.avatarInitials }}
        </span>
      </VBtn>
      <VBtn
        v-else
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

      <!-- Compact (mobile): trimmed to what the bottom nav doesn't already
           cover, in the order requested per role — Account leads for
           volunteers, Organizer area leads for organizers. -->
      <template v-if="compact">
        <template v-if="authStore.hasRole(ROLES.VOLUNTEER)">
          <VListItem :to="ROUTES.ACCOUNT" prepend-icon="mdi-account-outline" :title="t('navigation.account')" />
          <VListItem :to="ROUTES.CHECK_IN" prepend-icon="mdi-qrcode-scan" :title="t('navigation.checkIn')" />
          <VListItem :to="ROUTES.BECOME_ORGANIZER" prepend-icon="mdi-briefcase-plus-outline" :title="organizerApplicationLabel" />
        </template>
        <template v-else-if="authStore.hasRole(ROLES.ORGANIZER)">
          <VListItem :to="ROUTES.ORGANIZER" prepend-icon="mdi-briefcase-outline" :title="t('navigation.organizerArea')" />
          <VListItem :to="ROUTES.ORGANIZER_ORGANIZATION" prepend-icon="mdi-domain" :title="t('navigation.myOrganization')" />
          <VListItem :to="ROUTES.ACCOUNT" prepend-icon="mdi-account-outline" :title="t('navigation.account')" />
        </template>
      </template>

      <!-- Full (desktop) menu, ordered per role: volunteer leads with
           Account, organizer leads with their workspace links. -->
      <template v-else>
        <VListItem
          v-if="authStore.hasRole(ROLES.VOLUNTEER)"
          :to="ROUTES.ACCOUNT"
          prepend-icon="mdi-account-outline"
          :title="t('navigation.account')"
        />
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
          v-if="authStore.hasRole(ROLES.VOLUNTEER)"
          :to="ROUTES.BECOME_ORGANIZER"
          prepend-icon="mdi-briefcase-plus-outline"
          :title="organizerApplicationLabel"
        />
        <VListItem
          v-if="authStore.hasRole(ROLES.ORGANIZER)"
          :to="ROUTES.ORGANIZER"
          prepend-icon="mdi-briefcase-outline"
          :title="t('navigation.organizerArea')"
        />
        <VListItem
          v-if="authStore.hasRole(ROLES.ORGANIZER)"
          :to="ROUTES.ORGANIZER_ORGANIZATION"
          prepend-icon="mdi-domain"
          :title="t('navigation.myOrganization')"
        />
        <VListItem
          v-if="authStore.hasRole(ROLES.ORGANIZER)"
          :to="ROUTES.ORGANIZER_NEW_ACTION"
          prepend-icon="mdi-plus-circle-outline"
          :title="t('navigation.createAction')"
        />
        <VListItem
          v-if="authStore.hasRole(ROLES.ORGANIZER)"
          :to="ROUTES.ACCOUNT"
          prepend-icon="mdi-account-outline"
          :title="t('navigation.account')"
        />
        <VListItem
          v-if="authStore.hasRole(ROLES.ADMINISTRATOR)"
          :to="ROUTES.ADMIN"
          prepend-icon="mdi-shield-account-outline"
          :title="t('admin.navigation.dashboard')"
        />
        <VListItem
          v-if="authStore.hasRole(ROLES.ADMINISTRATOR)"
          :to="ROUTES.ACCOUNT"
          prepend-icon="mdi-account-outline"
          :title="t('navigation.account')"
        />
      </template>

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
