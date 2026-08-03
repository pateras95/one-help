<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import OHPageHeader from '@/components/common/OHPageHeader.vue'
import OHCard from '@/components/common/OHCard.vue'
import OHButton from '@/components/common/OHButton.vue'
import LoadingState from '@/components/feedback/LoadingState.vue'
import ErrorState from '@/components/feedback/ErrorState.vue'
import EmptyState from '@/components/feedback/EmptyState.vue'
import { useNotificationsStore } from '@/stores/notifications.store'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import AdminNavTabs from '../components/AdminNavTabs.vue'
import AdminStatusChip from '../components/AdminStatusChip.vue'
import AdminConfirmDialog from '../components/AdminConfirmDialog.vue'
import { useAdminUsersStore } from '../stores/adminUsers.store'
import { ACCOUNT_STATUS } from '../utils/accountStatus'
import { adminErrorKey } from '../utils/adminErrors'

const { t, locale } = useI18n()
const usersStore = useAdminUsersStore()
const notificationsStore = useNotificationsStore()
const authStore = useAuthStore()

onMounted(usersStore.fetchUsers)

const viewDialog = ref({ open: false, user: null })
const confirmDialog = ref({ open: false, user: null, action: null, loading: false })

function isSelf(user) {
  return user.id === authStore.currentUser?.id
}

function statusChip(status) {
  return status === ACCOUNT_STATUS.SUSPENDED
    ? { color: 'error', icon: 'mdi-account-off-outline' }
    : { color: 'success', icon: 'mdi-account-check-outline' }
}

function formatDate(isoString) {
  const formatter = new Intl.DateTimeFormat(locale.value === 'en' ? 'en-GB' : 'el-GR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
  return formatter.format(new Date(isoString))
}

function openView(user) {
  viewDialog.value = { open: true, user }
}

function openConfirm(user, action) {
  confirmDialog.value = { open: true, user, action, loading: false }
}

function closeConfirm() {
  confirmDialog.value = { ...confirmDialog.value, open: false }
}

async function handleConfirm() {
  const { user, action } = confirmDialog.value
  confirmDialog.value = { ...confirmDialog.value, loading: true }
  try {
    if (action === 'suspend') {
      await usersStore.suspendUser(user.id)
      notificationsStore.notify(t('admin.users.notifications.suspendSuccess', { name: `${user.firstName} ${user.lastName}` }), { type: 'success' })
    } else {
      await usersStore.reactivateUser(user.id)
      notificationsStore.notify(t('admin.users.notifications.reactivateSuccess', { name: `${user.firstName} ${user.lastName}` }), { type: 'success' })
    }
    closeConfirm()
  } catch (err) {
    notificationsStore.notify(t(adminErrorKey(err.message)), { type: 'error' })
    closeConfirm()
  }
}

const confirmTitle = computed(() => {
  if (!confirmDialog.value.user) return ''
  return confirmDialog.value.action === 'suspend'
    ? t('admin.users.suspendDialog.title')
    : t('admin.users.reactivateDialog.title')
})
const confirmMessage = computed(() => {
  if (!confirmDialog.value.user) return ''
  const name = `${confirmDialog.value.user.firstName} ${confirmDialog.value.user.lastName}`
  return confirmDialog.value.action === 'suspend'
    ? t('admin.users.suspendDialog.message', { name })
    : t('admin.users.reactivateDialog.message', { name })
})
</script>

<template>
  <DefaultLayout>
    <OHPageHeader :title="t('admin.users.pageTitle')" :subtitle="t('admin.users.subtitle')" />
    <AdminNavTabs />

    <LoadingState v-if="usersStore.loading" :label="t('admin.common.loading')" />

    <ErrorState
      v-else-if="usersStore.error"
      :title="t('admin.common.errorTitle')"
      :message="t('admin.common.errorMessage')"
      @retry="usersStore.fetchUsers"
    />

    <EmptyState
      v-else-if="usersStore.users.length === 0"
      :title="t('admin.users.emptyTitle')"
      :message="t('admin.users.emptyMessage')"
      icon="mdi-account-multiple-outline"
    />

    <OHCard v-else class="pa-0">
      <VList :aria-label="t('admin.users.pageTitle')">
        <template v-for="(user, index) in usersStore.users" :key="user.id">
          <VDivider v-if="index > 0" />
          <VListItem>
            <div class="d-flex flex-wrap align-center justify-space-between ga-3 w-100 py-2">
              <div class="d-flex align-center ga-3">
                <VAvatar color="primary" size="36">
                  <span class="text-caption font-weight-bold" aria-hidden="true">{{ user.avatarInitials }}</span>
                </VAvatar>
                <div>
                  <p class="font-weight-bold mb-0">{{ user.firstName }} {{ user.lastName }}</p>
                  <p class="text-body-2 text-textSecondary mb-0">{{ user.email }}</p>
                  <p class="text-caption text-textSecondary mb-0">
                    {{ t('admin.users.registeredAt', { date: formatDate(user.createdAt) }) }}
                  </p>
                </div>
              </div>

              <div class="d-flex flex-column align-end ga-2">
                <div class="d-flex flex-wrap ga-2 justify-end">
                  <VChip size="small" variant="tonal">{{ t(`auth.roles.${user.role}`) }}</VChip>
                  <AdminStatusChip
                    :label="t(`admin.accountStatus.${user.status}`)"
                    :icon="statusChip(user.status).icon"
                    :color="statusChip(user.status).color"
                  />
                </div>
                <div class="d-flex ga-2">
                  <VBtn
                    icon="mdi-eye-outline"
                    size="small"
                    variant="text"
                    :aria-label="`${t('admin.common.view')} — ${user.firstName} ${user.lastName}`"
                    @click="openView(user)"
                  />
                  <OHButton
                    v-if="user.status === ACCOUNT_STATUS.SUSPENDED"
                    size="small"
                    variant="tonal"
                    color="success"
                    @click="openConfirm(user, 'reactivate')"
                  >
                    {{ t('admin.users.reactivateAction') }}
                  </OHButton>
                  <OHButton
                    v-else
                    size="small"
                    variant="tonal"
                    color="error"
                    :disabled="isSelf(user)"
                    :aria-label="isSelf(user) ? t('admin.users.cannotSuspendSelf') : `${t('admin.users.suspendAction')} — ${user.firstName} ${user.lastName}`"
                    @click="openConfirm(user, 'suspend')"
                  >
                    {{ t('admin.users.suspendAction') }}
                  </OHButton>
                </div>
                <p v-if="isSelf(user)" class="text-caption text-textSecondary mb-0">
                  {{ t('admin.users.cannotSuspendSelf') }}
                </p>
              </div>
            </div>
          </VListItem>
        </template>
      </VList>
    </OHCard>

    <VDialog :model-value="viewDialog.open" max-width="480" @update:model-value="viewDialog.open = false">
      <VCard v-if="viewDialog.user">
        <VCardTitle>{{ t('admin.users.viewDialog.title') }}</VCardTitle>
        <VCardText>
          <div class="d-flex align-center ga-3 mb-4">
            <VAvatar color="primary" size="48">
              <span class="text-subtitle-2 font-weight-bold" aria-hidden="true">{{ viewDialog.user.avatarInitials }}</span>
            </VAvatar>
            <div>
              <p class="font-weight-bold mb-0">{{ viewDialog.user.firstName }} {{ viewDialog.user.lastName }}</p>
              <p class="text-body-2 text-textSecondary mb-0">{{ viewDialog.user.email }}</p>
            </div>
          </div>
          <p class="text-body-2 mb-1">
            <strong>{{ t('admin.users.viewDialog.roleLabel') }}:</strong> {{ t(`auth.roles.${viewDialog.user.role}`) }}
          </p>
          <p class="text-body-2 mb-1">
            <strong>{{ t('admin.users.viewDialog.statusLabel') }}:</strong> {{ t(`admin.accountStatus.${viewDialog.user.status}`) }}
          </p>
          <p class="text-body-2 mb-0">
            <strong>{{ t('admin.users.viewDialog.registeredLabel') }}:</strong> {{ formatDate(viewDialog.user.createdAt) }}
          </p>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="viewDialog.open = false">{{ t('admin.common.close') }}</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <AdminConfirmDialog
      v-model="confirmDialog.open"
      :title="confirmTitle"
      :message="confirmMessage"
      :confirm-label="confirmDialog.action === 'suspend' ? t('admin.users.suspendAction') : t('admin.users.reactivateAction')"
      :confirm-color="confirmDialog.action === 'suspend' ? 'error' : 'success'"
      :loading="confirmDialog.loading"
      @confirm="handleConfirm"
    />
  </DefaultLayout>
</template>
