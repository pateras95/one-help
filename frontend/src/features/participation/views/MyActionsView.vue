<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import OHPageHeader from '@/components/common/OHPageHeader.vue'
import OHButton from '@/components/common/OHButton.vue'
import LoadingState from '@/components/feedback/LoadingState.vue'
import ErrorState from '@/components/feedback/ErrorState.vue'
import EmptyState from '@/components/feedback/EmptyState.vue'
import { useNotificationsStore } from '@/stores/notifications.store'
import { getActionById } from '@/features/actions/services/actions.service'
import { isPastDate } from '@/utils/date'
import { ROUTES } from '@/constants/routes'
import { useParticipationStore } from '../stores/participation.store'
import { PARTICIPATION_STATUS } from '../utils/participationStatus'
import { participationErrorKey } from '../utils/participationErrors'
import MyActionCard from '../components/MyActionCard.vue'

const { t, locale } = useI18n()
const participationStore = useParticipationStore()
const notificationsStore = useNotificationsStore()

const tab = ref('upcoming')
const resolvedActions = ref({})
const resolving = ref(false)
const cancelTarget = ref(null)

async function resolveActions() {
  const ids = [...new Set(participationStore.participations.map((record) => record.actionId))]
  if (!ids.length) {
    resolvedActions.value = {}
    return
  }

  resolving.value = true
  try {
    const actions = await Promise.all(ids.map((id) => getActionById(id, locale.value).catch(() => null)))
    const map = {}
    ids.forEach((id, index) => {
      map[id] = actions[index]
    })
    resolvedActions.value = map
  } finally {
    resolving.value = false
  }
}

onMounted(resolveActions)
// `deep` because join/cancel mutate the array in place (push / index
// assignment) rather than replacing it — a shallow watch wouldn't see those.
watch(() => participationStore.participations, resolveActions, { deep: true })
watch(locale, resolveActions)

const entries = computed(() =>
  participationStore.participations.map((participation) => ({
    participation,
    action: resolvedActions.value[participation.actionId] ?? null
  }))
)

const upcoming = computed(() =>
  entries.value
    .filter(
      (entry) =>
        entry.participation.status === PARTICIPATION_STATUS.CONFIRMED &&
        (!entry.action || !isPastDate(entry.action.date))
    )
    .sort((a, b) => {
      if (!a.action) return 1
      if (!b.action) return -1
      return new Date(a.action.date) - new Date(b.action.date)
    })
)

const past = computed(() =>
  entries.value
    .filter(
      (entry) => entry.participation.status === PARTICIPATION_STATUS.CONFIRMED && entry.action && isPastDate(entry.action.date)
    )
    .sort((a, b) => new Date(b.action.date) - new Date(a.action.date))
)

const cancelled = computed(() =>
  entries.value
    .filter((entry) => entry.participation.status === PARTICIPATION_STATUS.CANCELLED)
    .sort(
      (a, b) =>
        new Date(b.participation.cancelledAt ?? b.participation.joinedAt) -
        new Date(a.participation.cancelledAt ?? a.participation.joinedAt)
    )
)

const isLoading = computed(() => !participationStore.isInitialized || participationStore.loading || resolving.value)

function requestCancel(entry) {
  cancelTarget.value = entry
}

async function confirmCancel() {
  if (!cancelTarget.value || participationStore.loading) return
  const { actionId } = cancelTarget.value.participation
  try {
    await participationStore.cancel(actionId)
    notificationsStore.notify(t('participation.notifications.cancelSuccess'), { type: 'success' })
  } catch (err) {
    notificationsStore.notify(t(participationErrorKey(err.message)), { type: 'error' })
  } finally {
    cancelTarget.value = null
  }
}
</script>

<template>
  <DefaultLayout>
    <OHPageHeader :title="t('participation.myActions.title')" :subtitle="t('participation.myActions.subtitle')" />

    <LoadingState v-if="isLoading" :label="t('participation.myActions.loading')" />

    <ErrorState
      v-else-if="participationStore.error"
      :title="t('participation.myActions.errorTitle')"
      :message="t('participation.myActions.errorMessage')"
      @retry="participationStore.loadForCurrentUser"
    />

    <template v-else>
      <VTabs v-model="tab" class="mb-4">
        <VTab value="upcoming">{{ t('participation.myActions.tabUpcoming') }} ({{ upcoming.length }})</VTab>
        <VTab value="past">{{ t('participation.myActions.tabPast') }} ({{ past.length }})</VTab>
        <VTab value="cancelled">{{ t('participation.myActions.tabCancelled') }} ({{ cancelled.length }})</VTab>
      </VTabs>

      <VWindow v-model="tab">
        <VWindowItem value="upcoming">
          <EmptyState
            v-if="upcoming.length === 0"
            :title="t('participation.myActions.emptyUpcomingTitle')"
            :message="t('participation.myActions.emptyUpcomingMessage')"
            icon="mdi-calendar-blank-outline"
          >
            <OHButton class="mt-4" color="primary" :to="ROUTES.ACTIONS">
              {{ t('participation.myActions.browseActions') }}
            </OHButton>
          </EmptyState>
          <VRow v-else>
            <VCol v-for="entry in upcoming" :key="entry.participation.id" cols="12" sm="6" md="4">
              <MyActionCard
                :participation="entry.participation"
                :action="entry.action"
                cancellable
                @cancel="requestCancel(entry)"
              />
            </VCol>
          </VRow>
        </VWindowItem>

        <VWindowItem value="past">
          <EmptyState
            v-if="past.length === 0"
            :title="t('participation.myActions.emptyPastTitle')"
            :message="t('participation.myActions.emptyPastMessage')"
            icon="mdi-calendar-check-outline"
          />
          <VRow v-else>
            <VCol v-for="entry in past" :key="entry.participation.id" cols="12" sm="6" md="4">
              <MyActionCard :participation="entry.participation" :action="entry.action" />
            </VCol>
          </VRow>
        </VWindowItem>

        <VWindowItem value="cancelled">
          <EmptyState
            v-if="cancelled.length === 0"
            :title="t('participation.myActions.emptyCancelledTitle')"
            :message="t('participation.myActions.emptyCancelledMessage')"
            icon="mdi-calendar-remove-outline"
          />
          <VRow v-else>
            <VCol v-for="entry in cancelled" :key="entry.participation.id" cols="12" sm="6" md="4">
              <MyActionCard :participation="entry.participation" :action="entry.action" />
            </VCol>
          </VRow>
        </VWindowItem>
      </VWindow>
    </template>

    <VDialog :model-value="Boolean(cancelTarget)" max-width="480" @update:model-value="cancelTarget = null">
      <VCard v-if="cancelTarget">
        <VCardTitle>{{ t('participation.cancelDialog.title') }}</VCardTitle>
        <VCardText>
          <p class="mb-0">
            {{ t('participation.cancelDialog.message', {
              title: cancelTarget.action?.title ?? t('participation.myActions.unknownAction')
            }) }}
          </p>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" :disabled="participationStore.loading" @click="cancelTarget = null">
            {{ t('participation.cancelDialog.cancel') }}
          </VBtn>
          <VBtn
            color="error"
            :loading="participationStore.loading"
            :disabled="participationStore.loading"
            @click="confirmCancel"
          >
            {{ t('participation.cancelDialog.confirm') }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </DefaultLayout>
</template>
