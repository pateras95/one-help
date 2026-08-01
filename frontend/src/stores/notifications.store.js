import { ref } from 'vue'
import { defineStore } from 'pinia'

/**
 * Global notifications shared across unrelated screens (snackbar-style
 * confirmations and error messages), as opposed to local per-component
 * feedback state.
 */
export const useNotificationsStore = defineStore('notifications', () => {
  const notifications = ref([])

  /**
   * Queues a notification for display.
   *
   * @param {string} message
   * @param {Object} [options]
   * @param {'success'|'error'|'info'|'warning'} [options.type]
   * @param {number} [options.timeout] - Milliseconds before auto-dismiss.
   * @returns {string} The notification id, usable with `dismiss`.
   */
  function notify(message, options = {}) {
    const { type = 'info', timeout = 5000 } = options
    const id = crypto.randomUUID()
    notifications.value.push({ id, message, type, timeout })
    return id
  }

  function dismiss(id) {
    notifications.value = notifications.value.filter((notification) => notification.id !== id)
  }

  function clear() {
    notifications.value = []
  }

  return { notifications, notify, dismiss, clear }
})
