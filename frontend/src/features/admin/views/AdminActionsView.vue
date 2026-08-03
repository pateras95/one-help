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
import { localizeField } from '@/features/organizer/utils/localizeField'
import { getActionCategory } from '@/constants/actionCategories'
import { actionDetailsPath } from '@/constants/routes'
import { getAllUsers } from '@/features/auth/services/auth.service'
import { getLocalConfirmedCount } from '@/features/participation/utils/participationCount'
import { matchesSearchQuery } from '@/utils/normalizeSearchText'
import OrganizerActionForm from '@/features/organizer/components/OrganizerActionForm.vue'
import { organizerActionErrorKey } from '@/features/organizer/utils/organizerActionErrors'
import AdminNavTabs from '../components/AdminNavTabs.vue'
import AdminStatusChip from '../components/AdminStatusChip.vue'
import AdminConfirmDialog from '../components/AdminConfirmDialog.vue'
import { useAdminActionsStore } from '../stores/adminActions.store'
import { ACTION_MODERATION_STATUS } from '../utils/actionModerationStatus'
import { adminErrorKey } from '../utils/adminErrors'

const { t, locale } = useI18n()
const route = useRoute()
const actionsStore = useAdminActionsStore()
const notificationsStore = useNotificationsStore()

const usersById = ref({})

onMounted(async () => {
  const users = await getAllUsers()
  usersById.value = Object.fromEntries(users.map((user) => [user.id, user]))
  await actionsStore.fetchActions()
})

const searchQuery = ref(typeof route.query.q === 'string' ? route.query.q : '')

const viewDialog = ref({ open: false, action: null })
const actionDialog = ref({ open: false, action: null, decision: null, loading: false })
const editDialog = ref({ open: false, action: null, saving: false })

const MODERATION_CHIP = {
  [ACTION_MODERATION_STATUS.PENDING_REVIEW]: { color: 'warning', icon: 'mdi-clock-outline' },
  [ACTION_MODERATION_STATUS.APPROVED]: { color: 'success', icon: 'mdi-check-decagram-outline' },
  [ACTION_MODERATION_STATUS.REJECTED]: { color: 'error', icon: 'mdi-close-circle-outline' },
  [ACTION_MODERATION_STATUS.HIDDEN]: { color: 'error', icon: 'mdi-eye-off-outline' }
}

function title(action) {
  return localizeField(action.title, locale.value)
}
function organizationName(action) {
  return action.organizationName ? localizeField(action.organizationName, locale.value) : ''
}
function organizerName(action) {
  const user = usersById.value[action.organizerId]
  return user ? `${user.firstName} ${user.lastName}` : ''
}

function formatDate(isoString) {
  const formatter = new Intl.DateTimeFormat(locale.value === 'en' ? 'en-GB' : 'el-GR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
  return formatter.format(new Date(isoString))
}

const filteredActions = computed(() => {
  return actionsStore.actions.filter((action) => {
    const category = getActionCategory(action.categoryId)
    return matchesSearchQuery(searchQuery.value, [
      title(action),
      organizationName(action),
      organizerName(action),
      category ? t(category.labelKey) : '',
      localizeField(action.municipality, locale.value),
      localizeField(action.locationName, locale.value),
      t(`organizer.status.${action.organizerStatus}`),
      t(`admin.moderationStatus.${action.moderationStatus}`)
    ])
  })
})

function openView(action) {
  viewDialog.value = { open: true, action }
}

function openAction(action, decision) {
  actionDialog.value = { open: true, action, decision, loading: false }
}
function closeAction() {
  actionDialog.value = { ...actionDialog.value, open: false }
}

async function handleConfirm(reason) {
  const { action, decision } = actionDialog.value
  actionDialog.value = { ...actionDialog.value, loading: true }
  try {
    if (decision === 'approve') {
      await actionsStore.approveAction(action.id)
      notificationsStore.notify(t('admin.actions.notifications.approveSuccess', { title: title(action) }), { type: 'success' })
    } else if (decision === 'reject') {
      await actionsStore.rejectAction(action.id, reason)
      notificationsStore.notify(t('admin.actions.notifications.rejectSuccess', { title: title(action) }), { type: 'success' })
    } else if (decision === 'hide') {
      await actionsStore.hideAction(action.id)
      notificationsStore.notify(t('admin.actions.notifications.hideSuccess', { title: title(action) }), { type: 'success' })
    } else if (decision === 'restore') {
      await actionsStore.restoreAction(action.id)
      notificationsStore.notify(t('admin.actions.notifications.restoreSuccess', { title: title(action) }), { type: 'success' })
    }
    closeAction()
  } catch (err) {
    notificationsStore.notify(t(adminErrorKey(err.message)), { type: 'error' })
    closeAction()
  }
}

function openEdit(action) {
  editDialog.value = { open: true, action, saving: false }
}
function closeEdit() {
  editDialog.value = { ...editDialog.value, open: false }
}

const editMinCapacity = computed(() => {
  if (!editDialog.value.action) return 0
  return editDialog.value.action.registeredCount + getLocalConfirmedCount(editDialog.value.action.id)
})

async function handleEditSave(payload) {
  editDialog.value = { ...editDialog.value, saving: true }
  try {
    await actionsStore.updateActionDetails(editDialog.value.action.id, payload)
    notificationsStore.notify(t('admin.actions.notifications.editSuccess'), { type: 'success' })
    closeEdit()
  } catch (err) {
    notificationsStore.notify(t(organizerActionErrorKey(err.message)), { type: 'error' })
    editDialog.value = { ...editDialog.value, saving: false }
  }
}

const decisionCopy = {
  approve: { titleKey: 'admin.actions.approveDialog.title', messageKey: 'admin.actions.approveDialog.message', color: 'success' },
  reject: { titleKey: 'admin.actions.rejectDialog.title', messageKey: 'admin.actions.rejectDialog.message', color: 'error' },
  hide: { titleKey: 'admin.actions.hideDialog.title', messageKey: 'admin.actions.hideDialog.message', color: 'error' },
  restore: { titleKey: 'admin.actions.restoreDialog.title', messageKey: 'admin.actions.restoreDialog.message', color: 'success' }
}

const confirmTitle = computed(() => (actionDialog.value.decision ? t(decisionCopy[actionDialog.value.decision].titleKey) : ''))
const confirmMessage = computed(() => {
  if (!actionDialog.value.decision || !actionDialog.value.action) return ''
  return t(decisionCopy[actionDialog.value.decision].messageKey, { title: title(actionDialog.value.action) })
})
const confirmColor = computed(() => (actionDialog.value.decision ? decisionCopy[actionDialog.value.decision].color : 'primary'))
const confirmLabel = computed(() => (actionDialog.value.decision ? t(`admin.actions.actions.${actionDialog.value.decision}`) : ''))
</script>

<template>
  <DefaultLayout>
    <OHPageHeader :title="t('admin.actions.pageTitle')" :subtitle="t('admin.actions.subtitle')" />
    <AdminNavTabs />

    <VTextField
      v-model="searchQuery"
      class="mb-2"
      :label="t('admin.actions.search.label')"
      prepend-inner-icon="mdi-magnify"
      variant="outlined"
      density="comfortable"
      clearable
      hide-details
    />
    <p v-if="!actionsStore.loading && !actionsStore.error" class="text-caption text-textSecondary mb-4">
      {{ t('admin.actions.search.resultCount', { count: filteredActions.length }) }}
    </p>

    <LoadingState v-if="actionsStore.loading" :label="t('admin.common.loading')" />

    <ErrorState
      v-else-if="actionsStore.error"
      :title="t('admin.common.errorTitle')"
      :message="t('admin.common.errorMessage')"
      @retry="actionsStore.fetchActions"
    />

    <EmptyState
      v-else-if="actionsStore.actions.length === 0"
      :title="t('admin.actions.emptyTitle')"
      :message="t('admin.actions.emptyMessage')"
      icon="mdi-clipboard-text-outline"
    />

    <EmptyState
      v-else-if="filteredActions.length === 0"
      :title="t('admin.actions.search.noResultsTitle')"
      :message="t('admin.actions.search.noResultsMessage')"
      icon="mdi-magnify"
    />

    <VRow v-else>
      <VCol v-for="action in filteredActions" :key="action.id" cols="12" sm="6" md="4">
        <OHCard class="pa-4 h-100 d-flex flex-column">
          <div class="d-flex flex-wrap align-center ga-2 mb-2">
            <VChip v-if="getActionCategory(action.categoryId)" size="small" variant="tonal" :prepend-icon="getActionCategory(action.categoryId).icon">
              {{ t(getActionCategory(action.categoryId).labelKey) }}
            </VChip>
            <VChip size="small" variant="tonal">{{ t(`organizer.status.${action.organizerStatus}`) }}</VChip>
          </div>
          <AdminStatusChip
            class="mb-2 align-self-start"
            :label="t(`admin.moderationStatus.${action.moderationStatus}`)"
            :icon="MODERATION_CHIP[action.moderationStatus].icon"
            :color="MODERATION_CHIP[action.moderationStatus].color"
          />
          <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ title(action) }}</h3>
          <p class="text-body-2 text-textSecondary mb-1">{{ organizationName(action) }}</p>
          <p class="text-caption text-textSecondary mb-1">{{ organizerName(action) }}</p>
          <p class="text-caption text-textSecondary mb-3">{{ formatDate(action.date) }}</p>

          <div class="d-flex flex-wrap ga-2 mt-auto">
            <OHButton size="small" variant="text" prepend-icon="mdi-eye-outline" @click="openView(action)">
              {{ t('admin.common.view') }}
            </OHButton>
            <OHButton size="small" variant="text" prepend-icon="mdi-pencil-outline" @click="openEdit(action)">
              {{ t('admin.common.edit') }}
            </OHButton>
            <OHButton
              v-if="action.moderationStatus === ACTION_MODERATION_STATUS.PENDING_REVIEW"
              size="small"
              variant="tonal"
              color="success"
              @click="openAction(action, 'approve')"
            >
              {{ t('admin.actions.actions.approve') }}
            </OHButton>
            <OHButton
              v-if="action.moderationStatus === ACTION_MODERATION_STATUS.PENDING_REVIEW"
              size="small"
              variant="tonal"
              color="error"
              @click="openAction(action, 'reject')"
            >
              {{ t('admin.actions.actions.reject') }}
            </OHButton>
            <OHButton
              v-if="action.moderationStatus === ACTION_MODERATION_STATUS.APPROVED"
              size="small"
              variant="tonal"
              color="error"
              @click="openAction(action, 'hide')"
            >
              {{ t('admin.actions.actions.hide') }}
            </OHButton>
            <OHButton
              v-if="action.moderationStatus === ACTION_MODERATION_STATUS.HIDDEN"
              size="small"
              variant="tonal"
              color="success"
              @click="openAction(action, 'restore')"
            >
              {{ t('admin.actions.actions.restore') }}
            </OHButton>
          </div>
        </OHCard>
      </VCol>
    </VRow>

    <VDialog :model-value="viewDialog.open" max-width="520" @update:model-value="viewDialog.open = false">
      <VCard v-if="viewDialog.action">
        <VCardTitle>{{ title(viewDialog.action) }}</VCardTitle>
        <VCardText>
          <p class="text-body-2 mb-3">{{ localizeField(viewDialog.action.description, locale) }}</p>
          <p class="text-body-2 mb-1">
            <strong>{{ t('admin.actions.viewDialog.organizerStatusLabel') }}:</strong> {{ t(`organizer.status.${viewDialog.action.organizerStatus}`) }}
          </p>
          <p class="text-body-2 mb-1">
            <strong>{{ t('admin.actions.viewDialog.moderationStatusLabel') }}:</strong> {{ t(`admin.moderationStatus.${viewDialog.action.moderationStatus}`) }}
          </p>
          <p class="text-body-2 mb-1">
            <strong>{{ t('admin.actions.viewDialog.organizationLabel') }}:</strong> {{ organizationName(viewDialog.action) }}
          </p>
          <p class="text-body-2 mb-1">
            <strong>{{ t('admin.actions.viewDialog.organizerLabel') }}:</strong> {{ organizerName(viewDialog.action) }}
          </p>
          <p v-if="viewDialog.action.moderationReason" class="text-body-2 mb-1">
            <strong>{{ t('admin.actions.viewDialog.moderationReasonLabel') }}:</strong> {{ viewDialog.action.moderationReason }}
          </p>
          <OHButton
            class="mt-2"
            variant="text"
            size="small"
            prepend-icon="mdi-open-in-new"
            :to="actionDetailsPath(viewDialog.action.id)"
          >
            {{ t('admin.actions.viewDialog.openPublicPage') }}
          </OHButton>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="viewDialog.open = false">{{ t('admin.common.close') }}</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog :model-value="editDialog.open" max-width="900" scrollable @update:model-value="closeEdit">
      <VCard v-if="editDialog.action">
        <VCardTitle>{{ t('admin.actions.editDialog.title', { title: title(editDialog.action) }) }}</VCardTitle>
        <VCardText>
          <OrganizerActionForm
            :initial-action="editDialog.action"
            :min-capacity="editMinCapacity"
            :submitting="editDialog.saving"
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
      :reason-label="actionDialog.decision === 'reject' ? t('admin.actions.rejectDialog.reasonLabel') : ''"
      :reason-required="actionDialog.decision === 'reject'"
      @confirm="handleConfirm"
    />
  </DefaultLayout>
</template>
