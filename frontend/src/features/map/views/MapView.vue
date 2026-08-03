<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useDisplay } from 'vuetify'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import OHPageHeader from '@/components/common/OHPageHeader.vue'
import OHCard from '@/components/common/OHCard.vue'
import OHButton from '@/components/common/OHButton.vue'
import LoadingState from '@/components/feedback/LoadingState.vue'
import EmptyState from '@/components/feedback/EmptyState.vue'
import ErrorState from '@/components/feedback/ErrorState.vue'
import ActionCard from '@/features/actions/components/ActionCard.vue'
import { useActionsStore } from '@/features/actions/stores/actions.store'
import { ACTION_CATEGORIES, isValidCategoryId } from '@/constants/actionCategories'
import { ROUTES } from '@/constants/routes'
import ActionsMap from '../components/ActionsMap.vue'
import ActionMapMarkerPopup from '../components/ActionMapMarkerPopup.vue'
import UserLocationControl from '../components/UserLocationControl.vue'
import { hasValidCoordinates, withValidCoordinates } from '../utils/mapCoordinates'
import { haversineDistanceKm, formatDistance } from '../utils/distance'

const { t } = useI18n()
const { mobile } = useDisplay()
const route = useRoute()
const router = useRouter()
const actionsStore = useActionsStore()

const dateOptions = [
  { value: 'all', titleKey: 'actions.filters.dateAll' },
  { value: 'today', titleKey: 'actions.filters.dateToday' },
  { value: 'week', titleKey: 'actions.filters.dateThisWeek' },
  { value: 'month', titleKey: 'actions.filters.dateThisMonth' }
]

const statusOptions = [
  { value: 'open', titleKey: 'actions.status.open' },
  { value: 'full', titleKey: 'actions.status.full' },
  { value: 'closed', titleKey: 'actions.status.closed' },
  { value: 'completed', titleKey: 'actions.status.completed' }
]

// Map-only filter, not part of the shared Actions store/URL contract —
// applied client-side on top of whatever the store already fetched.
const statusFilter = ref('')

const userLocation = ref(null)
const selectedActionId = ref(null)
const tileLoadError = ref(false)
const mapRef = ref(null)

let isApplyingQuery = false

onMounted(() => {
  isApplyingQuery = true
  const queryCategory = route.query.category
  const querySearch = route.query.search
  actionsStore.initFromQuery({
    category: typeof queryCategory === 'string' && isValidCategoryId(queryCategory) ? queryCategory : '',
    search: typeof querySearch === 'string' ? querySearch : ''
  })
  isApplyingQuery = false
})

// Same replace-based category/search sync as ActionsListView, merged
// against the current query so it never clobbers `action`.
watch(
  () => [actionsStore.category, actionsStore.search],
  ([nextCategory, nextSearch]) => {
    if (isApplyingQuery) return
    const query = { ...route.query }
    if (nextCategory) query.category = nextCategory
    else delete query.category
    if (nextSearch) query.search = nextSearch
    else delete query.search
    router.replace({ path: ROUTES.MAP, query })
  }
)

// All actions matching the current filters, regardless of whether they
// have valid coordinates — this is what the textual results list and
// the result count use. `ActionsMap` is handed the same list and safely
// filters down to the valid-coordinate subset itself for markers.
const resultsList = computed(() => {
  if (!statusFilter.value) return actionsStore.actions
  return actionsStore.actions.filter((action) => action.status === statusFilter.value)
})

const mapMarkerCount = computed(() => withValidCoordinates(resultsList.value).length)

const distanceKmByActionId = computed(() => {
  const map = new Map()
  if (!userLocation.value) return map
  for (const action of resultsList.value) {
    if (hasValidCoordinates(action)) {
      map.set(action.id, haversineDistanceKm(userLocation.value, { lat: action.latitude, lng: action.longitude }))
    }
  }
  return map
})

const distanceLabelByActionId = computed(() => {
  const map = new Map()
  for (const [id, km] of distanceKmByActionId.value) {
    map.set(id, formatDistance(km))
  }
  return map
})

// Sorted by approximate distance once a location is known (actions
// without coordinates sort last); otherwise keeps the store's own order.
const displayResultsList = computed(() => {
  if (!userLocation.value) return resultsList.value
  return [...resultsList.value].sort((a, b) => {
    const distanceA = distanceKmByActionId.value.has(a.id) ? distanceKmByActionId.value.get(a.id) : Infinity
    const distanceB = distanceKmByActionId.value.has(b.id) ? distanceKmByActionId.value.get(b.id) : Infinity
    return distanceA - distanceB
  })
})

const selectedAction = computed(
  () => resultsList.value.find((action) => action.id === selectedActionId.value) ?? null
)
const selectedActionDistance = computed(() => distanceLabelByActionId.value.get(selectedActionId.value) ?? null)

// Two-column "map + selected action" layout only applies on desktop/tablet
// — on mobile the selected action always sits below the (full-width) map
// instead, never beside it.
const showSidePanel = computed(() => Boolean(selectedAction.value) && !mobile.value)

const hasActiveMapFilters = computed(() => actionsStore.hasActiveFilters || Boolean(statusFilter.value))

function resetAllFilters() {
  actionsStore.resetFilters()
  statusFilter.value = ''
}

function handleSelectMarker(id) {
  selectedActionId.value = id
}

function handleCloseSelected() {
  selectedActionId.value = null
}

function handleLocated(position) {
  userLocation.value = position
}

function handleLocationReset() {
  userLocation.value = null
}

// Inbound: the URL is the source of truth for the selection whenever it
// changes externally (deep link, browser back/forward).
watch(
  () => route.query.action,
  (queryActionId) => {
    selectedActionId.value = typeof queryActionId === 'string' ? queryActionId : null
  },
  { immediate: true }
)

// Outbound: reflect the local selection into the URL. Comparing against
// the live route (not a separate flag) is what prevents a loop with the
// watcher above.
watch(selectedActionId, (id) => {
  const currentQueryId = typeof route.query.action === 'string' ? route.query.action : null
  if (id === currentQueryId) return
  const query = { ...route.query }
  if (id) query.action = id
  else delete query.action
  router.push({ path: ROUTES.MAP, query })
})

// Clears the selection (and its query) once it no longer exists in the
// current filtered results — covers an invalid/stale `?action=` id, a
// filter change that removes the selected action, and the initial data
// load finishing after a deep link.
watch(resultsList, (list) => {
  if (selectedActionId.value && !list.some((action) => action.id === selectedActionId.value)) {
    selectedActionId.value = null
  }
})

// A breakpoint crossing can resize/reflow the map container without
// Leaflet's own resize detection noticing (it only watches the window).
watch(mobile, async () => {
  await nextTick()
  mapRef.value?.invalidateSize()
})

// Selecting/deselecting an action toggles the desktop two-column split,
// which changes the map container's actual width without the window
// itself resizing — Leaflet needs an explicit nudge to redraw correctly.
watch(showSidePanel, async () => {
  await nextTick()
  mapRef.value?.invalidateSize()
})
</script>

<template>
  <DefaultLayout>
    <OHPageHeader eyebrow="OneHelp" :title="t('map.page.title')" :subtitle="t('map.page.subtitle')" />

    <OHCard class="oh-discovery pa-4 pa-md-5 mb-6">
    <VTextField
      class="mb-4"
      :model-value="actionsStore.search"
      :label="t('actions.filters.searchLabel')"
      :placeholder="t('actions.filters.searchPlaceholder')"
      prepend-inner-icon="mdi-magnify"
      variant="outlined"
      density="comfortable"
      clearable
      hide-details
      @update:model-value="actionsStore.setSearch($event ?? '')"
    />

    <VExpansionPanels v-if="mobile" variant="accordion">
      <VExpansionPanel :title="t('actions.filters.openFilters')">
        <template #text>
          <div class="d-flex flex-column ga-4">
            <VSelect
              :model-value="actionsStore.category"
              :label="t('actions.filters.categoryLabel')"
              :items="[{ value: '', title: t('actions.filters.categoryAll') }, ...ACTION_CATEGORIES.map((c) => ({ value: c.id, title: t(c.labelKey) }))]"
              variant="outlined"
              density="comfortable"
              hide-details
              @update:model-value="actionsStore.setCategory($event)"
            />
            <VSelect
              :model-value="actionsStore.datePreset"
              :label="t('actions.filters.dateLabel')"
              :items="dateOptions.map((option) => ({ value: option.value, title: t(option.titleKey) }))"
              variant="outlined"
              density="comfortable"
              hide-details
              @update:model-value="actionsStore.setDatePreset($event)"
            />
            <VSelect
              v-model="statusFilter"
              :label="t('map.filters.statusLabel')"
              :items="[{ value: '', title: t('map.filters.statusAll') }, ...statusOptions.map((option) => ({ value: option.value, title: t(option.titleKey) }))]"
              variant="outlined"
              density="comfortable"
              hide-details
            />
            <UserLocationControl @located="handleLocated" @reset="handleLocationReset" />
          </div>
        </template>
      </VExpansionPanel>
    </VExpansionPanels>

    <template v-else>
      <VRow class="mb-2" align="center">
        <VCol cols="12" sm="6" md="3">
          <VSelect
            :model-value="actionsStore.category"
            :label="t('actions.filters.categoryLabel')"
            :items="[{ value: '', title: t('actions.filters.categoryAll') }, ...ACTION_CATEGORIES.map((c) => ({ value: c.id, title: t(c.labelKey) }))]"
            variant="outlined"
            density="comfortable"
            hide-details
            @update:model-value="actionsStore.setCategory($event)"
          />
        </VCol>
        <VCol cols="12" sm="6" md="3">
          <VSelect
            :model-value="actionsStore.datePreset"
            :label="t('actions.filters.dateLabel')"
            :items="dateOptions.map((option) => ({ value: option.value, title: t(option.titleKey) }))"
            variant="outlined"
            density="comfortable"
            hide-details
            @update:model-value="actionsStore.setDatePreset($event)"
          />
        </VCol>
        <VCol cols="12" sm="6" md="3">
          <VSelect
            v-model="statusFilter"
            :label="t('map.filters.statusLabel')"
            :items="[{ value: '', title: t('map.filters.statusAll') }, ...statusOptions.map((option) => ({ value: option.value, title: t(option.titleKey) }))]"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="12" sm="6" md="3">
          <UserLocationControl @located="handleLocated" @reset="handleLocationReset" />
        </VCol>
      </VRow>
      <div v-if="hasActiveMapFilters" class="mb-4">
        <OHButton variant="text" size="small" prepend-icon="mdi-filter-remove-outline" @click="resetAllFilters">
          {{ t('actions.filters.reset') }}
        </OHButton>
      </div>
    </template>

    <div v-if="mobile && hasActiveMapFilters" class="mb-0">
      <OHButton variant="text" size="small" prepend-icon="mdi-filter-remove-outline" @click="resetAllFilters">
        {{ t('actions.filters.reset') }}
      </OHButton>
    </div>
    </OHCard>

    <p class="text-body-2 text-textSecondary" :class="userLocation ? 'mb-1' : 'mb-4'">
      {{ t('map.page.resultsCount', displayResultsList.length, { count: displayResultsList.length }) }}
    </p>
    <p v-if="userLocation" class="text-caption text-textSecondary mb-4">{{ t('map.filters.nearMeSortNote') }}</p>

    <LoadingState v-if="actionsStore.loading" :label="t('map.page.loading')" />

    <ErrorState
      v-else-if="actionsStore.error"
      :title="t('map.page.errorTitle')"
      :message="t('map.page.errorMessage')"
      @retry="actionsStore.fetchActions"
    />

    <EmptyState
      v-else-if="displayResultsList.length === 0"
      :title="t('map.page.emptyTitle')"
      :message="t('map.page.emptyMessage')"
      icon="mdi-hand-heart-outline"
    />

    <template v-else>
      <!-- Top area: the map (full width when nothing is selected, or the
           larger column of a two-column split once an action is selected
           on desktop/tablet — never split on mobile, see `showSidePanel`). -->
      <div class="oh-map-view__top" :class="{ 'oh-map-view__top--split': showSidePanel }">
        <div class="oh-panel oh-map-view__map-wrapper" :class="{ 'oh-map-view__map-wrapper--mobile': mobile }">
          <ActionsMap
            ref="mapRef"
            :actions="displayResultsList"
            :selected-action-id="selectedActionId"
            :user-location="userLocation"
            @select-marker="handleSelectMarker"
            @tile-error="tileLoadError = true"
          />
        </div>
        <div v-if="showSidePanel" class="oh-map-view__side">
          <ActionMapMarkerPopup
            :action="selectedAction"
            :distance="selectedActionDistance"
            @close="handleCloseSelected"
          />
        </div>
      </div>

      <p v-if="tileLoadError" class="text-caption text-textSecondary mt-2">
        {{ t('map.page.tileErrorNote') }}
      </p>
      <EmptyState
        v-if="mapMarkerCount === 0"
        class="mt-4"
        :title="t('map.page.noCoordinatesTitle')"
        :message="t('map.page.noCoordinatesMessage')"
        icon="mdi-map-marker-off-outline"
      />

      <!-- Mobile-only: the selected action sits between the map and the
           full results list (never beside the map, see `showSidePanel`). -->
      <ActionMapMarkerPopup
        v-if="selectedAction && mobile"
        class="mt-4"
        :action="selectedAction"
        :distance="selectedActionDistance"
        @close="handleCloseSelected"
      />

      <h2 class="text-subtitle-1 font-weight-bold mt-6 mb-3">{{ t('map.page.resultsHeading') }}</h2>
      <VRow>
        <VCol v-for="action in displayResultsList" :key="action.id" cols="12" sm="6" md="4">
          <ActionCard :action="action" />
        </VCol>
      </VRow>
    </template>
  </DefaultLayout>
</template>

<style scoped>
.oh-map-view__top {
  display: flex;
  flex-direction: column;
}

/* Only ever applied on desktop/tablet (`showSidePanel` is always false on
   mobile) — the map keeps the larger ~2/3 column, the selected action
   panel takes the rest, matching the shared container's column rhythm. */
.oh-map-view__top--split {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  align-items: start;
  gap: var(--oh-space-md, 24px);
}

.oh-map-view__map-wrapper {
  height: 560px;
}

.oh-map-view__map-wrapper--mobile {
  height: 60vh;
  min-height: 320px;
}
</style>
