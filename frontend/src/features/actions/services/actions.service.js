import { mockResponse } from '@/utils/mockResponse'
import { startOfDay, isPastDate } from '@/utils/date'
import { MOCK_ACTIONS } from '../mocks/actions.mock'

/** Derives status from date + capacity rather than storing it (avoids drift). */
function computeStatus(action) {
  if (isPastDate(action.date)) return 'completed'
  if (action.registeredCount >= action.capacity) return 'full'
  return 'open'
}

/** Picks the active locale's text out of each bilingual `{ el, en }` field. */
function localizeAction(action, locale) {
  const lang = locale === 'en' ? 'en' : 'el'
  return {
    id: action.id,
    categoryId: action.categoryId,
    organization: action.organization[lang] ?? action.organization.el,
    title: action.title[lang] ?? action.title.el,
    description: action.description[lang] ?? action.description.el,
    locationName: action.locationName[lang] ?? action.locationName.el,
    municipality: action.municipality[lang] ?? action.municipality.el,
    latitude: action.latitude,
    longitude: action.longitude,
    date: action.date,
    startTime: action.startTime,
    capacity: action.capacity,
    registeredCount: action.registeredCount,
    urgency: action.urgency,
    requiredEquipment: action.requiredEquipment[lang] ?? action.requiredEquipment.el,
    status: computeStatus(action)
  }
}

function matchesCategory(action, category) {
  return !category || action.categoryId === category
}

function matchesSearch(action, search) {
  const query = search?.trim().toLowerCase()
  if (!query) return true
  return (
    action.title.toLowerCase().includes(query) ||
    action.locationName.toLowerCase().includes(query) ||
    action.municipality.toLowerCase().includes(query)
  )
}

/** 'today' | 'week' (next 7 days) | 'month' (next 31 days) | 'all'/anything else. */
function matchesDatePreset(action, datePreset) {
  if (!datePreset || datePreset === 'all') return true
  const today = startOfDay(new Date())
  const actionDate = startOfDay(action.date)
  const daysDiff = Math.round((actionDate - today) / 86400000)
  if (datePreset === 'today') return daysDiff === 0
  if (datePreset === 'week') return daysDiff >= 0 && daysDiff <= 6
  if (datePreset === 'month') return daysDiff >= 0 && daysDiff <= 30
  return true
}

/**
 * 'newest' uses id order as a stand-in for "recently added" — this mock
 * data has no real creation timestamp. 'soonest' (default) sorts by
 * event date.
 */
function sortActions(list, sort) {
  const sorted = [...list]
  if (sort === 'newest') {
    sorted.sort((a, b) => b.id.localeCompare(a.id))
  } else {
    sorted.sort((a, b) => new Date(a.date) - new Date(b.date))
  }
  return sorted
}

/**
 * Fetches actions matching the given filters — simulates a backend query
 * so the store's calling contract won't need to change when a real API
 * replaces this service.
 *
 * @param {Object} [filters]
 * @param {string} [filters.category] - Category id, or falsy for all.
 * @param {string} [filters.search] - Free-text query (title/location).
 * @param {'all'|'today'|'week'|'month'} [filters.datePreset]
 * @param {'soonest'|'newest'} [filters.sort]
 * @param {'el'|'en'} [filters.locale]
 * @returns {Promise<Array>}
 */
export async function getActions(filters = {}) {
  const { category, search, datePreset = 'all', sort = 'soonest', locale = 'el' } = filters

  const localized = MOCK_ACTIONS.map((action) => localizeAction(action, locale))
  const filtered = localized
    .filter((action) => matchesCategory(action, category))
    .filter((action) => matchesSearch(action, search))
    .filter((action) => matchesDatePreset(action, datePreset))

  return mockResponse(sortActions(filtered, sort))
}

/**
 * Fetches a single action by id. Resolves with `null` (not a rejection)
 * when the id doesn't exist — that's a "not found" result, not an error.
 *
 * @param {string} id
 * @param {'el'|'en'} [locale]
 * @returns {Promise<Object|null>}
 */
export async function getActionById(id, locale = 'el') {
  const found = MOCK_ACTIONS.find((action) => action.id === id)
  return mockResponse(found ? localizeAction(found, locale) : null)
}
