<script setup>
import { onMounted, watch } from 'vue'
import { useDisplay } from 'vuetify'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import OHPageHeader from '@/components/common/OHPageHeader.vue'
import OHButton from '@/components/common/OHButton.vue'
import LoadingState from '@/components/feedback/LoadingState.vue'
import EmptyState from '@/components/feedback/EmptyState.vue'
import ErrorState from '@/components/feedback/ErrorState.vue'
import ActionCard from '@/features/actions/components/ActionCard.vue'
import { useActionsStore } from '@/features/actions/stores/actions.store'
import { ACTION_CATEGORIES, isValidCategoryId } from '@/constants/actionCategories'
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
</script>

<template>
  <DefaultLayout>
    <OHPageHeader :title="t('actions.page.title')" :subtitle="t('actions.page.intro')" />

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

    <VExpansionPanels v-if="mobile" class="mb-4" variant="accordion">
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
              :model-value="actionsStore.sort"
              :label="t('actions.filters.sortLabel')"
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

    <VRow v-else class="mb-2" align="center">
      <VCol cols="12" sm="4" md="3">
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
      <VCol cols="12" sm="4" md="3">
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
      <VCol cols="12" sm="4" md="3">
        <VSelect
          :model-value="actionsStore.sort"
          :label="t('actions.filters.sortLabel')"
          :items="sortOptions.map((option) => ({ value: option.value, title: t(option.titleKey) }))"
          variant="outlined"
          density="comfortable"
          hide-details
          @update:model-value="actionsStore.setSort($event)"
        />
      </VCol>
      <VCol cols="12" md="3" class="text-md-right">
        <OHButton
          v-if="actionsStore.hasActiveFilters"
          variant="text"
          prepend-icon="mdi-filter-remove-outline"
          @click="actionsStore.resetFilters"
        >
          {{ t('actions.filters.reset') }}
        </OHButton>
      </VCol>
    </VRow>

    <div v-if="mobile && actionsStore.hasActiveFilters" class="mb-4">
      <OHButton variant="text" size="small" prepend-icon="mdi-filter-remove-outline" @click="actionsStore.resetFilters">
        {{ t('actions.filters.reset') }}
      </OHButton>
    </div>

    <p class="text-body-2 text-textSecondary mb-4">
      {{ t('actions.results.count', actionsStore.actions.length, { count: actionsStore.actions.length }) }}
    </p>

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
