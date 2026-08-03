<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import OHPageHeader from '@/components/common/OHPageHeader.vue'
import OHCard from '@/components/common/OHCard.vue'
import OHButton from '@/components/common/OHButton.vue'
import LoadingState from '@/components/feedback/LoadingState.vue'
import ErrorState from '@/components/feedback/ErrorState.vue'
import EmptyState from '@/components/feedback/EmptyState.vue'
import { useNotificationsStore } from '@/stores/notifications.store'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { localizeField } from '@/features/organizer/utils/localizeField'
import { getAllUsers } from '@/features/auth/services/auth.service'
import { getOrganizerActions } from '@/features/organizer/services/organizerActions.service'
import { isActionPubliclyVisible } from '@/features/actions/utils/actionVisibility'
import { matchesSearchQuery } from '@/utils/normalizeSearchText'
import { getOrganizationType } from '@/constants/organizationTypes'
import { demoteOrganizerToVolunteer } from '@/features/organizerApplication/services/organizerDemotion.service'
import OrganizerDemotionConfirmDialog from '@/features/organizerApplication/components/OrganizerDemotionConfirmDialog.vue'
import OrganizationApplicationForm from '@/features/organizerApplication/components/OrganizationApplicationForm.vue'
import { applicationErrorKey } from '@/features/organizerApplication/utils/applicationErrors'
import AdminNavTabs from '../components/AdminNavTabs.vue'
import AdminStatusChip from '../components/AdminStatusChip.vue'
import AdminConfirmDialog from '../components/AdminConfirmDialog.vue'
import { useAdminOrganizationsStore } from '../stores/adminOrganizations.store'
import { ORGANIZATION_STATUS } from '../utils/organizationStatus'
import { adminErrorKey } from '../utils/adminErrors'

const { t, locale } = useI18n()
const route = useRoute()
const authStore = useAuthStore()
const organizationsStore = useAdminOrganizationsStore()
const notificationsStore = useNotificationsStore()

const usersById = ref({})
const actionCountsByOrganizerId = ref({})

async function loadJoins() {
  const users = await getAllUsers()
  usersById.value = Object.fromEntries(users.map((user) => [user.id, user]))

  const entries = await Promise.all(
    organizationsStore.organizations.map(async (org) => {
      const actions = await getOrganizerActions(org.organizerUserId)
      const publicCount = actions.filter(isActionPubliclyVisible).length
      return [org.organizerUserId, { total: actions.length, public: publicCount, hidden: actions.length - publicCount }]
    })
  )
  actionCountsByOrganizerId.value = Object.fromEntries(entries)
}

onMounted(async () => {
  await organizationsStore.fetchOrganizations()
  await loadJoins()
})

const searchQuery = ref(typeof route.query.q === 'string' ? route.query.q : '')

const viewDialog = ref({ open: false, organization: null })
const actionDialog = ref({ open: false, organization: null, action: null, loading: false })
const editDialog = ref({ open: false, organization: null, saving: false })
const demotionDialog = ref({ open: false, organization: null, loading: false })

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
function organizerUser(org) {
  return usersById.value[org.organizerUserId] ?? null
}
function organizerName(org) {
  const user = organizerUser(org)
  return user ? `${user.firstName} ${user.lastName}` : ''
}
// Seeded organizations may reference an `organizerUserId` with no
// matching registered mock account (fictional demo data, never meant to
// resolve to a real user) — a neutral translated fallback beats
// rendering empty parentheses, and never invents an identity.
function ownerDisplay(org) {
  const user = organizerUser(org)
  return user ? `${user.firstName} ${user.lastName} (${user.email})` : t('admin.organizations.noLinkedOwner')
}
function hasResolvedOwner(org) {
  return Boolean(organizerUser(org))
}
function counts(org) {
  return actionCountsByOrganizerId.value[org.organizerUserId] ?? { total: 0, public: 0, hidden: 0 }
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

const filteredOrganizations = computed(() => {
  return organizationsStore.organizations.filter((org) => {
    const type = getOrganizationType(org.organizationType)
    return matchesSearchQuery(searchQuery.value, [
      name(org),
      organizerName(org),
      organizerUser(org)?.email ?? '',
      type ? t(type.labelKey) : '',
      org.municipality ?? '',
      t(`admin.organizationStatus.${org.status}`)
    ])
  })
})

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
    await loadJoins()
  } catch (err) {
    notificationsStore.notify(t(adminErrorKey(err.message)), { type: 'error' })
    closeAction()
  }
}

function openEdit(org) {
  editDialog.value = { open: true, organization: org, saving: false }
}
function closeEdit() {
  editDialog.value = { ...editDialog.value, open: false }
}

async function handleEditSave(payload) {
  editDialog.value = { ...editDialog.value, saving: true }
  try {
    await organizationsStore.updateOrganizationDetails(editDialog.value.organization.id, payload)
    notificationsStore.notify(t('admin.organizations.notifications.editSuccess', { name: payload.name }), { type: 'success' })
    closeEdit()
  } catch (err) {
    notificationsStore.notify(t(applicationErrorKey(err.message)), { type: 'error' })
    editDialog.value = { ...editDialog.value, saving: false }
  }
}

function openDemotion(org) {
  demotionDialog.value = { open: true, organization: org, loading: false }
}

async function handleDemote() {
  const org = demotionDialog.value.organization
  demotionDialog.value = { ...demotionDialog.value, loading: true }
  try {
    await demoteOrganizerToVolunteer(org.organizerUserId, authStore.currentUser.id)
    notificationsStore.notify(t('admin.organizations.notifications.removeSuccess', { name: name(org) }), { type: 'success' })
    demotionDialog.value = { open: false, organization: null, loading: false }
    organizationsStore.remove(org.id)
    await loadJoins()
  } catch (err) {
    notificationsStore.notify(t(applicationErrorKey(err.message)), { type: 'error' })
    demotionDialog.value = { ...demotionDialog.value, loading: false }
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

const editInitialApplication = computed(() => editDialog.value.organization)
const editSaveLabel = computed(() => t('admin.organizations.editDialog.saveAction'))
</script>

<template>
  <DefaultLayout>
    <OHPageHeader eyebrow="OneHelp" :title="t('admin.organizations.pageTitle')" :subtitle="t('admin.organizations.subtitle')" />
    <AdminNavTabs />

    <VTextField
      v-model="searchQuery"
      class="mb-2"
      :label="t('admin.organizations.search.label')"
      prepend-inner-icon="mdi-magnify"
      variant="outlined"
      density="comfortable"
      clearable
      hide-details
    />
    <p v-if="!organizationsStore.loading && !organizationsStore.error" class="text-caption text-textSecondary mb-4">
      {{ t('admin.organizations.search.resultCount', { count: filteredOrganizations.length }) }}
    </p>

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

    <EmptyState
      v-else-if="filteredOrganizations.length === 0"
      :title="t('admin.organizations.search.noResultsTitle')"
      :message="t('admin.organizations.search.noResultsMessage')"
      icon="mdi-magnify"
    />

    <VRow v-else>
      <VCol v-for="org in filteredOrganizations" :key="org.id" cols="12" sm="6" md="4">
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
          <p class="text-caption mb-1" :class="hasResolvedOwner(org) ? 'text-textSecondary' : 'text-warning'">
            <VIcon v-if="!hasResolvedOwner(org)" icon="mdi-alert-circle-outline" size="14" class="mr-1" aria-hidden="true" />
            {{ t('admin.organizations.ownerLabel') }}: {{ ownerDisplay(org) }}
          </p>
          <p class="text-caption text-textSecondary mb-3">
            {{ t('admin.organizations.actionCounts', { total: counts(org).total, public: counts(org).public, hidden: counts(org).hidden }) }}
          </p>

          <div class="d-flex flex-wrap ga-2 mt-auto">
            <OHButton size="small" variant="text" prepend-icon="mdi-eye-outline" @click="openView(org)">
              {{ t('admin.common.view') }}
            </OHButton>
            <OHButton size="small" variant="text" prepend-icon="mdi-pencil-outline" @click="openEdit(org)">
              {{ t('admin.common.edit') }}
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
            <OHButton size="small" variant="text" color="error" prepend-icon="mdi-delete-outline" @click="openDemotion(org)">
              {{ t('admin.organizations.removeOrganizerAction') }}
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

    <VDialog :model-value="editDialog.open" max-width="720" scrollable @update:model-value="closeEdit">
      <VCard v-if="editDialog.organization">
        <VCardTitle>{{ t('admin.organizations.editDialog.title', { name: name(editDialog.organization) }) }}</VCardTitle>
        <VCardText>
          <OrganizationApplicationForm
            :initial-application="editInitialApplication"
            :submitting="editDialog.saving"
            :submit-label="editSaveLabel"
            @submit="handleEditSave"
          />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" :disabled="editDialog.saving" @click="closeEdit">{{ t('admin.common.cancel') }}</VBtn>
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

    <OrganizerDemotionConfirmDialog
      v-model="demotionDialog.open"
      :organization-name="demotionDialog.organization ? name(demotionDialog.organization) : ''"
      :loading="demotionDialog.loading"
      @confirm="handleDemote"
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
