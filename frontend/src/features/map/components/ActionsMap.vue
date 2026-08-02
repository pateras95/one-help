<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { mapConfig } from '@/config/map'
import { getActionCategory } from '@/constants/actionCategories'
import { withValidCoordinates } from '../utils/mapCoordinates'

/**
 * Thin, lifecycle-safe wrapper around a raw Leaflet map. All direct
 * Leaflet/DOM access is deliberately isolated to this one component —
 * everything else in the map feature works with plain data.
 *
 * The Leaflet popup bound to each marker is intentionally minimal
 * (title + category only, built from an escaped HTML string) rather
 * than a mounted Vue component — Leaflet popups live outside Vue's
 * render tree, and mounting/unmounting a full Vue app per marker would
 * add real lifecycle risk for little benefit. The *rich* action details
 * (description, date, organizer, participation, status, link) are
 * rendered as a genuine Vue component elsewhere on the page —
 * `ActionMapMarkerPopup.vue`, used by `MapView.vue` as the "selected
 * action" panel — which also keeps that information available to
 * anyone who can't or doesn't interact with the map itself.
 */
const props = defineProps({
  // Localized public actions (may include ones with missing/invalid
  // coordinates — filtered internally, never trusted blindly).
  actions: {
    type: Array,
    required: true
  },
  selectedActionId: {
    type: String,
    default: null
  },
  userLocation: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['select-marker', 'tile-error'])

const { t, locale } = useI18n()

const mapContainer = ref(null)
let map = null
let markersLayer = null
let userMarker = null
const markersByActionId = new Map()

function escapeHtml(value) {
  const div = document.createElement('div')
  div.textContent = value ?? ''
  return div.innerHTML
}

function categoryIcon(action) {
  const category = getActionCategory(action.categoryId)
  const color = category ? `rgb(var(--v-theme-${category.accent}))` : 'rgb(var(--v-theme-textSecondary))'
  const icon = category?.icon ?? 'mdi-map-marker'
  return L.divIcon({
    className: 'oh-map-marker',
    html: `<span class="oh-map-marker__pin" style="background:${color}"><span class="mdi ${icon}" aria-hidden="true"></span></span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -28]
  })
}

function popupHtml(action) {
  const category = getActionCategory(action.categoryId)
  const categoryLabel = category ? escapeHtml(t(category.labelKey)) : ''
  return `<div class="oh-map-popup"><strong>${escapeHtml(action.title)}</strong>${categoryLabel ? `<div class="text-caption">${categoryLabel}</div>` : ''}</div>`
}

function fitToActions(validActions) {
  if (!map) return
  if (!validActions.length) {
    map.setView([mapConfig.greeceCenter.lat, mapConfig.greeceCenter.lng], mapConfig.greeceZoom)
    return
  }
  const bounds = L.latLngBounds(validActions.map((action) => [action.latitude, action.longitude]))
  map.fitBounds(bounds, { padding: [40, 40], maxZoom: mapConfig.defaultZoom })
}

function openSelectedPopup() {
  if (!props.selectedActionId) return
  const marker = markersByActionId.get(props.selectedActionId)
  if (marker) marker.openPopup()
}

function renderMarkers({ refit = false } = {}) {
  if (!map) return
  markersLayer.clearLayers()
  markersByActionId.clear()

  const validActions = withValidCoordinates(props.actions)
  for (const action of validActions) {
    const marker = L.marker([action.latitude, action.longitude], { icon: categoryIcon(action) })
    marker.bindPopup(popupHtml(action))
    marker.on('click', () => emit('select-marker', action.id))
    marker.addTo(markersLayer)
    markersByActionId.set(action.id, marker)
  }

  if (refit) fitToActions(validActions)
  openSelectedPopup()
}

function renderUserMarker() {
  if (!map) return
  if (userMarker) {
    userMarker.remove()
    userMarker = null
  }
  if (props.userLocation) {
    userMarker = L.marker([props.userLocation.lat, props.userLocation.lng], {
      icon: L.divIcon({
        className: 'oh-map-user-marker',
        html: '<span class="oh-map-user-marker__dot" aria-hidden="true"></span>',
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      }),
      keyboard: false,
      zIndexOffset: 1000
    })
    userMarker.bindTooltip(t('map.nearMe.markerTooltip'))
    userMarker.addTo(map)
  }
}

onMounted(() => {
  map = L.map(mapContainer.value, {
    center: [mapConfig.defaultCenter.lat, mapConfig.defaultCenter.lng],
    zoom: mapConfig.defaultZoom,
    minZoom: mapConfig.minZoom,
    maxZoom: mapConfig.maxZoom
  })

  const tileLayer = L.tileLayer(mapConfig.tileUrl, {
    attribution: mapConfig.attribution,
    maxZoom: mapConfig.maxZoom
  }).addTo(map)
  // Fires per failed tile (there can be many); the parent only needs to
  // know once that tiles may be incomplete, so it can show a single
  // non-blocking note without the map itself breaking.
  tileLayer.on('tileerror', () => emit('tile-error'))

  markersLayer = L.layerGroup().addTo(map)
  renderMarkers({ refit: true })
  renderUserMarker()
})

onBeforeUnmount(() => {
  if (userMarker) {
    userMarker.remove()
    userMarker = null
  }
  if (map) {
    map.remove()
    map = null
  }
  markersByActionId.clear()
})

// Rebuilds markers when the underlying action list changes (filters,
// organizer edits) — a plain (non-deep) watch is enough since the
// parent always passes a fresh array reference on every change.
watch(() => props.actions, () => renderMarkers({ refit: true }))

// Locale-only change: action text itself is re-fetched by the parent,
// but each popup's category label was baked into its HTML string at
// build time, so popups must be rebuilt to pick up the new language.
watch(locale, () => renderMarkers())

watch(
  () => props.selectedActionId,
  () => openSelectedPopup()
)

watch(
  () => props.userLocation,
  () => {
    renderUserMarker()
    if (props.userLocation && map) {
      map.setView([props.userLocation.lat, props.userLocation.lng], mapConfig.defaultZoom)
    }
  }
)

/** Call after the map container becomes visible/resized without Leaflet knowing (e.g. a hidden tab). */
function invalidateSize() {
  map?.invalidateSize()
}

defineExpose({ invalidateSize })
</script>

<template>
  <div ref="mapContainer" class="oh-actions-map" role="application" :aria-label="t('map.page.mapAriaLabel')" />
</template>

<style scoped>
.oh-actions-map {
  width: 100%;
  height: 100%;
  border-radius: var(--oh-radius-sm, 8px);
}
</style>

<style>
/* Unscoped: Leaflet appends marker/popup DOM outside this component's
   template, so Vue's scoped-style attribute selectors never reach it. */
.oh-map-marker__pin {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
  border: 2px solid white;
}

.oh-map-marker__pin .mdi {
  transform: rotate(45deg);
  color: white;
  font-size: 16px;
}

.oh-map-user-marker__dot {
  display: block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #1a73e8;
  border: 3px solid white;
  box-shadow: 0 0 0 2px #1a73e8, 0 1px 4px rgba(0, 0, 0, 0.4);
}

.oh-map-popup {
  font-family: inherit;
}
</style>
