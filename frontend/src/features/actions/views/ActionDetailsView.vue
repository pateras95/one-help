<script setup>
import { computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import OHCard from '@/components/common/OHCard.vue'
import OHButton from '@/components/common/OHButton.vue'
import SignalStatusBadge from '@/components/common/SignalStatusBadge.vue'
import LoadingState from '@/components/feedback/LoadingState.vue'
import ErrorState from '@/components/feedback/ErrorState.vue'
import EmptyState from '@/components/feedback/EmptyState.vue'
import { useActionsStore } from '@/features/actions/stores/actions.store'
import { getActionCategory } from '@/constants/actionCategories'
import { ROUTES } from '@/constants/routes'
import ParticipationPanel from '@/features/participation/components/ParticipationPanel.vue'
import { useParticipationStore } from '@/features/participation/stores/participation.store'
import { withOverlaidCount } from '@/features/participation/utils/participationCount'
import ActionsMap from '@/features/map/components/ActionsMap.vue'
import { hasValidCoordinates } from '@/features/map/utils/mapCoordinates'
import { buildDirectionsUrl } from '@/features/map/utils/externalDirections'
import ReportActionCard from '@/features/actions/components/ReportActionCard.vue'

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

const directionsUrl = computed(() => {
  if (!displayAction.value || !hasValidCoordinates(displayAction.value)) return null
  return buildDirectionsUrl(displayAction.value.latitude, displayAction.value.longitude)
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
      <div class="d-flex align-center flex-wrap ga-3 mb-4">
        <div v-if="category" class="oh-icon-well oh-icon-well--lg" :class="`bg-${category.accent}`">
          <VIcon :icon="category.icon" size="24" color="white" aria-hidden="true" />
        </div>
        <div class="d-flex flex-column ga-1">
          <span v-if="category" class="oh-eyebrow">{{ t(category.labelKey) }}</span>
          <div class="d-flex flex-wrap ga-2">
            <SignalStatusBadge color="textSecondary" :label="t(`actions.status.${displayAction.status}`)" />
            <SignalStatusBadge
              v-if="displayAction.urgency !== 'normal'"
              emphasis="solid"
              :color="displayAction.urgency === 'urgent' ? 'error' : 'warning'"
              :label="t(`actions.urgency.${displayAction.urgency}`)"
            />
          </div>
        </div>
      </div>

      <h1 class="oh-headline font-weight-bold text-textPrimary mb-6">
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

            <template v-if="hasValidCoordinates(displayAction)">
              <div class="oh-action-details__mini-map mt-3">
                <ActionsMap :actions="[displayAction]" />
              </div>
              <div class="d-flex flex-wrap ga-2 mt-3">
                <OHButton
                  variant="text"
                  size="small"
                  prepend-icon="mdi-map-outline"
                  :to="`${ROUTES.MAP}?action=${displayAction.id}`"
                >
                  {{ t('map.actionDetails.openFullMap') }}
                </OHButton>
                <OHButton
                  variant="text"
                  size="small"
                  prepend-icon="mdi-directions"
                  :href="directionsUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  :aria-label="t('map.actionDetails.directionsAriaLabel', { title: displayAction.title })"
                >
                  {{ t('map.actionDetails.directions') }}
                </OHButton>
              </div>
            </template>
            <p v-else class="text-caption text-textSecondary mt-3 mb-0">
              {{ t('map.actionDetails.noCoordinatesNote') }}
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
            <div class="oh-action-details__capacity-track mt-2">
              <div
                class="oh-action-details__capacity-fill bg-success"
                :style="{ width: `${Math.min(100, Math.round((displayAction.registeredCount / displayAction.capacity) * 100))}%` }"
              />
            </div>
          </OHCard>

          <OHCard v-if="displayAction.organizationDetails" class="pa-5 mt-4">
            <h2 class="text-subtitle-2 font-weight-bold mb-3">{{ t('actions.details.organizationTitle') }}</h2>
            <p class="font-weight-bold mb-1">{{ displayAction.organizationDetails.name }}</p>
            <p v-if="displayAction.organizationDetails.organizationType" class="text-caption text-textSecondary mb-3">
              {{ t(`organizationTypes.${displayAction.organizationDetails.organizationType}`) }}
            </p>
            <p class="text-body-2 text-textSecondary mb-3">{{ displayAction.organizationDetails.description }}</p>

            <div class="d-flex align-center ga-2 text-body-2 text-textSecondary mb-1">
              <VIcon icon="mdi-email-outline" aria-hidden="true" />
              <a :href="`mailto:${displayAction.organizationDetails.contactEmail}`">{{ displayAction.organizationDetails.contactEmail }}</a>
            </div>
            <div v-if="displayAction.organizationDetails.phone" class="d-flex align-center ga-2 text-body-2 text-textSecondary mb-1">
              <VIcon icon="mdi-phone-outline" aria-hidden="true" />
              <span>{{ displayAction.organizationDetails.phone }}</span>
            </div>
            <div v-if="displayAction.organizationDetails.website" class="d-flex align-center ga-2 text-body-2 text-textSecondary mb-1">
              <VIcon icon="mdi-web" aria-hidden="true" />
              <a :href="displayAction.organizationDetails.website" target="_blank" rel="noopener noreferrer">{{ displayAction.organizationDetails.website }}</a>
            </div>
            <div v-if="displayAction.organizationDetails.municipality" class="d-flex align-center ga-2 text-body-2 text-textSecondary">
              <VIcon icon="mdi-map-marker-outline" aria-hidden="true" />
              <span>{{ displayAction.organizationDetails.municipality }}</span>
            </div>
          </OHCard>

          <ReportActionCard :action-id="displayAction.id" class="mt-4" />
        </VCol>
      </VRow>
    </template>
  </DefaultLayout>
</template>

<style scoped>
.oh-action-details__mini-map {
  height: 180px;
  border-radius: var(--oh-radius-md);
  overflow: hidden;
}

.oh-action-details__capacity-track {
  height: 5px;
  border-radius: 999px;
  background: rgb(var(--v-theme-border));
  overflow: hidden;
}

.oh-action-details__capacity-fill {
  height: 100%;
  border-radius: 999px;
}
</style>
