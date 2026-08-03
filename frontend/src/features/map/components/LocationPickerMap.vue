<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { mapConfig } from '@/config/map'

/**
 * Reusable click/drag Leaflet location picker for the organizer form.
 * Deliberately separate from `ActionsMap.vue` — that component renders
 * many category markers plus popups/selection state; this one only ever
 * shows a single draggable marker and reports it back to the parent, so
 * sharing one "do everything" component would mean threading a pile of
 * picker-only props through the read-only map. Both share the same
 * `mapConfig` (tile URL/attribution/zoom/Greece fallback), so the tile
 * provider still only needs to change in one place.
 *
 * Fully prop-driven ("controlled"): the marker is placed/moved locally
 * on click/drag for immediate visual feedback, but its source of truth
 * is always `latitude`/`longitude` — an external change (edit-mode load,
 * or the form's "Clear location" button) is picked up by the watcher
 * below and re-syncs the marker, including removing it entirely.
 */
const props = defineProps({
  latitude: {
    type: Number,
    default: null
  },
  longitude: {
    type: Number,
    default: null
  }
})

const emit = defineEmits(['update:location'])

const { t } = useI18n()

const mapContainer = ref(null)
let map = null
let marker = null

function markerIcon() {
  return L.divIcon({
    className: 'oh-location-picker-marker',
    html: '<span class="oh-location-picker-marker__pin" aria-hidden="true"><span class="mdi mdi-map-marker" aria-hidden="true"></span></span>',
    iconSize: [30, 30],
    iconAnchor: [15, 30]
  })
}

function placeMarker(lat, lng) {
  if (marker) {
    marker.setLatLng([lat, lng])
    return
  }
  marker = L.marker([lat, lng], { icon: markerIcon(), draggable: true, keyboard: false })
  marker.on('dragend', () => {
    const { lat: newLat, lng: newLng } = marker.getLatLng().wrap()
    emit('update:location', { lat: newLat, lng: newLng })
  })
  marker.addTo(map)
}

function removeMarker() {
  if (marker) {
    marker.remove()
    marker = null
  }
}

/** Re-syncs the marker from props — used for edit-mode load and for an
 * external clear/reset, never for our own click/drag (those already
 * update the marker locally before emitting). */
function syncMarkerFromProps() {
  if (!map) return
  if (props.latitude != null && props.longitude != null) {
    placeMarker(props.latitude, props.longitude)
  } else {
    removeMarker()
  }
}

function handleMapClick(event) {
  const { lat, lng } = event.latlng.wrap()
  placeMarker(lat, lng)
  emit('update:location', { lat, lng })
}

onMounted(() => {
  const hasInitial = props.latitude != null && props.longitude != null
  map = L.map(mapContainer.value, {
    center: hasInitial ? [props.latitude, props.longitude] : [mapConfig.greeceCenter.lat, mapConfig.greeceCenter.lng],
    zoom: hasInitial ? mapConfig.defaultZoom : mapConfig.greeceZoom,
    minZoom: mapConfig.minZoom,
    maxZoom: mapConfig.maxZoom
  })

  L.tileLayer(mapConfig.tileUrl, {
    attribution: mapConfig.attribution,
    maxZoom: mapConfig.maxZoom
  }).addTo(map)

  map.on('click', handleMapClick)

  syncMarkerFromProps()
})

onBeforeUnmount(() => {
  if (map) {
    map.off('click', handleMapClick)
    map.remove()
    map = null
  }
  marker = null
})

// Edit-mode load and the form's "Clear location" both change the props
// from outside — re-sync the marker (or remove it) accordingly.
watch(() => [props.latitude, props.longitude], syncMarkerFromProps)

/** Call after the picker's container becomes visible/resized (e.g. an
 * accordion/tab reveal) without Leaflet's own resize detection noticing. */
function invalidateSize() {
  map?.invalidateSize()
}

defineExpose({ invalidateSize })
</script>

<template>
  <div
    ref="mapContainer"
    class="oh-location-picker-map"
    role="application"
    :aria-label="t('map.organizerForm.pickerAriaLabel')"
  />
</template>

<style scoped>
.oh-location-picker-map {
  width: 100%;
  height: 100%;
  min-height: 240px;
  border-radius: var(--oh-radius-sm, 8px);
}
</style>

<style>
/* Unscoped: Leaflet appends marker DOM outside this component's
   template, so Vue's scoped-style attribute selectors never reach it. */
.oh-location-picker-marker__pin {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  background: rgb(var(--v-theme-primary));
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
  border: 2px solid white;
  cursor: grab;
}

.oh-location-picker-marker__pin .mdi {
  transform: rotate(45deg);
  color: white;
  font-size: 16px;
}
</style>
