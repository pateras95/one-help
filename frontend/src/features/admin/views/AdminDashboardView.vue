<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import OHPageHeader from '@/components/common/OHPageHeader.vue'
import OHCard from '@/components/common/OHCard.vue'
import LoadingState from '@/components/feedback/LoadingState.vue'
import EmptyState from '@/components/feedback/EmptyState.vue'
import { PUBLIC_VISIBLE_STATUSES } from '@/features/organizer/utils/organizerActionStatus'
import { ROLES } from '@/constants/roles'
import AdminNavTabs from '../components/AdminNavTabs.vue'
import SignalMetricCard from '@/components/common/SignalMetricCard.vue'
import { useAdminUsersStore } from '../stores/adminUsers.store'
import { useAdminOrganizationsStore } from '../stores/adminOrganizations.store'
import { useAdminActionsStore } from '../stores/adminActions.store'
import { useAdminReportsStore } from '../stores/adminReports.store'
import { getActivityLog } from '../services/activityLog.service'
import { ACCOUNT_STATUS } from '../utils/accountStatus'
import { ORGANIZATION_STATUS } from '../utils/organizationStatus'
import { ACTION_MODERATION_STATUS } from '../utils/actionModerationStatus'
import { REPORT_STATUS } from '../utils/reportStatus'
import { activityMetadataForTranslation } from '../utils/activityDescribe'

const { t, locale } = useI18n()

const usersStore = useAdminUsersStore()
const organizationsStore = useAdminOrganizationsStore()
const actionsStore = useAdminActionsStore()
const reportsStore = useAdminReportsStore()

const recentActivity = ref([])
const activityLoading = ref(false)

const loading = computed(
  () => usersStore.loading || organizationsStore.loading || actionsStore.loading || reportsStore.loading
)

async function loadAll() {
  activityLoading.value = true
  await Promise.all([
    usersStore.fetchUsers(),
    organizationsStore.fetchOrganizations(),
    actionsStore.fetchActions(),
    reportsStore.fetchReports(),
    getActivityLog({ limit: 8 }).then((entries) => {
      recentActivity.value = entries
    })
  ])
  activityLoading.value = false
}

onMounted(loadAll)

const totalUsers = computed(() => usersStore.users.length)
const activeVolunteers = computed(
  () => usersStore.users.filter((user) => user.role === ROLES.VOLUNTEER && user.status === ACCOUNT_STATUS.ACTIVE).length
)
const organizerCount = computed(() => usersStore.users.filter((user) => user.role === ROLES.ORGANIZER).length)
const pendingOrganizerApprovals = computed(
  () => organizationsStore.organizations.filter((org) => org.status === ORGANIZATION_STATUS.PENDING).length
)
// Mirrors (without re-calling) the shared public-visibility policy —
// the admin actions list already carries all three fields decorated,
// so this avoids redundant storage lookups for a summary count.
const publishedActionsCount = computed(
  () =>
    actionsStore.actions.filter(
      (action) =>
        PUBLIC_VISIBLE_STATUSES.includes(action.organizerStatus) &&
        action.moderationStatus === ACTION_MODERATION_STATUS.APPROVED &&
        action.organizationStatus === ORGANIZATION_STATUS.APPROVED
    ).length
)
const actionsAwaitingReview = computed(
  () => actionsStore.actions.filter((action) => action.moderationStatus === ACTION_MODERATION_STATUS.PENDING_REVIEW).length
)
const suspendedAccounts = computed(
  () => usersStore.users.filter((user) => user.status === ACCOUNT_STATUS.SUSPENDED).length
)
const openReports = computed(() => reportsStore.reports.filter((report) => report.status === REPORT_STATUS.OPEN).length)

const summaryCards = computed(() => [
  { label: t('admin.dashboard.summary.totalUsers'), value: totalUsers.value, icon: 'mdi-account-multiple-outline', color: 'primary' },
  { label: t('admin.dashboard.summary.activeVolunteers'), value: activeVolunteers.value, icon: 'mdi-hand-heart-outline', color: 'success' },
  { label: t('admin.dashboard.summary.organizers'), value: organizerCount.value, icon: 'mdi-briefcase-outline', color: 'secondary' },
  { label: t('admin.dashboard.summary.pendingApprovals'), value: pendingOrganizerApprovals.value, icon: 'mdi-domain', color: 'warning' },
  { label: t('admin.dashboard.summary.publishedActions'), value: publishedActionsCount.value, icon: 'mdi-check-decagram-outline', color: 'success' },
  { label: t('admin.dashboard.summary.actionsAwaitingReview'), value: actionsAwaitingReview.value, icon: 'mdi-clipboard-clock-outline', color: 'warning' },
  { label: t('admin.dashboard.summary.suspendedAccounts'), value: suspendedAccounts.value, icon: 'mdi-account-off-outline', color: 'error' },
  { label: t('admin.dashboard.summary.openReports'), value: openReports.value, icon: 'mdi-flag-outline', color: 'error' }
])

function activityText(entry) {
  return t(`admin.activity.entries.${entry.actionType}`, activityMetadataForTranslation(entry, t))
}

function activityTimestamp(entry) {
  const formatter = new Intl.DateTimeFormat(locale.value === 'en' ? 'en-GB' : 'el-GR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
  return formatter.format(new Date(entry.timestamp))
}
</script>

<template>
  <DefaultLayout>
    <OHPageHeader eyebrow="OneHelp" :title="t('admin.dashboard.pageTitle')" :subtitle="t('admin.dashboard.subtitle')" />
    <AdminNavTabs />

    <LoadingState v-if="loading" :label="t('admin.common.loading')" />

    <template v-else>
      <VRow>
        <VCol v-for="card in summaryCards" :key="card.label" cols="12" sm="6" md="3">
          <SignalMetricCard :label="card.label" :value="card.value" :icon="card.icon" :color="card.color" />
        </VCol>
      </VRow>

      <h2 class="text-subtitle-1 font-weight-bold mt-6 mb-3">{{ t('admin.dashboard.recentActivityTitle') }}</h2>
      <OHCard class="pa-4">
        <EmptyState
          v-if="recentActivity.length === 0"
          :title="t('admin.activity.emptyTitle')"
          :message="t('admin.activity.emptyMessage')"
          icon="mdi-history"
        />
        <VList v-else density="comfortable">
          <VListItem
            v-for="entry in recentActivity"
            :key="entry.id"
            :title="activityText(entry)"
            :subtitle="activityTimestamp(entry)"
          />
        </VList>
      </OHCard>
    </template>
  </DefaultLayout>
</template>
