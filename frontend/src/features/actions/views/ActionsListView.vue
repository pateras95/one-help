<script setup>
import { computed, onMounted, watch } from 'vue'
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
import { ACTION_CATEGORIES, isValidCategoryId, getActionCategory } from '@/constants/actionCategories'
import { ROUTES } from '@/constants/routes'

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

const sortOptions = [
  { value: 'soonest', titleKey: 'actions.filters.sortSoonest' },
  { value: 'newest', titleKey: 'actions.filters.sortNewest' }
]

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

// Keeps the URL shareable and refresh-persistent for category/search,
// without spamming browser history on every keystroke (uses replace).
watch(
  () => [actionsStore.category, actionsStore.search],
  ([nextCategory, nextSearch]) => {
    if (isApplyingQuery) return
    const query = {}
    if (nextCategory) query.category = nextCategory
    if (nextSearch) query.search = nextSearch
    router.replace({ path: ROUTES.ACTIONS, query })
  }
)

// A scannable summary of what's currently narrowing the results —
// presentational only, each chip removes just its own filter.
const activeFilterChips = computed(() => {
  const chips = []
  if (actionsStore.category) {
    const category = getActionCategory(actionsStore.category)
    chips.push({ key: 'category', label: category ? t(category.labelKey) : actionsStore.category, clear: () => actionsStore.setCategory('') })
  }
  if (actionsStore.datePreset && actionsStore.datePreset !== 'all') {
    const option = dateOptions.find((o) => o.value === actionsStore.datePreset)
    chips.push({ key: 'date', label: option ? t(option.titleKey) : actionsStore.datePreset, clear: () => actionsStore.setDatePreset('all') })
  }
  if (actionsStore.search) {
    chips.push({ key: 'search', label: `"${actionsStore.search}"`, clear: () => actionsStore.setSearch('') })
  }
  return chips
})
</script>

<template>
  <DefaultLayout>
    <OHPageHeader eyebrow="OneHelp" :title="t('actions.page.title')" :subtitle="t('actions.page.intro')" />

    <OHCard class="oh-discovery pa-4 pa-md-5 mb-6">
      <VTextField
        class="oh-discovery__search mb-4"
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
                prepend-inner-icon="mdi-shape-outline"
                :items="[{ value: '', title: t('actions.filters.categoryAll') }, ...ACTION_CATEGORIES.map((c) => ({ value: c.id, title: t(c.labelKey) }))]"
                variant="outlined"
                density="comfortable"
                hide-details
                @update:model-value="actionsStore.setCategory($event)"
              />
              <VSelect
                :model-value="actionsStore.datePreset"
                :label="t('actions.filters.dateLabel')"
                prepend-inner-icon="mdi-calendar-outline"
                :items="dateOptions.map((option) => ({ value: option.value, title: t(option.titleKey) }))"
                variant="outlined"
                density="comfortable"
                hide-details
                @update:model-value="actionsStore.setDatePreset($event)"
              />
              <VSelect
                :model-value="actionsStore.sort"
                :label="t('actions.filters.sortLabel')"
                prepend-inner-icon="mdi-sort"
                :items="sortOptions.map((option) => ({ value: option.value, title: t(option.titleKey) }))"
                variant="outlined"
                density="comfortable"
                hide-details
                @update:model-value="actionsStore.setSort($event)"
              />
            </div>
          </template>
        </VExpansionPanel>
      </VExpansionPanels>

      <VRow v-else align="center" class="ga-0">
        <VCol cols="4">
          <VSelect
            :model-value="actionsStore.category"
            :label="t('actions.filters.categoryLabel')"
            prepend-inner-icon="mdi-shape-outline"
            :items="[{ value: '', title: t('actions.filters.categoryAll') }, ...ACTION_CATEGORIES.map((c) => ({ value: c.id, title: t(c.labelKey) }))]"
            variant="outlined"
            density="comfortable"
            hide-details
            @update:model-value="actionsStore.setCategory($event)"
          />
        </VCol>
        <VCol cols="4">
          <VSelect
            :model-value="actionsStore.datePreset"
            :label="t('actions.filters.dateLabel')"
            prepend-inner-icon="mdi-calendar-outline"
            :items="dateOptions.map((option) => ({ value: option.value, title: t(option.titleKey) }))"
            variant="outlined"
            density="comfortable"
            hide-details
            @update:model-value="actionsStore.setDatePreset($event)"
          />
        </VCol>
        <VCol cols="4">
          <VSelect
            :model-value="actionsStore.sort"
            :label="t('actions.filters.sortLabel')"
            prepend-inner-icon="mdi-sort"
            :items="sortOptions.map((option) => ({ value: option.value, title: t(option.titleKey) }))"
            variant="outlined"
            density="comfortable"
            hide-details
            @update:model-value="actionsStore.setSort($event)"
          />
        </VCol>
      </VRow>

      <div v-if="activeFilterChips.length" class="d-flex flex-wrap align-center ga-2 mt-4">
        <span class="text-caption text-textSecondary font-weight-bold">{{ t('actions.filters.activeFilters') }}</span>
        <VChip
          v-for="chip in activeFilterChips"
          :key="chip.key"
          size="small"
          variant="tonal"
          color="primary"
          closable
          @click:close="chip.clear"
        >
          {{ chip.label }}
        </VChip>
        <OHButton variant="text" size="small" prepend-icon="mdi-filter-remove-outline" @click="actionsStore.resetFilters">
          {{ t('actions.filters.reset') }}
        </OHButton>
      </div>
    </OHCard>

    <div class="d-flex align-center ga-2 mb-4">
      <VIcon icon="mdi-hand-heart-outline" size="18" color="secondary" aria-hidden="true" />
      <p class="text-body-2 text-textSecondary mb-0">
        {{ t('actions.results.count', actionsStore.actions.length, { count: actionsStore.actions.length }) }}
      </p>
    </div>

    <LoadingState v-if="actionsStore.loading" :label="t('actions.results.loading')" />

    <ErrorState
      v-else-if="actionsStore.error"
      :title="t('actions.results.errorTitle')"
      :message="t('actions.results.errorMessage')"
      @retry="actionsStore.fetchActions"
    />

    <EmptyState
      v-else-if="actionsStore.actions.length === 0"
      :title="t('actions.results.emptyTitle')"
      :message="t('actions.results.emptyMessage')"
      icon="mdi-hand-heart-outline"
      :tone="actionsStore.hasActiveFilters ? 'search' : 'neutral'"
    />

    <VRow v-else>
      <VCol
        v-for="action in actionsStore.actions"
        :key="action.id"
        cols="12"
        sm="6"
        md="4"
      >
        <ActionCard :action="action" />
      </VCol>
    </VRow>
  </DefaultLayout>
</template>

<style scoped>
.oh-discovery {
  border-radius: var(--oh-radius-lg);
}

.oh-discovery__search :deep(.v-field) {
  font-size: 1rem;
}
</style>
