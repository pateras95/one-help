import { ROLES } from '@/constants/roles'

/**
 * Fictional mock users for the mocked authentication flow. Passwords
 * exist only in this fixture (for the mock login check) — the service
 * layer never returns them, and they are never persisted to
 * localStorage. None of this is real personal data.
 */
export const MOCK_USERS = [
  {
    id: 'user-volunteer-001',
    firstName: 'Δήμητρα',
    lastName: 'Παπαδοπούλου',
    email: 'volunteer@onehelp.local',
    password: 'Volunteer123!',
    role: ROLES.VOLUNTEER,
    avatarInitials: 'ΔΠ',
    localePreference: 'el',
    createdAt: '2026-01-15T10:00:00.000Z'
  },
  {
    id: 'user-organizer-001',
    firstName: 'Νίκος',
    lastName: 'Οικονόμου',
    email: 'organizer@onehelp.local',
    password: 'Organizer123!',
    role: ROLES.ORGANIZER,
    avatarInitials: 'ΝΟ',
    localePreference: 'el',
    createdAt: '2025-11-02T10:00:00.000Z'
  }
]

/**
 * Explicit, intentional exception to "don't import mocks directly into
 * views": the Login screen's development-only demo-credentials helper
 * needs to display these same values, and re-typing them there would
 * risk drifting out of sync with the actual fixture. Nothing else about
 * the fixtures (full records, other fields) should be imported this way.
 */
export const DEMO_CREDENTIALS = MOCK_USERS.map((user) => ({
  role: user.role,
  email: user.email,
  password: user.password
}))
