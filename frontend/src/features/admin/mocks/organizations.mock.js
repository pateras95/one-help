import { ORGANIZATION_STATUS } from '../utils/organizationStatus'

/**
 * Fictional mock organizations. One per `organizerId` already referenced
 * by `actions.mock.js` (seeded `approved`, so today's public visibility
 * doesn't change), plus three brand-new organizations with no existing
 * actions — used purely to exercise the admin approve/reject/suspend
 * workflow without touching any of the original 13 actions.
 *
 * `organizerUserId` only corresponds to a real, loggable-in account for
 * `user-organizer-001` — every other id here (including the three new
 * ones) is a fictional organizer with no login of their own, same
 * convention as `actions.mock.js`.
 *
 * All organizations, names and contact details below are entirely
 * fictional.
 */
export const MOCK_ORGANIZATIONS = [
  {
    id: 'org-001',
    organizerUserId: 'user-organizer-001',
    name: { el: 'Χείρα Βοήθειας Αθήνας', en: 'Helping Hand Athens' },
    description: {
      el: 'Οργάνωση εθελοντισμού με έδρα την Αθήνα, ενεργή σε δράσεις υγείας και κοινωνικής αλληλεγγύης.',
      en: 'Athens-based volunteering organization, active in health and social solidarity actions.'
    },
    contactEmail: 'contact@helpinghand-athens.example',
    status: ORGANIZATION_STATUS.APPROVED,
    submittedAt: '2025-11-01T09:00:00.000Z',
    reviewedAt: '2025-11-02T09:30:00.000Z',
    reviewedBy: 'user-admin-001'
  },
  {
    id: 'org-002',
    organizerUserId: 'org-ext-002',
    name: { el: 'Πράσινη Πόλη Θεσσαλονίκης', en: 'Green City Thessaloniki' },
    description: {
      el: 'Ομάδα πολιτών για τον καθαρισμό και την προστασία του αστικού περιβάλλοντος της Θεσσαλονίκης.',
      en: "Citizen group for cleaning up and protecting Thessaloniki's urban environment."
    },
    contactEmail: 'info@greencity-thessaloniki.example',
    status: ORGANIZATION_STATUS.APPROVED,
    submittedAt: '2025-10-10T09:00:00.000Z',
    reviewedAt: '2025-10-11T10:00:00.000Z',
    reviewedBy: 'user-admin-001'
  },
  {
    id: 'org-003',
    organizerUserId: 'org-ext-003',
    name: { el: 'Κοινωνικό Δίκτυο Αλληλεγγύης Πάτρας', en: 'Patras Solidarity Network' },
    description: {
      el: 'Δίκτυο εθελοντών που στηρίζει κοινωνικά παντοπωλεία και οικογένειες σε ανάγκη στην Πάτρα.',
      en: 'Volunteer network supporting community pantries and families in need in Patras.'
    },
    contactEmail: 'info@patras-solidarity.example',
    status: ORGANIZATION_STATUS.APPROVED,
    submittedAt: '2025-09-20T09:00:00.000Z',
    reviewedAt: '2025-09-21T10:00:00.000Z',
    reviewedBy: 'user-admin-001'
  },
  {
    id: 'org-004',
    organizerUserId: 'org-ext-004',
    name: { el: 'Φιλοζωική Κρήτης', en: 'Crete Animal Welfare' },
    description: {
      el: 'Οργάνωση φροντίδας αδέσποτων ζώων και διαχείρισης καταφυγίων στην Κρήτη.',
      en: 'Stray animal care and shelter management organization based in Crete.'
    },
    contactEmail: 'info@crete-animalwelfare.example',
    status: ORGANIZATION_STATUS.APPROVED,
    submittedAt: '2025-08-15T09:00:00.000Z',
    reviewedAt: '2025-08-16T10:00:00.000Z',
    reviewedBy: 'user-admin-001'
  },
  {
    id: 'org-005',
    organizerUserId: 'org-ext-005',
    name: { el: 'Ομάδα Άμεσης Επέμβασης Βόλου', en: 'Volos Rapid Response Team' },
    description: {
      el: 'Εθελοντική ομάδα πολιτικής προστασίας για φυσικές καταστροφές στην περιοχή του Βόλου.',
      en: 'Volunteer civil-protection team for natural emergencies in the Volos area.'
    },
    contactEmail: 'info@volos-rapidresponse.example',
    status: ORGANIZATION_STATUS.APPROVED,
    submittedAt: '2025-07-05T09:00:00.000Z',
    reviewedAt: '2025-07-06T10:00:00.000Z',
    reviewedBy: 'user-admin-001'
  },
  {
    id: 'org-006',
    organizerUserId: 'org-ext-006',
    name: { el: 'Υγεία για Όλους Λάρισας', en: 'Health For All Larissa' },
    description: {
      el: 'Οργάνωση εθελοντικής φροντίδας και συντροφιάς για ηλικιωμένους στη Λάρισα.',
      en: 'Volunteer care and companionship organization for older adults in Larissa.'
    },
    contactEmail: 'info@healthforall-larissa.example',
    status: ORGANIZATION_STATUS.APPROVED,
    submittedAt: '2025-06-01T09:00:00.000Z',
    reviewedAt: '2025-06-02T10:00:00.000Z',
    reviewedBy: 'user-admin-001'
  },
  {
    id: 'org-007',
    organizerUserId: 'org-ext-007',
    name: { el: 'Αναδάσωση Ηπείρου', en: 'Epirus Reforestation' },
    description: {
      el: 'Ομάδα εθελοντών αναδάσωσης περιοχών που έχουν πληγεί από πυρκαγιές στην Ήπειρο.',
      en: 'Volunteer reforestation group for fire-affected areas in Epirus.'
    },
    contactEmail: 'info@epirus-reforestation.example',
    status: ORGANIZATION_STATUS.APPROVED,
    submittedAt: '2025-05-12T09:00:00.000Z',
    reviewedAt: '2025-05-13T10:00:00.000Z',
    reviewedBy: 'user-admin-001'
  },
  {
    id: 'org-009',
    organizerUserId: 'org-ext-009',
    name: { el: 'Ουρές Χαράς Θεσσαλονίκης', en: 'Thessaloniki Wagging Tails' },
    description: {
      el: 'Καταφύγιο και ομάδα εθελοντών φροντίδας αδέσποτων ζώων στη Θεσσαλονίκη.',
      en: 'Shelter and volunteer care group for stray animals in Thessaloniki.'
    },
    contactEmail: 'info@waggingtails-thessaloniki.example',
    status: ORGANIZATION_STATUS.APPROVED,
    submittedAt: '2025-04-18T09:00:00.000Z',
    reviewedAt: '2025-04-19T10:00:00.000Z',
    reviewedBy: 'user-admin-001'
  },
  {
    id: 'org-010',
    organizerUserId: 'org-ext-010',
    name: { el: 'Εθελοντές Πολιτικής Προστασίας Καβάλας', en: 'Kavala Civil Protection Volunteers' },
    description: {
      el: 'Εκπαιδευμένοι εθελοντές επιτήρησης και πρόληψης δασικών πυρκαγιών στην Καβάλα.',
      en: 'Trained volunteer wildfire lookout and prevention team in Kavala.'
    },
    contactEmail: 'info@kavala-civilprotection.example',
    status: ORGANIZATION_STATUS.APPROVED,
    submittedAt: '2025-03-22T09:00:00.000Z',
    reviewedAt: '2025-03-23T10:00:00.000Z',
    reviewedBy: 'user-admin-001'
  },
  {
    id: 'org-011',
    organizerUserId: 'org-ext-011',
    name: { el: 'Χαμόγελο Υγείας Πάτρας', en: 'Patras Health Smile' },
    description: {
      el: 'Οργάνωση εθελοντών υγείας που διοργανώνει εργαστήρια πρώτων βοηθειών στην Πάτρα.',
      en: 'Health volunteer organization running first-aid workshops in Patras.'
    },
    contactEmail: 'info@healthsmile-patras.example',
    status: ORGANIZATION_STATUS.APPROVED,
    submittedAt: '2025-02-14T09:00:00.000Z',
    reviewedAt: '2025-02-15T10:00:00.000Z',
    reviewedBy: 'user-admin-001'
  },
  {
    id: 'org-pending-001',
    organizerUserId: 'org-pending-001',
    name: { el: 'Νέοι Ορίζοντες Εθελοντισμού', en: 'New Horizons Volunteering' },
    description: {
      el: 'Νεοσύστατη ομάδα εθελοντών που αιτείται έγκριση για να ξεκινήσει τη δημοσίευση δράσεων.',
      en: 'Newly formed volunteer group applying for approval to start publishing actions.'
    },
    contactEmail: 'info@newhorizons-volunteering.example',
    status: ORGANIZATION_STATUS.PENDING,
    submittedAt: '2026-07-28T09:00:00.000Z',
    reviewedAt: null,
    reviewedBy: null
  },
  {
    id: 'org-rejected-001',
    organizerUserId: 'org-rejected-001',
    name: { el: 'Ψηφιακή Αλληλεγγύη', en: 'Digital Solidarity' },
    description: {
      el: 'Αίτηση οργάνωσης που δεν παρείχε επαρκή στοιχεία επικοινωνίας κατά την αξιολόγηση.',
      en: 'Organization application that did not provide sufficient contact details during review.'
    },
    contactEmail: 'unverified@example.invalid',
    status: ORGANIZATION_STATUS.REJECTED,
    submittedAt: '2026-07-15T09:00:00.000Z',
    reviewedAt: '2026-07-18T11:00:00.000Z',
    reviewedBy: 'user-admin-001',
    rejectionReason: 'Ανεπαρκή στοιχεία επικοινωνίας για επαλήθευση.'
  },
  {
    id: 'org-suspended-001',
    organizerUserId: 'org-suspended-001',
    name: { el: 'Παλιά Ομάδα Εθελοντών Σερρών', en: 'Serres Old Volunteer Group' },
    description: {
      el: 'Εγκεκριμένη οργάνωση που τέθηκε προσωρινά σε αναστολή για επανεξέταση στοιχείων της.',
      en: 'Previously approved organization temporarily suspended pending a review of its details.'
    },
    contactEmail: 'info@serres-oldvolunteers.example',
    status: ORGANIZATION_STATUS.SUSPENDED,
    submittedAt: '2025-01-10T09:00:00.000Z',
    reviewedAt: '2026-07-20T09:00:00.000Z',
    reviewedBy: 'user-admin-001'
  }
]
