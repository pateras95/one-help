<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import OHPageHeader from '@/components/common/OHPageHeader.vue'
import OHCard from '@/components/common/OHCard.vue'
import OHButton from '@/components/common/OHButton.vue'
import LoadingState from '@/components/feedback/LoadingState.vue'
import { useNotificationsStore } from '@/stores/notifications.store'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { useOrganizationApplicationStore } from '@/features/organizerApplication/stores/organizationApplication.store'
import { demoteOrganizerToVolunteer } from '@/features/organizerApplication/services/organizerDemotion.service'
import OrganizationApplicationForm from '@/features/organizerApplication/components/OrganizationApplicationForm.vue'
import OrganizerDemotionConfirmDialog from '@/features/organizerApplication/components/OrganizerDemotionConfirmDialog.vue'
import { applicationErrorKey } from '@/features/organizerApplication/utils/applicationErrors'
import { ORGANIZATION_STATUS } from '@/features/admin/utils/organizationStatus'
import { localizeField } from '@/features/organizer/utils/localizeField'
import { ROUTES } from '@/constants/routes'

const { t, locale } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const notificationsStore = useNotificationsStore()
const applicationStore = useOrganizationApplicationStore()

const saving = ref(false)
const demoting = ref(false)
const showDemotionDialog = ref(false)

const organization = computed(() => applicationStore.application)
const isSuspended = computed(() => organization.value?.status === ORGANIZATION_STATUS.SUSPENDED)
const busy = computed(() => saving.value || demoting.value)

function name(org) {
  return org ? localizeField(org.name, locale.value) : ''
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

onMounted(async () => {
  await applicationStore.fetchApplication()
  const status = applicationStore.application?.status
  if (!applicationStore.application || status === ORGANIZATION_STATUS.PENDING || status === ORGANIZATION_STATUS.REJECTED) {
    router.replace(ROUTES.BECOME_ORGANIZER)
  }
})

async function handleSave(payload) {
  saving.value = true
  try {
    await applicationStore.updateProfile(payload)
    notificationsStore.notify(t('organizer.organization.notifications.saveSuccess'), { type: 'success' })
  } catch (err) {
    notificationsStore.notify(t(applicationErrorKey(err.message)), { type: 'error' })
  } finally {
    saving.value = false
  }
}

async function handleDemote() {
  demoting.value = true
  try {
    const result = await demoteOrganizerToVolunteer(authStore.currentUser.id, authStore.currentUser.id)
    showDemotionDialog.value = false
    await authStore.refreshCurrentUser()
    notificationsStore.notify(
      t('organizer.organization.notifications.demoteSuccess', { name: localizeField(result.organizationName, locale.value) }),
      { type: 'success' }
    )
    router.push(ROUTES.MY_ACTIONS)
  } catch (err) {
    notificationsStore.notify(t(applicationErrorKey(err.message)), { type: 'error' })
  } finally {
    demoting.value = false
  }
}

const saveLabel = computed(() => t('organizer.organization.saveButton'))
</script>

<template>
  <DefaultLayout>
    <OHPageHeader :title="t('organizer.organization.pageTitle')" :subtitle="t('organizer.organization.subtitle')" />

    <LoadingState v-if="applicationStore.loading" :label="t('organizer.organization.loading')" />

    <template v-else-if="organization">
      <OHCard class="pa-5 mb-4" max-width="720">
        <h2 class="text-subtitle-1 font-weight-bold mb-3">{{ t('organizer.organization.statusSectionTitle') }}</h2>
        <dl class="oh-org-status-summary">
          <dt class="text-caption text-textSecondary">{{ t('organizer.organization.statusLabel') }}</dt>
          <dd class="text-body-2 mb-2">{{ t(`admin.organizationStatus.${organization.status}`) }}</dd>
          <dt class="text-caption text-textSecondary">{{ t('organizer.organization.ownerLabel') }}</dt>
          <dd class="text-body-2 mb-2">{{ authStore.currentUser?.firstName }} {{ authStore.currentUser?.lastName }} ({{ authStore.currentUser?.email }})</dd>
          <dt class="text-caption text-textSecondary">{{ t('organizer.organization.submittedLabel') }}</dt>
          <dd class="text-body-2 mb-2">{{ formatDate(organization.submittedAt) }}</dd>
          <dt v-if="organization.reviewedAt" class="text-caption text-textSecondary">{{ t('organizer.organization.reviewedLabel') }}</dt>
          <dd v-if="organization.reviewedAt" class="text-body-2 mb-0">{{ formatDate(organization.reviewedAt) }}</dd>
        </dl>
      </OHCard>

      <VAlert v-if="isSuspended" type="warning" variant="tonal" density="comfortable" class="mb-4" max-width="720">
        {{ t('organizer.organization.suspendedNotice') }}
      </VAlert>

      <OHCard class="pa-5 mb-4" max-width="720">
        <h2 class="text-subtitle-1 font-weight-bold mb-3">{{ t('organizer.organization.editSectionTitle') }}</h2>
        <OrganizationApplicationForm
          :initial-application="organization"
          :submitting="saving"
          :submit-label="saveLabel"
          @submit="handleSave"
        />
      </OHCard>

      <OHCard class="pa-5" max-width="720" style="border: 1px solid rgb(var(--v-theme-error))">
        <h2 class="text-subtitle-1 font-weight-bold text-error mb-2">{{ t('organizer.organization.dangerZoneTitle') }}</h2>
        <p class="text-body-2 text-textSecondary mb-4">
          {{ t('organizer.organization.dangerZoneMessage', { name: name(organization) }) }}
        </p>
        <OHButton color="error" variant="outlined" :disabled="busy" @click="showDemotionDialog = true">
          {{ t('organizer.organization.becomeVolunteerAction') }}
        </OHButton>
      </OHCard>

      <OrganizerDemotionConfirmDialog
        v-model="showDemotionDialog"
        :organization-name="name(organization)"
        :loading="demoting"
        @confirm="handleDemote"
      />
    </template>
  </DefaultLayout>
</template>

<style scoped>
.oh-org-status-summary dt {
  font-weight: 600;
}
</style>
