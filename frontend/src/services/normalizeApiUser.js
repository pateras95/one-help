/**
 * The backend serializes `role`/`status` as its Java enum's `name()`
 * (`"VOLUNTEER"`, `"ACTIVE"`) — the frontend's own `ROLES`/`ACCOUNT_STATUS`
 * vocabulary has always been lowercase (`'volunteer'`, `'active'`, per
 * `constants/roles.js`/`admin/utils/accountStatus.js`). Every role/`hasRole()`
 * check in the app compares against the lowercase constants, so any backend user
 * object must be normalized to that casing at the seam where it enters the app.
 *
 * Shared by `auth.service.js` (login/register/refresh/me) and `http.js` (the
 * 401-triggered silent-refresh interceptor, which calls the refresh endpoint
 * directly rather than through `auth.service.js` — see that file for why) so
 * there is exactly one place this mapping is defined.
 *
 * @param {Object} apiUser
 * @returns {Object}
 */
export function normalizeApiUser(apiUser) {
  if (!apiUser) return apiUser
  return {
    ...apiUser,
    role: apiUser.role?.toLowerCase(),
    status: apiUser.status?.toLowerCase()
  }
}
