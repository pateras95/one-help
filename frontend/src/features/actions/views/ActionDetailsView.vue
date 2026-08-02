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
import { useActionsStore } from '@/features/actions/stores/actions.store'
import { getActionCategory } from '@/constants/actionCategories'
import { ROUTES } from '@/constants/routes'
import ParticipationPanel from '@/features/participation/components/ParticipationPanel.vue'
import { useParticipationStore } from '@/features/participation/stores/participation.store'
import { withOverlaidCount } from '@/features/participation/utils/participationCount'

const { t, locale } = useI18n()
const route = useRoute()
const actionsStore = useActionsStore()
const participationStore = useParticipationStore()

const category = computed(() =>
  actionsStore.currentAction ? getActionCategory(actionsStore.currentAction.categoryId) : null
)

// Overlays the local (this-browser) confirmed participation count on top
// of the base mock figure, and re-derives 'full' from that overlaid
// count — the base action's own status can't know about joins made
// only in localStorage. `countVersion` isn't read directly but is
// listed so this recomputes after every join/cancel.
const displayAction = computed(() => {
  if (!actionsStore.currentAction) return null
  void participationStore.countVersion
  const overlaid = withOverlaidCount(actionsStore.currentAction)
  const baseStatus = actionsStore.currentAction.status
  const status = baseStatus === 'completed' || baseStatus === 'closed'
    ? baseStatus
    : overlaid.registeredCount >= overlaid.capacity ? 'full' : 'open'
  return { ...overlaid, status }
})

const formattedDate = computed(() => {
  if (!displayAction.value) return ''
  const formatter = new Intl.DateTimeFormat(locale.value === 'en' ? 'en-GB' : 'el-GR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })
  return formatter.format(new Date(displayAction.value.date))
})

function load() {
  actionsStore.fetchActionById(route.params.actionId)
}

onMounted(load)
watch(() => route.params.actionId, load)
</script>

<template>
  <DefaultLayout>
    <OHButton
      variant="text"
      prepend-icon="mdi-arrow-left"
      class="mb-4"
      :to="ROUTES.ACTIONS"
    >
      {{ t('actions.details.back') }}
    </OHButton>

    <LoadingState v-if="actionsStore.currentActionLoading" :label="t('actions.details.loading')" />

    <ErrorState
      v-else-if="actionsStore.currentActionError"
      :title="t('actions.details.errorTitle')"
      :message="t('actions.details.errorMessage')"
      @retry="load"
    />

    <EmptyState
      v-else-if="!actionsStore.currentAction"
      :title="t('actions.details.notFoundTitle')"
      :message="t('actions.details.notFoundMessage')"
      icon="mdi-map-marker-question-outline"
    >
      <OHButton class="mt-4" color="primary" :to="ROUTES.ACTIONS">
        {{ t('actions.details.back') }}
      </OHButton>
    </EmptyState>

    <template v-else>
      <div class="d-flex align-center flex-wrap ga-2 mb-3">
        <VChip
          v-if="category"
          :color="category.accent"
          variant="tonal"
          :prepend-icon="category.icon"
        >
          {{ t(category.labelKey) }}
        </VChip>
        <VChip size="small" variant="tonal">
          {{ t(`actions.status.${displayAction.status}`) }}
        </VChip>
        <VChip
          v-if="displayAction.urgency !== 'normal'"
          size="small"
          :color="displayAction.urgency === 'urgent' ? 'error' : 'warning'"
        >
          {{ t(`actions.urgency.${displayAction.urgency}`) }}
        </VChip>
      </div>

      <h1 class="oh-page-title font-weight-bold text-textPrimary mb-6">
        {{ displayAction.title }}
      </h1>

      <VRow>
        <VCol cols="12" md="8">
          <OHCard class="pa-5 mb-4">
            <h2 class="text-subtitle-1 font-weight-bold mb-2">{{ t('actions.details.aboutTitle') }}</h2>
            <p class="text-body-1 text-textSecondary mb-0">{{ displayAction.description }}</p>
          </OHCard>

          <OHCard v-if="displayAction.requiredEquipment.length" class="pa-5">
            <h2 class="text-subtitle-1 font-weight-bold mb-2">{{ t('actions.details.requirementsTitle') }}</h2>
            <VList density="compact">
              <VListItem
                v-for="item in displayAction.requiredEquipment"
                :key="item"
                :title="item"
                prepend-icon="mdi-check-circle-outline"
              />
            </VList>
          </OHCard>
        </VCol>

        <VCol cols="12" md="4">
          <ParticipationPanel :action="displayAction" class="mb-4" />

          <OHCard class="pa-5 mb-4">
            <h2 class="text-subtitle-2 font-weight-bold mb-3">{{ t('actions.details.whenTitle') }}</h2>
            <div class="d-flex align-center ga-2 text-body-2 text-textSecondary">
              <VIcon icon="mdi-calendar-blank-outline" aria-hidden="true" />
              <span class="text-capitalize">{{ formattedDate }}</span>
            </div>
            <div class="d-flex align-center ga-2 text-body-2 text-textSecondary mt-1">
              <VIcon icon="mdi-clock-outline" aria-hidden="true" />
              <span>{{ displayAction.startTime }}</span>
            </div>
          </OHCard>

          <OHCard class="pa-5 mb-4">
            <h2 class="text-subtitle-2 font-weight-bold mb-3">{{ t('actions.details.whereTitle') }}</h2>
            <div class="d-flex align-center ga-2 text-body-2 text-textSecondary">
              <VIcon icon="mdi-map-marker-outline" aria-hidden="true" />
              <span>{{ displayAction.locationName }}, {{ displayAction.municipality }}</span>
            </div>
            <p class="text-caption text-textSecondary mt-3 mb-0">
              {{ t('actions.details.mapPlaceholder') }}
            </p>
          </OHCard>

          <OHCard class="pa-5">
            <h2 class="text-subtitle-2 font-weight-bold mb-3">{{ t('actions.details.organizerTitle') }}</h2>
            <div class="d-flex align-center ga-2 text-body-2 text-textSecondary mb-4">
              <VIcon icon="mdi-account-group-outline" aria-hidden="true" />
              <span>{{ displayAction.organization }}</span>
            </div>

            <h2 class="text-subtitle-2 font-weight-bold mb-2">{{ t('actions.details.participantsTitle') }}</h2>
            <span class="text-body-2 text-textSecondary">
              {{ t('actions.card.participants', {
                registered: displayAction.registeredCount,
                capacity: displayAction.capacity
              }) }}
            </span>
          </OHCard>
        </VCol>
      </VRow>
    </template>
  </DefaultLayout>
</template>
