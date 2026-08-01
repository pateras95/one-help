import axios from 'axios'

/**
 * Shared Axios instance for future backend integration.
 *
 * Not called by any service yet during the frontend-only phase — mock
 * services simulate responses instead. Keeping the instance configured now
 * means feature services can switch from mocks to real requests without
 * changing their public API.
 */
export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000
})
