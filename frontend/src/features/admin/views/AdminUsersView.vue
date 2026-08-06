<script setup>
import { computed, onMounted, ref, watch } from 'vue'
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
import { getOrganizations } from '@/features/admin/services/organizations.service'
import { localizeField } from '@/features/organizer/utils/localizeField'
import { ROLES } from '@/constants/roles'
import { ROUTES } from '@/constants/routes'
import SignalStatusBadge from '@/components/common/SignalStatusBadge.vue'
import AdminNavTabs from '../components/AdminNavTabs.vue'
import AdminStatusChip from '../components/AdminStatusChip.vue'
import AdminConfirmDialog from '../components/AdminConfirmDialog.vue'
import { useAdminUsersStore } from '../stores/adminUsers.store'
import { ACCOUNT_STATUS } from '../utils/accountStatus'
import { adminErrorKey } from '../utils/adminErrors'

const { t, locale } = useI18n()
const route = useRoute()
const usersStore = useAdminUsersStore()
const notificationsStore = useNotificationsStore()
const authStore = useAuthStore()

const organizationsByUserId = ref({})

/**
 * Real pagination (docs/backend-discovery/api-users-and-roles.md) means only the
 * organizers on the *current page* need their organization looked up — re-run
 * whenever the page's own user list changes (a new page, a new search/filter, or a
 * profile edit), not just once at mount.
 *
 * There is no admin endpoint to look up "the organization owned by user X" directly
 * (docs/backend-discovery/api-organizations.md) — only a full admin organization list
 * and a lookup by the organization's own id. A page of up to 100 organizations (the
 * backend's own page-size cap) is fetched and matched against this page's organizer
 * ids client-side; this cross-feature convenience link was already display-only in
 * the mock it replaces, so an occasional miss beyond the first 100 organizations is
 * an acceptable, documented limitation rather than a new page/endpoint.
 */
async function loadOrganizations() {
  const organizerIds = new Set(usersStore.users.filter((user) => user.role === ROLES.ORGANIZER).map((user) => user.id))
  if (organizerIds.size === 0) {
    organizationsByUserId.value = {}
    return
  }
  const result = await getOrganizations({ size: 100 })
  organizationsByUserId.value = Object.fromEntries(
    result.content.filter((org) => organizerIds.has(org.organizerUserId)).map((org) => [org.organizerUserId, org])
  )
}

watch(() => usersStore.users, loadOrganizations)

onMounted(async () => {
  // Seeds the store's own filter state directly (no debounce, no duplicate request)
  // when a search term arrives via the URL — the debounced `setSearch` path is only
  // for the user actually typing, below.
  if (typeof route.query.q === 'string' && route.query.q) {
    usersStore.search = route.query.q
  }
  await usersStore.fetchUsers()
})

const searchQuery = ref(typeof route.query.q === 'string' ? route.query.q : '')
watch(searchQuery, (value) => usersStore.setSearch(value))

const roleFilter = ref('')
watch(roleFilter, (value) => usersStore.setRole(value))

const statusFilter = ref('')
watch(statusFilter, (value) => usersStore.setStatus(value))

const roleFilterOptions = computed(() => [
  { title: t('admin.users.filters.allRoles'), value: '' },
  { title: t('auth.roles.volunteer'), value: ROLES.VOLUNTEER },
  { title: t('auth.roles.organizer'), value: ROLES.ORGANIZER },
  { title: t('auth.roles.administrator'), value: ROLES.ADMINISTRATOR }
])

const statusFilterOptions = computed(() => [
  { title: t('admin.users.filters.allStatuses'), value: '' },
  { title: t('admin.accountStatus.active'), value: ACCOUNT_STATUS.ACTIVE },
  { title: t('admin.accountStatus.suspended'), value: ACCOUNT_STATUS.SUSPENDED }
])

const currentPageDisplay = computed(() => usersStore.page + 1)
function goToPage(pageDisplay) {
  usersStore.setPage(pageDisplay - 1)
}

const viewDialog = ref({ open: false, user: null })
const confirmDialog = ref({ open: false, user: null, action: null, loading: false })
const editDialog = ref({ open: false, user: null, saving: false })
const editForm = ref({ firstName: '', lastName: '', email: '' })
const editErrors = ref({})

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

function organizationFor(user) {
  return organizationsByUserId.value[user.id] ?? null
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

function openEdit(user) {
  editForm.value = { firstName: user.firstName, lastName: user.lastName, email: user.email }
  editErrors.value = {}
  editDialog.value = { open: true, user, saving: false }
}

function closeEdit() {
  editDialog.value = { ...editDialog.value, open: false }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateEdit() {
  const errors = {}
  if (!editForm.value.firstName.trim()) errors.firstName = t('admin.users.editDialog.validation.required')
  if (!editForm.value.lastName.trim()) errors.lastName = t('admin.users.editDialog.validation.required')
  if (!editForm.value.email.trim() || !EMAIL_PATTERN.test(editForm.value.email.trim())) {
    errors.email = t('admin.users.editDialog.validation.invalidEmail')
  }
  editErrors.value = errors
  return Object.keys(errors).length === 0
}

async function handleEditSave() {
  if (!validateEdit()) return
  editDialog.value = { ...editDialog.value, saving: true }
  try {
    await usersStore.updateUserProfile(editDialog.value.user.id, {
      firstName: editForm.value.firstName.trim(),
      lastName: editForm.value.lastName.trim(),
      email: editForm.value.email.trim()
    })
    notificationsStore.notify(t('admin.users.notifications.editSuccess'), { type: 'success' })
    closeEdit()
  } catch (err) {
    notificationsStore.notify(t(adminErrorKey(err.message)), { type: 'error' })
    editDialog.value = { ...editDialog.value, saving: false }
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
    <OHPageHeader eyebrow="OneHelp" :title="t('admin.users.pageTitle')" :subtitle="t('admin.users.subtitle')" />
    <AdminNavTabs />

    <div class="d-flex flex-wrap ga-3 mb-2">
      <VTextField
        v-model="searchQuery"
        class="flex-grow-1"
        style="min-width: 220px"
        :label="t('admin.users.search.label')"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        density="comfortable"
        clearable
        hide-details
      />
      <VSelect
        v-model="roleFilter"
        style="min-width: 180px"
        :label="t('admin.users.filters.roleLabel')"
        :items="roleFilterOptions"
        variant="outlined"
        density="comfortable"
        hide-details
      />
      <VSelect
        v-model="statusFilter"
        style="min-width: 180px"
        :label="t('admin.users.filters.statusLabel')"
        :items="statusFilterOptions"
        variant="outlined"
        density="comfortable"
        hide-details
      />
    </div>
    <p v-if="!usersStore.loading && !usersStore.error" class="text-caption text-textSecondary mb-4">
      {{ t('admin.users.search.resultCount', { count: usersStore.totalElements }) }}
    </p>

    <LoadingState v-if="usersStore.loading" :label="t('admin.common.loading')" />

    <ErrorState
      v-else-if="usersStore.error"
      :title="t('admin.common.errorTitle')"
      :message="t('admin.common.errorMessage')"
      @retry="usersStore.fetchUsers"
    />

    <EmptyState
      v-else-if="usersStore.users.length === 0 && !searchQuery && !roleFilter && !statusFilter"
      :title="t('admin.users.emptyTitle')"
      :message="t('admin.users.emptyMessage')"
      icon="mdi-account-multiple-outline"
    />

    <EmptyState
      v-else-if="usersStore.users.length === 0"
      :title="t('admin.users.search.noResultsTitle')"
      :message="t('admin.users.search.noResultsMessage')"
      icon="mdi-magnify"
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

                  <template v-if="user.role === ROLES.ORGANIZER">
                    <div v-if="organizationFor(user)" class="d-flex flex-wrap align-center ga-2 mt-1">
                      <VChip size="small" variant="tonal" prepend-icon="mdi-domain">
                        {{ localizeField(organizationFor(user).name, locale) }}
                      </VChip>
                      <OHButton
                        size="small"
                        variant="text"
                        :to="{ path: ROUTES.ADMIN_ORGANIZATIONS, query: { q: localizeField(organizationFor(user).name, locale) } }"
                      >
                        {{ t('admin.users.viewOrganizationLink') }}
                      </OHButton>
                      <OHButton
                        size="small"
                        variant="text"
                        :to="{ path: ROUTES.ADMIN_ACTIONS, query: { q: `${user.firstName} ${user.lastName}` } }"
                      >
                        {{ t('admin.users.viewActionsLink') }}
                      </OHButton>
                    </div>
                    <VAlert v-else type="warning" variant="tonal" density="compact" class="mt-2">
                      {{ t('admin.users.integrityWarningNoOrganization') }}
                    </VAlert>
                  </template>
                </div>
              </div>

              <div class="d-flex flex-column align-end ga-2">
                <div class="d-flex flex-wrap ga-2 justify-end">
                  <SignalStatusBadge size="small" color="textSecondary" :label="t(`auth.roles.${user.role}`)" />
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
                  <VBtn
                    icon="mdi-pencil-outline"
                    size="small"
                    variant="text"
                    :aria-label="`${t('admin.users.editAction')} — ${user.firstName} ${user.lastName}`"
                    @click="openEdit(user)"
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

    <div v-if="usersStore.totalPages > 1" class="d-flex justify-center mt-4">
      <VPagination
        :model-value="currentPageDisplay"
        :length="usersStore.totalPages"
        :total-visible="7"
        density="comfortable"
        @update:model-value="goToPage"
      />
    </div>

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

    <VDialog :model-value="editDialog.open" max-width="480" @update:model-value="closeEdit">
      <VCard v-if="editDialog.user">
        <VCardTitle>{{ t('admin.users.editDialog.title') }}</VCardTitle>
        <VCardText>
          <VTextField
            v-model="editForm.firstName"
            class="mb-2"
            :label="t('admin.users.editDialog.firstNameLabel')"
            variant="outlined"
            :error-messages="editErrors.firstName"
          />
          <VTextField
            v-model="editForm.lastName"
            class="mb-2"
            :label="t('admin.users.editDialog.lastNameLabel')"
            variant="outlined"
            :error-messages="editErrors.lastName"
          />
          <VTextField
            v-model="editForm.email"
            type="email"
            :label="t('admin.users.editDialog.emailLabel')"
            variant="outlined"
            :error-messages="editErrors.email"
          />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" :disabled="editDialog.saving" @click="closeEdit">{{ t('admin.common.cancel') }}</VBtn>
          <VBtn color="primary" :loading="editDialog.saving" :disabled="editDialog.saving" @click="handleEditSave">
            {{ t('admin.users.editDialog.saveAction') }}
          </VBtn>
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
