import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { i18n } from '@/plugins/i18n'
import { getActions, getActionById } from '../services/actions.service'

const SEARCH_DEBOUNCE_MS = 300

/**
 * Owns Actions-domain async state shared across the list and details
 * screens. Filtering/sorting itself lives in `actions.service.js` (so the
 * logic isn't duplicated here) — this store just tracks the current
 * filter selections and the result of the last matching fetch, which
 * doubles as "the filtered actions" since the service already applied
 * the filters before returning.
 *
 * Purely visual state (dialog open/closed, hover, local sheet visibility)
 * does not belong here — keep that in the component.
 */
export const useActionsStore = defineStore('actions', () => {
  const actions = ref([])
  const loading = ref(false)
  const error = ref(null)

  const category = ref('')
  const search = ref('')
  const datePreset = ref('all')
  const sort = ref('soonest')

  const currentAction = ref(null)
  const currentActionId = ref(null)
  const currentActionLoading = ref(false)
  const currentActionError = ref(null)

  let searchDebounceHandle = null

  const hasActiveFilters = computed(
    () => Boolean(category.value || search.value || datePreset.value !== 'all')
  )

  async function fetchActions() {
    loading.value = true
    error.value = null
    try {
      actions.value = await getActions({
        category: category.value,
        search: search.value,
        datePreset: datePreset.value,
        sort: sort.value,
        locale: i18n.global.locale.value
      })
    } catch (err) {
      error.value = err.message
      actions.value = []
    } finally {
      loading.value = false
    }
  }

  function setCategory(nextCategory) {
    category.value = nextCategory
    fetchActions()
  }

  function setSearch(nextSearch) {
    search.value = nextSearch
    clearTimeout(searchDebounceHandle)
    searchDebounceHandle = setTimeout(fetchActions, SEARCH_DEBOUNCE_MS)
  }

  function setDatePreset(nextDatePreset) {
    datePreset.value = nextDatePreset
    fetchActions()
  }

  function setSort(nextSort) {
    sort.value = nextSort
    fetchActions()
  }

  function resetFilters() {
    category.value = ''
    search.value = ''
    datePreset.value = 'all'
    sort.value = 'soonest'
    fetchActions()
  }

  /**
   * Applies an initial category/search pair (already validated by the
   * caller — this store doesn't know what a valid category id is) and
   * fetches once. Used when the Actions page loads with query params.
   */
  function initFromQuery({ category: queryCategory, search: querySearch } = {}) {
    if (queryCategory) category.value = queryCategory
    if (querySearch) search.value = querySearch
    fetchActions()
  }

  async function fetchActionById(id) {
    currentActionId.value = id
    currentActionLoading.value = true
    currentActionError.value = null
    currentAction.value = null
    try {
      currentAction.value = await getActionById(id, i18n.global.locale.value)
    } catch (err) {
      currentActionError.value = err.message
    } finally {
      currentActionLoading.value = false
    }
  }

  // Re-fetch in the new language when the user switches locale, so
  // whichever screen (list or details) is active stays translated.
  watch(
    () => i18n.global.locale.value,
    () => {
      if (actions.value.length || loading.value) fetchActions()
      if (currentActionId.value) fetchActionById(currentActionId.value)
    }
  )

  return {
    actions,
    loading,
    error,
    category,
    search,
    datePreset,
    sort,
    hasActiveFilters,
    currentAction,
    currentActionLoading,
    currentActionError,
    fetchActions,
    setCategory,
    setSearch,
    setDatePreset,
    setSort,
    resetFilters,
    initFromQuery,
    fetchActionById
  }
})
