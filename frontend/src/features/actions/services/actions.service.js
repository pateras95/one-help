import { mockResponse } from '@/utils/mockResponse'
import { startOfDay, isPastDate } from '@/utils/date'
import { getMergedActions } from '@/features/organizer/mocks/organizerActions.storage'
import { getOrganizationByOrganizerId } from '@/features/admin/mocks/organizations.storage'
import { ORGANIZER_ACTION_STATUS } from '@/features/organizer/utils/organizerActionStatus'
import { isActionPubliclyVisible } from '../utils/actionVisibility'

/**
 * Public-safe organization details for Action Details' "About the
 * organization" section — resolved via the action's `organizerId`
 * (never itself exposed to the client, same as before this field
 * existed). `null` for the rare case an action's organizer has no
 * resolvable organization record.
 */
function buildOrganizationDetails(action, lang) {
  const organization = getOrganizationByOrganizerId(action.organizerId)
  if (!organization) return null
  return {
    name: organization.name[lang] ?? organization.name.el,
    organizationType: organization.organizationType ?? null,
    description: organization.description[lang] ?? organization.description.el,
    contactEmail: organization.contactEmail,
    phone: organization.phone ?? null,
    website: organization.website ?? null,
    municipality: organization.municipality ?? null
  }
}

/**
 * Derives the public-facing status from the organizer lifecycle status
 * plus date/capacity, rather than storing it (avoids drift). A
 * `closed` organizer status always wins over date/capacity — an
 * organizer closing an action makes it unavailable regardless of
 * whether it would otherwise still read as open.
 */
function computeStatus(action) {
  if (action.organizerStatus === ORGANIZER_ACTION_STATUS.CLOSED) return 'closed'
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
    status: computeStatus(action),
    organizationDetails: buildOrganizationDetails(action, lang)
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

  const localized = getMergedActions()
    .filter(isActionPubliclyVisible)
    .map((action) => localizeAction(action, locale))
  const filtered = localized
    .filter((action) => matchesCategory(action, category))
    .filter((action) => matchesSearch(action, search))
    .filter((action) => matchesDatePreset(action, datePreset))

  return mockResponse(sortActions(filtered, sort))
}

/**
 * Fetches a single action by id. Resolves with `null` (not a rejection)
 * when the id doesn't exist, or exists but isn't publicly visible
 * (draft/cancelled) — both read as "not found" to a public visitor.
 *
 * @param {string} id
 * @param {'el'|'en'} [locale]
 * @returns {Promise<Object|null>}
 */
export async function getActionById(id, locale = 'el') {
  const found = getMergedActions().find((action) => action.id === id)
  const visible = found && isActionPubliclyVisible(found) ? found : null
  return mockResponse(visible ? localizeAction(visible, locale) : null)
}
