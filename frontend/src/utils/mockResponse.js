/**
 * Simulates an asynchronous backend response with a realistic delay.
 *
 * Feature mock services should resolve/reject through this helper so every
 * mock behaves consistently and can later be swapped for a real Axios call
 * without changing the calling code's contract.
 *
 * @template T
 * @param {T} data - Payload to resolve with when the mock succeeds.
 * @param {Object} [options]
 * @param {number} [options.delay] - Simulated latency in milliseconds.
 * @param {boolean} [options.shouldFail] - Reject instead of resolving.
 * @param {string} [options.errorMessage] - Message used when rejecting.
 * @returns {Promise<T>}
 */
export function mockResponse(data, options = {}) {
  const {
    delay = 400,
    shouldFail = false,
    errorMessage = 'Το αίτημα απέτυχε.'
  } = options

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (shouldFail) {
        reject(new Error(errorMessage))
      } else {
        resolve(data)
      }
    }, delay)
  })
}
