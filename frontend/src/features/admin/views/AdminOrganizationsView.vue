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
import { localizeField } from '@/features/organizer/utils/localizeField'
import AdminNavTabs from '../components/AdminNavTabs.vue'
import AdminStatusChip from '../components/AdminStatusChip.vue'
import AdminConfirmDialog from '../components/AdminConfirmDialog.vue'
import { useAdminOrganizationsStore } from '../stores/adminOrganizations.store'
import { ORGANIZATION_STATUS } from '../utils/organizationStatus'
import { adminErrorKey } from '../utils/adminErrors'

const { t, locale } = useI18n()
const organizationsStore = useAdminOrganizationsStore()
const notificationsStore = useNotificationsStore()

onMounted(organizationsStore.fetchOrganizations)

const viewDialog = ref({ open: false, organization: null })
const actionDialog = ref({ open: false, organization: null, action: null, loading: false })

const STATUS_CHIP = {
  [ORGANIZATION_STATUS.PENDING]: { color: 'warning', icon: 'mdi-clock-outline' },
  [ORGANIZATION_STATUS.APPROVED]: { color: 'success', icon: 'mdi-check-decagram-outline' },
  [ORGANIZATION_STATUS.REJECTED]: { color: 'error', icon: 'mdi-close-circle-outline' },
  [ORGANIZATION_STATUS.SUSPENDED]: { color: 'error', icon: 'mdi-pause-circle-outline' }
}

function name(org) {
  return localizeField(org.name, locale.value)
}
function description(org) {
  return localizeField(org.description, locale.value)
}

function formatDate(isoString) {
  if (!isoString) return ''
  const formatter = new Intl.DateTimeFormat(locale.value === 'en' ? 'en-GB' : 'el-GR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
  return formatter.format(new Date(isoString))
}

function openView(org) {
  viewDialog.value = { open: true, organization: org }
}

function openAction(org, action) {
  actionDialog.value = { open: true, organization: org, action, loading: false }
}
function closeAction() {
  actionDialog.value = { ...actionDialog.value, open: false }
}

async function handleConfirm(reason) {
  const { organization, action } = actionDialog.value
  actionDialog.value = { ...actionDialog.value, loading: true }
  try {
    if (action === 'approve') {
      await organizationsStore.approveOrganization(organization.id)
      notificationsStore.notify(t('admin.organizations.notifications.approveSuccess', { name: name(organization) }), { type: 'success' })
    } else if (action === 'reject') {
      await organizationsStore.rejectOrganization(organization.id, reason)
      notificationsStore.notify(t('admin.organizations.notifications.rejectSuccess', { name: name(organization) }), { type: 'success' })
    } else if (action === 'suspend') {
      await organizationsStore.suspendOrganization(organization.id)
      notificationsStore.notify(t('admin.organizations.notifications.suspendSuccess', { name: name(organization) }), { type: 'success' })
    } else if (action === 'restore') {
      await organizationsStore.restoreOrganization(organization.id)
      notificationsStore.notify(t('admin.organizations.notifications.restoreSuccess', { name: name(organization) }), { type: 'success' })
    }
    closeAction()
  } catch (err) {
    notificationsStore.notify(t(adminErrorKey(err.message)), { type: 'error' })
    closeAction()
  }
}

const actionCopy = {
  approve: { titleKey: 'admin.organizations.approveDialog.title', messageKey: 'admin.organizations.approveDialog.message', color: 'success' },
  reject: { titleKey: 'admin.organizations.rejectDialog.title', messageKey: 'admin.organizations.rejectDialog.message', color: 'error' },
  suspend: { titleKey: 'admin.organizations.suspendDialog.title', messageKey: 'admin.organizations.suspendDialog.message', color: 'error' },
  restore: { titleKey: 'admin.organizations.restoreDialog.title', messageKey: 'admin.organizations.restoreDialog.message', color: 'success' }
}

const confirmTitle = computed(() => {
  if (!actionDialog.value.action) return ''
  return t(actionCopy[actionDialog.value.action].titleKey)
})
const confirmMessage = computed(() => {
  if (!actionDialog.value.action || !actionDialog.value.organization) return ''
  return t(actionCopy[actionDialog.value.action].messageKey, { name: name(actionDialog.value.organization) })
})
const confirmColor = computed(() => (actionDialog.value.action ? actionCopy[actionDialog.value.action].color : 'primary'))
const confirmLabel = computed(() => (actionDialog.value.action ? t(`admin.organizations.actions.${actionDialog.value.action}`) : ''))
</script>

<template>
  <DefaultLayout>
    <OHPageHeader :title="t('admin.organizations.pageTitle')" :subtitle="t('admin.organizations.subtitle')" />
    <AdminNavTabs />

    <LoadingState v-if="organizationsStore.loading" :label="t('admin.common.loading')" />

    <ErrorState
      v-else-if="organizationsStore.error"
      :title="t('admin.common.errorTitle')"
      :message="t('admin.common.errorMessage')"
      @retry="organizationsStore.fetchOrganizations"
    />

    <EmptyState
      v-else-if="organizationsStore.organizations.length === 0"
      :title="t('admin.organizations.emptyTitle')"
      :message="t('admin.organizations.emptyMessage')"
      icon="mdi-domain"
    />

    <VRow v-else>
      <VCol v-for="org in organizationsStore.organizations" :key="org.id" cols="12" sm="6" md="4">
        <OHCard class="pa-4 h-100 d-flex flex-column">
          <div class="d-flex align-center justify-space-between ga-2 mb-2">
            <AdminStatusChip
              :label="t(`admin.organizationStatus.${org.status}`)"
              :icon="STATUS_CHIP[org.status].icon"
              :color="STATUS_CHIP[org.status].color"
            />
          </div>
          <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ name(org) }}</h3>
          <p class="text-body-2 text-textSecondary oh-org-card__description mb-2">{{ description(org) }}</p>
          <p class="text-caption text-textSecondary mb-3">
            {{ t('admin.organizations.submittedAt', { date: formatDate(org.submittedAt) }) }}
          </p>

          <div class="d-flex flex-wrap ga-2 mt-auto">
            <OHButton size="small" variant="text" prepend-icon="mdi-eye-outline" @click="openView(org)">
              {{ t('admin.common.view') }}
            </OHButton>
            <OHButton
              v-if="org.status === ORGANIZATION_STATUS.PENDING"
              size="small"
              variant="tonal"
              color="success"
              @click="openAction(org, 'approve')"
            >
              {{ t('admin.organizations.actions.approve') }}
            </OHButton>
            <OHButton
              v-if="org.status === ORGANIZATION_STATUS.PENDING"
              size="small"
              variant="tonal"
              color="error"
              @click="openAction(org, 'reject')"
            >
              {{ t('admin.organizations.actions.reject') }}
            </OHButton>
            <OHButton
              v-if="org.status === ORGANIZATION_STATUS.APPROVED"
              size="small"
              variant="tonal"
              color="error"
              @click="openAction(org, 'suspend')"
            >
              {{ t('admin.organizations.actions.suspend') }}
            </OHButton>
            <OHButton
              v-if="org.status === ORGANIZATION_STATUS.SUSPENDED"
              size="small"
              variant="tonal"
              color="success"
              @click="openAction(org, 'restore')"
            >
              {{ t('admin.organizations.actions.restore') }}
            </OHButton>
          </div>
        </OHCard>
      </VCol>
    </VRow>

    <VDialog :model-value="viewDialog.open" max-width="520" @update:model-value="viewDialog.open = false">
      <VCard v-if="viewDialog.organization">
        <VCardTitle>{{ name(viewDialog.organization) }}</VCardTitle>
        <VCardText>
          <p class="text-body-2 mb-3">{{ description(viewDialog.organization) }}</p>
          <p class="text-body-2 mb-1">
            <strong>{{ t('admin.organizations.viewDialog.contactLabel') }}:</strong> {{ viewDialog.organization.contactEmail }}
          </p>
          <p class="text-body-2 mb-1">
            <strong>{{ t('admin.organizations.viewDialog.statusLabel') }}:</strong> {{ t(`admin.organizationStatus.${viewDialog.organization.status}`) }}
          </p>
          <p class="text-body-2 mb-1">
            <strong>{{ t('admin.organizations.viewDialog.submittedLabel') }}:</strong> {{ formatDate(viewDialog.organization.submittedAt) }}
          </p>
          <p v-if="viewDialog.organization.reviewedAt" class="text-body-2 mb-1">
            <strong>{{ t('admin.organizations.viewDialog.reviewedLabel') }}:</strong> {{ formatDate(viewDialog.organization.reviewedAt) }}
          </p>
          <p v-if="viewDialog.organization.rejectionReason" class="text-body-2 mb-0">
            <strong>{{ t('admin.organizations.viewDialog.rejectionReasonLabel') }}:</strong> {{ viewDialog.organization.rejectionReason }}
          </p>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="viewDialog.open = false">{{ t('admin.common.close') }}</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <AdminConfirmDialog
      v-model="actionDialog.open"
      :title="confirmTitle"
      :message="confirmMessage"
      :confirm-label="confirmLabel"
      :confirm-color="confirmColor"
      :loading="actionDialog.loading"
      :reason-label="actionDialog.action === 'reject' ? t('admin.organizations.rejectDialog.reasonLabel') : ''"
      :reason-required="actionDialog.action === 'reject'"
      @confirm="handleConfirm"
    />
  </DefaultLayout>
</template>

<style scoped>
.oh-org-card__description {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
