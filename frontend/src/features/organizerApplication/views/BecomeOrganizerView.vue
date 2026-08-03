<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import OHPageHeader from '@/components/common/OHPageHeader.vue'
import OHCard from '@/components/common/OHCard.vue'
import OHButton from '@/components/common/OHButton.vue'
import SignalStatusBadge from '@/components/common/SignalStatusBadge.vue'
import LoadingState from '@/components/feedback/LoadingState.vue'
import ErrorState from '@/components/feedback/ErrorState.vue'
import { useNotificationsStore } from '@/stores/notifications.store'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { ROLES } from '@/constants/roles'
import { ROUTES } from '@/constants/routes'
import { ORGANIZATION_STATUS } from '@/features/admin/utils/organizationStatus'
import { getOrganizationType } from '@/constants/organizationTypes'
import { getActionCategory } from '@/constants/actionCategories'
import { localizeField } from '@/features/organizer/utils/localizeField'
import { applicationErrorKey } from '../utils/applicationErrors'
import { useOrganizationApplicationStore } from '../stores/organizationApplication.store'
import OrganizationApplicationForm from '../components/OrganizationApplicationForm.vue'

const { t, locale } = useI18n()
const authStore = useAuthStore()
const notificationsStore = useNotificationsStore()
const applicationStore = useOrganizationApplicationStore()

const submitting = ref(false)
const showEditForm = ref(false)
const panelHeadingRef = ref(null)

async function load() {
  await applicationStore.fetchApplication()
  // If this visit reveals a just-approved application, sync the
  // reactive session role immediately so nav/guards update without
  // requiring a manual logout — see `auth.store.js`'s `refreshCurrentUser`.
  if (applicationStore.application?.status === ORGANIZATION_STATUS.APPROVED && !authStore.hasRole(ROLES.ORGANIZER)) {
    await authStore.refreshCurrentUser()
  }
  await focusPanelHeading()
}

onMounted(load)

async function focusPanelHeading() {
  await nextTick()
  panelHeadingRef.value?.focus()
}

function name(org) {
  return org ? localizeField(org.name, locale.value) : ''
}
function description(org) {
  return org ? localizeField(org.description, locale.value) : ''
}
function typeLabel(org) {
  const type = org ? getOrganizationType(org.organizationType) : null
  return type ? t(type.labelKey) : ''
}
function categoryLabels(org) {
  if (!org?.categories) return ''
  return org.categories
    .map((id) => getActionCategory(id))
    .filter(Boolean)
    .map((category) => t(category.labelKey))
    .join(', ')
}

function formatDate(isoString) {
  if (!isoString) return ''
  const formatter = new Intl.DateTimeFormat(locale.value === 'en' ? 'en-GB' : 'el-GR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
  return formatter.format(new Date(isoString))
}

async function handleSubmit(payload) {
  submitting.value = true
  try {
    await applicationStore.submit(payload)
    notificationsStore.notify(t('becomeOrganizer.notifications.submitSuccess'), { type: 'success' })
    await focusPanelHeading()
  } catch (err) {
    notificationsStore.notify(t(applicationErrorKey(err.message)), { type: 'error' })
  } finally {
    submitting.value = false
  }
}

async function handleUpdatePending(payload) {
  submitting.value = true
  try {
    await applicationStore.updatePending(applicationStore.application.id, payload)
    notificationsStore.notify(t('becomeOrganizer.notifications.updateSuccess'), { type: 'success' })
    showEditForm.value = false
    await focusPanelHeading()
  } catch (err) {
    notificationsStore.notify(t(applicationErrorKey(err.message)), { type: 'error' })
  } finally {
    submitting.value = false
  }
}

async function handleResubmit(payload) {
  submitting.value = true
  try {
    await applicationStore.resubmit(applicationStore.application.id, payload)
    notificationsStore.notify(t('becomeOrganizer.notifications.resubmitSuccess'), { type: 'success' })
    showEditForm.value = false
    await focusPanelHeading()
  } catch (err) {
    notificationsStore.notify(t(applicationErrorKey(err.message)), { type: 'error' })
  } finally {
    submitting.value = false
  }
}

// Editing/resubmitting are mutually exclusive with the read-only
// summary — collapse back to the summary whenever the application's
// own status changes (e.g. right after a successful resubmit).
watch(() => applicationStore.application?.status, () => {
  showEditForm.value = false
})

const statusColor = computed(() => {
  switch (applicationStore.application?.status) {
    case ORGANIZATION_STATUS.APPROVED:
      return 'success'
    case ORGANIZATION_STATUS.PENDING:
      return 'warning'
    case ORGANIZATION_STATUS.REJECTED:
    case ORGANIZATION_STATUS.SUSPENDED:
      return 'error'
    default:
      return 'textSecondary'
  }
})

const submitLabel = computed(() => t('becomeOrganizer.form.submitNew'))
const updateLabel = computed(() => t('becomeOrganizer.form.submitUpdate'))
const resubmitLabel = computed(() => t('becomeOrganizer.form.submitResubmit'))
</script>

<template>
  <DefaultLayout>
    <OHPageHeader eyebrow="OneHelp" :title="t('becomeOrganizer.pageTitle')" :subtitle="t('becomeOrganizer.subtitle')" />

    <LoadingState v-if="applicationStore.loading" :label="t('becomeOrganizer.loading')" />

    <ErrorState v-else-if="applicationStore.error" @retry="load" />

    <template v-else-if="!applicationStore.application">
      <OHCard class="pa-5" max-width="720">
        <h2 ref="panelHeadingRef" tabindex="-1" class="text-subtitle-1 font-weight-bold mb-3">
          {{ t('becomeOrganizer.form.introTitle') }}
        </h2>
        <p class="text-body-2 text-textSecondary mb-5">{{ t('becomeOrganizer.form.introMessage') }}</p>
        <OrganizationApplicationForm :submitting="submitting" :submit-label="submitLabel" @submit="handleSubmit" />
      </OHCard>
    </template>

    <template v-else-if="applicationStore.application.status === ORGANIZATION_STATUS.PENDING">
      <OHCard v-if="!showEditForm" class="pa-5" max-width="720">
        <div class="d-flex align-center flex-wrap ga-2 mb-2">
          <h2 ref="panelHeadingRef" tabindex="-1" class="text-subtitle-1 font-weight-bold mb-0">
            {{ t('becomeOrganizer.pending.title') }}
          </h2>
          <SignalStatusBadge :color="statusColor" :label="t(`admin.organizationStatus.${applicationStore.application.status}`)" />
        </div>
        <p class="text-body-2 text-textSecondary mb-4">{{ t('becomeOrganizer.pending.message') }}</p>

        <p class="text-caption text-textSecondary mb-4">
          {{ t('becomeOrganizer.pending.submittedAt', { date: formatDate(applicationStore.application.submittedAt) }) }}
        </p>

        <h3 class="text-subtitle-2 font-weight-bold mb-2">{{ t('becomeOrganizer.summary.title') }}</h3>
        <dl class="oh-application-summary mb-4">
          <dt class="text-caption text-textSecondary">{{ t('becomeOrganizer.form.nameLabel') }}</dt>
          <dd class="text-body-2 mb-2">{{ name(applicationStore.application) }}</dd>
          <dt class="text-caption text-textSecondary">{{ t('becomeOrganizer.form.typeLabel') }}</dt>
          <dd class="text-body-2 mb-2">{{ typeLabel(applicationStore.application) }}</dd>
          <dt class="text-caption text-textSecondary">{{ t('becomeOrganizer.form.descriptionLabel') }}</dt>
          <dd class="text-body-2 mb-2">{{ description(applicationStore.application) }}</dd>
          <dt class="text-caption text-textSecondary">{{ t('becomeOrganizer.form.categoriesLabel') }}</dt>
          <dd class="text-body-2 mb-0">{{ categoryLabels(applicationStore.application) }}</dd>
        </dl>

        <OHButton variant="outlined" @click="showEditForm = true">
          {{ t('becomeOrganizer.pending.editAction') }}
        </OHButton>
      </OHCard>

      <OHCard v-else class="pa-5" max-width="720">
        <div class="d-flex align-center justify-space-between mb-3">
          <h2 class="text-subtitle-1 font-weight-bold mb-0">{{ t('becomeOrganizer.pending.editTitle') }}</h2>
          <OHButton variant="text" size="small" @click="showEditForm = false">{{ t('becomeOrganizer.common.cancel') }}</OHButton>
        </div>
        <OrganizationApplicationForm
          :initial-application="applicationStore.application"
          :submitting="submitting"
          :submit-label="updateLabel"
          @submit="handleUpdatePending"
        />
      </OHCard>
    </template>

    <template v-else-if="applicationStore.application.status === ORGANIZATION_STATUS.APPROVED">
      <OHCard class="pa-5" max-width="720">
        <div class="d-flex align-center flex-wrap ga-2 mb-2">
          <h2 ref="panelHeadingRef" tabindex="-1" class="text-subtitle-1 font-weight-bold mb-0">
            {{ t('becomeOrganizer.approved.title') }}
          </h2>
          <SignalStatusBadge :color="statusColor" :label="t(`admin.organizationStatus.${applicationStore.application.status}`)" />
        </div>
        <p class="text-body-2 text-textSecondary mb-1">
          {{ t('becomeOrganizer.approved.message', { name: name(applicationStore.application) }) }}
        </p>
        <p class="text-caption text-textSecondary mb-4">{{ t('becomeOrganizer.approved.roleNote') }}</p>
        <OHButton color="primary" prepend-icon="mdi-briefcase-outline" :to="ROUTES.ORGANIZER">
          {{ t('becomeOrganizer.approved.dashboardCta') }}
        </OHButton>
      </OHCard>
    </template>

    <template v-else-if="applicationStore.application.status === ORGANIZATION_STATUS.REJECTED">
      <OHCard v-if="!showEditForm" class="pa-5" max-width="720">
        <div class="d-flex align-center flex-wrap ga-2 mb-2">
          <h2 ref="panelHeadingRef" tabindex="-1" class="text-subtitle-1 font-weight-bold mb-0">
            {{ t('becomeOrganizer.rejected.title') }}
          </h2>
          <SignalStatusBadge :color="statusColor" :label="t(`admin.organizationStatus.${applicationStore.application.status}`)" />
        </div>
        <p class="text-body-2 text-textSecondary mb-4">{{ t('becomeOrganizer.rejected.message') }}</p>

        <h3 class="text-subtitle-2 font-weight-bold mb-1">{{ t('becomeOrganizer.rejected.reasonLabel') }}</h3>
        <p class="text-body-2 mb-4">{{ applicationStore.application.rejectionReason }}</p>

        <h3 class="text-subtitle-2 font-weight-bold mb-2">{{ t('becomeOrganizer.summary.title') }}</h3>
        <dl class="oh-application-summary mb-4">
          <dt class="text-caption text-textSecondary">{{ t('becomeOrganizer.form.nameLabel') }}</dt>
          <dd class="text-body-2 mb-2">{{ name(applicationStore.application) }}</dd>
          <dt class="text-caption text-textSecondary">{{ t('becomeOrganizer.form.typeLabel') }}</dt>
          <dd class="text-body-2 mb-0">{{ typeLabel(applicationStore.application) }}</dd>
        </dl>

        <OHButton color="primary" variant="tonal" @click="showEditForm = true">
          {{ t('becomeOrganizer.rejected.resubmitAction') }}
        </OHButton>
      </OHCard>

      <OHCard v-else class="pa-5" max-width="720">
        <div class="d-flex align-center justify-space-between mb-3">
          <h2 class="text-subtitle-1 font-weight-bold mb-0">{{ t('becomeOrganizer.rejected.resubmitTitle') }}</h2>
          <OHButton variant="text" size="small" @click="showEditForm = false">{{ t('becomeOrganizer.common.cancel') }}</OHButton>
        </div>
        <OrganizationApplicationForm
          :initial-application="applicationStore.application"
          :submitting="submitting"
          :submit-label="resubmitLabel"
          @submit="handleResubmit"
        />
      </OHCard>
    </template>

    <template v-else-if="applicationStore.application.status === ORGANIZATION_STATUS.SUSPENDED">
      <OHCard class="pa-5" max-width="720">
        <div class="d-flex align-center flex-wrap ga-2 mb-2">
          <h2 ref="panelHeadingRef" tabindex="-1" class="text-subtitle-1 font-weight-bold mb-0">
            {{ t('becomeOrganizer.suspended.title') }}
          </h2>
          <SignalStatusBadge :color="statusColor" :label="t(`admin.organizationStatus.${applicationStore.application.status}`)" />
        </div>
        <p class="text-body-2 text-textSecondary mb-1">
          {{ t('becomeOrganizer.suspended.message', { name: name(applicationStore.application) }) }}
        </p>
        <p class="text-caption text-textSecondary mb-0">{{ t('becomeOrganizer.suspended.note') }}</p>
      </OHCard>
    </template>
  </DefaultLayout>
</template>

<style scoped>
.oh-application-summary dt {
  font-weight: 600;
}
</style>
