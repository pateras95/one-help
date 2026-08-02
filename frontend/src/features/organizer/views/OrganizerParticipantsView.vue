<script setup>
import { computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import OHCard from '@/components/common/OHCard.vue'
import OHButton from '@/components/common/OHButton.vue'
import LoadingState from '@/components/feedback/LoadingState.vue'
import ErrorState from '@/components/feedback/ErrorState.vue'
import EmptyState from '@/components/feedback/EmptyState.vue'
import { PARTICIPATION_STATUS } from '@/features/participation/utils/participationStatus'
import { ROUTES, organizerActionDetailsPath } from '@/constants/routes'
import { useOrganizerStore } from '../stores/organizer.store'
import { localizeField } from '../utils/localizeField'

const { t, locale } = useI18n()
const route = useRoute()
const organizerStore = useOrganizerStore()

const actionId = computed(() => (typeof route.params.actionId === 'string' ? route.params.actionId : null))

function load() {
  if (!actionId.value) return
  organizerStore.loadActionById(actionId.value)
  organizerStore.loadParticipants(actionId.value)
}

onMounted(load)
watch(actionId, load)

const action = computed(() => organizerStore.selectedAction)
const actionTitle = computed(() => (action.value ? localizeField(action.value.title, locale.value) : ''))

const isLoading = computed(() => organizerStore.selectedActionLoading || organizerStore.participantsLoading)
const errorCode = computed(() => organizerStore.selectedActionError || organizerStore.participantsError)
const isNotFoundError = computed(() => errorCode.value === 'actionNotFound' || errorCode.value === 'notOwner')

const confirmedParticipants = computed(
  () => organizerStore.participants.filter((participant) => participant.status === PARTICIPATION_STATUS.CONFIRMED)
)
const cancelledParticipants = computed(
  () => organizerStore.participants.filter((participant) => participant.status === PARTICIPATION_STATUS.CANCELLED)
)

function formatDate(isoString) {
  if (!isoString) return ''
  const formatter = new Intl.DateTimeFormat(locale.value === 'en' ? 'en-GB' : 'el-GR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
  return formatter.format(new Date(isoString))
}

function fullName(participant) {
  if (!participant.firstName && !participant.lastName) return participant.userId
  return `${participant.firstName ?? ''} ${participant.lastName ?? ''}`.trim()
}
</script>

<template>
  <DefaultLayout>
    <OHButton
      variant="text"
      prepend-icon="mdi-arrow-left"
      class="mb-4"
      :to="actionId ? organizerActionDetailsPath(actionId) : ROUTES.ORGANIZER"
    >
      {{ t('organizer.participants.backToAction') }}
    </OHButton>

    <LoadingState v-if="isLoading" :label="t('organizer.participants.loading')" />

    <EmptyState
      v-else-if="isNotFoundError"
      :title="t('organizer.details.notFoundTitle')"
      :message="t('organizer.details.notFoundMessage')"
      icon="mdi-map-marker-question-outline"
    >
      <OHButton class="mt-4" color="primary" :to="ROUTES.ORGANIZER">
        {{ t('organizer.details.backToDashboard') }}
      </OHButton>
    </EmptyState>

    <ErrorState
      v-else-if="errorCode"
      :title="t('organizer.participants.errorTitle')"
      :message="t('organizer.participants.errorMessage')"
      @retry="load"
    />

    <template v-else>
      <h1 class="oh-page-title font-weight-bold text-textPrimary mb-1">{{ t('organizer.participants.title') }}</h1>
      <p class="text-body-2 text-textSecondary mb-6">{{ actionTitle }}</p>

      <div class="d-flex flex-wrap ga-2 mb-4">
        <VChip color="success" variant="tonal">
          {{ t('organizer.participants.confirmedCount', { count: confirmedParticipants.length }) }}
        </VChip>
        <VChip color="textSecondary" variant="tonal">
          {{ t('organizer.participants.cancelledCount', { count: cancelledParticipants.length }) }}
        </VChip>
      </div>

      <EmptyState
        v-if="organizerStore.participants.length === 0"
        :title="t('organizer.participants.emptyTitle')"
        :message="t('organizer.participants.emptyMessage')"
        icon="mdi-account-multiple-outline"
      />

      <OHCard v-else class="pa-0">
        <VList :aria-label="t('organizer.participants.title')">
          <template v-for="(participant, index) in organizerStore.participants" :key="participant.id">
            <VDivider v-if="index > 0" />
            <VListItem>
              <template #prepend>
                <VAvatar color="primary" size="36">
                  <span class="text-caption font-weight-bold" aria-hidden="true">
                    {{ participant.avatarInitials ?? '?' }}
                  </span>
                </VAvatar>
              </template>

              <VListItemTitle class="font-weight-bold">{{ fullName(participant) }}</VListItemTitle>
              <VListItemSubtitle>{{ participant.email }}</VListItemSubtitle>
              <VListItemSubtitle>
                {{ participant.status === 'confirmed'
                  ? t('organizer.participants.joinedAt', { date: formatDate(participant.joinedAt) })
                  : t('organizer.participants.cancelledAt', { date: formatDate(participant.cancelledAt) }) }}
              </VListItemSubtitle>

              <template #append>
                <VChip
                  size="small"
                  :color="participant.status === 'confirmed' ? 'success' : 'textSecondary'"
                  variant="tonal"
                >
                  {{ t(`participation.status.${participant.status}`) }}
                </VChip>
              </template>
            </VListItem>
          </template>
        </VList>
      </OHCard>
    </template>
  </DefaultLayout>
</template>
