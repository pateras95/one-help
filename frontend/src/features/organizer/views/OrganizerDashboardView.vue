<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import OHPageHeader from '@/components/common/OHPageHeader.vue'
import OHButton from '@/components/common/OHButton.vue'
import OHCard from '@/components/common/OHCard.vue'
import LoadingState from '@/components/feedback/LoadingState.vue'
import ErrorState from '@/components/feedback/ErrorState.vue'
import EmptyState from '@/components/feedback/EmptyState.vue'
import { useNotificationsStore } from '@/stores/notifications.store'
import { useParticipationStore } from '@/features/participation/stores/participation.store'
import { getLocalConfirmedCount } from '@/features/participation/utils/participationCount'
import {
  ROUTES,
  organizerActionDetailsPath,
  organizerActionEditPath,
  organizerActionParticipantsPath,
  organizerActionCheckInPath
} from '@/constants/routes'
import { useOrganizerStore } from '../stores/organizer.store'
import { ORGANIZER_ACTION_STATUS } from '../utils/organizerActionStatus'
import { organizerActionErrorKey } from '../utils/organizerActionErrors'
import { localizeField } from '../utils/localizeField'
import OrganizerActionCard from '../components/OrganizerActionCard.vue'
import StatusTransitionDialog from '../components/StatusTransitionDialog.vue'

const { t, locale } = useI18n()
const router = useRouter()
const organizerStore = useOrganizerStore()
const participationStore = useParticipationStore()
const notificationsStore = useNotificationsStore()

const transitionTarget = ref(null)

onMounted(() => {
  if (!organizerStore.isInitialized) organizerStore.loadActions()
})

const isLoading = computed(() => !organizerStore.isInitialized || organizerStore.loading)

const summary = computed(() => {
  void participationStore.countVersion
  const actions = organizerStore.actions
  return {
    totalActions: actions.length,
    published: actions.filter((action) => action.organizerStatus === ORGANIZER_ACTION_STATUS.PUBLISHED).length,
    drafts: actions.filter((action) => action.organizerStatus === ORGANIZER_ACTION_STATUS.DRAFT).length,
    confirmedParticipants: actions.reduce(
      (total, action) => total + action.registeredCount + getLocalConfirmedCount(action.id),
      0
    )
  }
})

function requestTransition(actionId, { kind, status }) {
  transitionTarget.value = { actionId, kind, status }
}

async function confirmTransition() {
  if (!transitionTarget.value || organizerStore.loading) return
  const { actionId, kind, status } = transitionTarget.value
  try {
    await organizerStore.changeStatus(actionId, status)
    notificationsStore.notify(t(`organizer.transitions.success${kind.charAt(0).toUpperCase()}${kind.slice(1)}`), { type: 'success' })
    transitionTarget.value = null
  } catch (err) {
    notificationsStore.notify(t(organizerActionErrorKey(err.message)), { type: 'error' })
    transitionTarget.value = null
  }
}

const transitionActionTitle = computed(() => {
  if (!transitionTarget.value) return ''
  const action = organizerStore.actions.find((candidate) => candidate.id === transitionTarget.value.actionId)
  return action ? localizeField(action.title, locale.value) : ''
})
</script>

<template>
  <DefaultLayout>
    <OHPageHeader :title="t('organizer.dashboard.title')" :subtitle="t('organizer.dashboard.subtitle')">
      <template #actions>
        <OHButton variant="outlined" prepend-icon="mdi-domain" :to="ROUTES.ORGANIZER_ORGANIZATION">
          {{ t('organizer.dashboard.myOrganization') }}
        </OHButton>
        <OHButton color="primary" prepend-icon="mdi-plus" :to="ROUTES.ORGANIZER_NEW_ACTION">
          {{ t('organizer.dashboard.createAction') }}
        </OHButton>
      </template>
    </OHPageHeader>

    <LoadingState v-if="isLoading" :label="t('organizer.dashboard.loading')" />

    <ErrorState
      v-else-if="organizerStore.error"
      :title="t('organizer.dashboard.errorTitle')"
      :message="t('organizer.dashboard.errorMessage')"
      @retry="organizerStore.loadActions"
    />

    <template v-else>
      <VRow class="mb-4">
        <VCol cols="6" md="3">
          <OHCard class="pa-4 text-center">
            <p class="text-h5 font-weight-bold mb-1">{{ summary.totalActions }}</p>
            <p class="text-caption text-textSecondary mb-0">{{ t('organizer.dashboard.summary.totalActions') }}</p>
          </OHCard>
        </VCol>
        <VCol cols="6" md="3">
          <OHCard class="pa-4 text-center">
            <p class="text-h5 font-weight-bold mb-1">{{ summary.published }}</p>
            <p class="text-caption text-textSecondary mb-0">{{ t('organizer.dashboard.summary.published') }}</p>
          </OHCard>
        </VCol>
        <VCol cols="6" md="3">
          <OHCard class="pa-4 text-center">
            <p class="text-h5 font-weight-bold mb-1">{{ summary.drafts }}</p>
            <p class="text-caption text-textSecondary mb-0">{{ t('organizer.dashboard.summary.drafts') }}</p>
          </OHCard>
        </VCol>
        <VCol cols="6" md="3">
          <OHCard class="pa-4 text-center">
            <p class="text-h5 font-weight-bold mb-1">{{ summary.confirmedParticipants }}</p>
            <p class="text-caption text-textSecondary mb-0">{{ t('organizer.dashboard.summary.confirmedParticipants') }}</p>
          </OHCard>
        </VCol>
      </VRow>

      <h2 class="text-subtitle-1 font-weight-bold mb-3">{{ t('organizer.dashboard.sectionTitle') }}</h2>

      <EmptyState
        v-if="organizerStore.actions.length === 0"
        :title="t('organizer.dashboard.emptyTitle')"
        :message="t('organizer.dashboard.emptyMessage')"
        icon="mdi-briefcase-outline"
      >
        <OHButton class="mt-4" color="primary" prepend-icon="mdi-plus" :to="ROUTES.ORGANIZER_NEW_ACTION">
          {{ t('organizer.dashboard.createAction') }}
        </OHButton>
      </EmptyState>

      <VRow v-else>
        <VCol v-for="action in organizerStore.actions" :key="action.id" cols="12" sm="6" md="4">
          <OrganizerActionCard
            :action="action"
            @view="router.push(organizerActionDetailsPath(action.id))"
            @edit="router.push(organizerActionEditPath(action.id))"
            @participants="router.push(organizerActionParticipantsPath(action.id))"
            @transition="requestTransition(action.id, $event)"
            @check-in="router.push(organizerActionCheckInPath(action.id))"
          />
        </VCol>
      </VRow>
    </template>

    <StatusTransitionDialog
      :model-value="Boolean(transitionTarget)"
      :transition="transitionTarget?.kind"
      :action-title="transitionActionTitle"
      :loading="organizerStore.loading"
      @update:model-value="transitionTarget = null"
      @confirm="confirmTransition"
    />
  </DefaultLayout>
</template>
