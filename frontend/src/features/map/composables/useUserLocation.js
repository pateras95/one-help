import { ref } from 'vue'

/** Stable geolocation lookup states — compare against these instead of raw strings. */
export const GEOLOCATION_STATE = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  DENIED: 'denied',
  UNAVAILABLE: 'unavailable',
  TIMEOUT: 'timeout'
}

/**
 * One-time (never continuous) browser geolocation lookup, triggered
 * only by calling `locate()` — never on mount, so permission is only
 * ever requested after an explicit user interaction.
 *
 * The resulting coordinates live only in this composable's in-memory
 * `position` ref for as long as the consuming component needs them —
 * never written to `localStorage`, never sent anywhere.
 *
 * @returns {{state: import('vue').Ref<string>, position: import('vue').Ref<{lat: number, lng: number, accuracyMeters: number}|null>, locate: () => void, reset: () => void}}
 */
export function useUserLocation() {
  const state = ref(GEOLOCATION_STATE.IDLE)
  const position = ref(null)

  function reset() {
    state.value = GEOLOCATION_STATE.IDLE
    position.value = null
  }

  function locate() {
    if (!('geolocation' in navigator)) {
      state.value = GEOLOCATION_STATE.UNAVAILABLE
      return
    }

    state.value = GEOLOCATION_STATE.LOADING

    navigator.geolocation.getCurrentPosition(
      (result) => {
        position.value = {
          lat: result.coords.latitude,
          lng: result.coords.longitude,
          accuracyMeters: result.coords.accuracy
        }
        state.value = GEOLOCATION_STATE.SUCCESS
      },
      (err) => {
        position.value = null
        if (err.code === err.PERMISSION_DENIED) {
          state.value = GEOLOCATION_STATE.DENIED
        } else if (err.code === err.TIMEOUT) {
          state.value = GEOLOCATION_STATE.TIMEOUT
        } else {
          state.value = GEOLOCATION_STATE.UNAVAILABLE
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  return { state, position, locate, reset }
}
