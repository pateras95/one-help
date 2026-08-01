/**
 * Fictional mock volunteering actions for the Actions discovery feature.
 *
 * Localization strategy: unlike the app's permanent UI strings (which use
 * translation keys in `src/locales`), this is disposable fixture data —
 * it will be replaced entirely once a real backend exists. Keeping the
 * bilingual `{ el, en }` text inline here, instead of adding ~15 actions'
 * worth of one-off keys to the shared locale files, keeps the fixtures
 * self-contained and avoids polluting the app's permanent translations
 * with content that has no long-term value. `actions.service.js` picks
 * the right language for the active locale before returning results.
 *
 * All organizations, names and events below are entirely fictional.
 */
export const MOCK_ACTIONS = [
  {
    id: 'act-001',
    categoryId: 'health',
    organization: { el: 'Χείρα Βοήθειας Αθήνας', en: 'Helping Hand Athens' },
    title: { el: 'Εθελοντική αιμοδοσία στο κέντρο της Αθήνας', en: 'Volunteer blood drive in central Athens' },
    description: {
      el: 'Στήριξη στη διοργάνωση μιας εθελοντικής αιμοδοσίας: υποδοχή αιμοδοτών, καταγραφή στοιχείων και ενημέρωση.',
      en: 'Support a volunteer blood drive: welcoming donors, recording details and providing information.'
    },
    locationName: { el: 'Πλατεία Συντάγματος', en: 'Syntagma Square' },
    municipality: { el: 'Αθήνα', en: 'Athens' },
    latitude: 37.9755,
    longitude: 23.7348,
    date: '2026-08-10',
    startTime: '10:00',
    capacity: 20,
    registeredCount: 14,
    urgency: 'high',
    requiredEquipment: { el: ['Ταυτότητα'], en: ['ID card'] }
  },
  {
    id: 'act-002',
    categoryId: 'environment',
    organization: { el: 'Πράσινη Πόλη Θεσσαλονίκης', en: 'Green City Thessaloniki' },
    title: { el: 'Καθαρισμός παραλίας στη Θεσσαλονίκη', en: 'Beach clean-up in Thessaloniki' },
    description: {
      el: 'Συλλογή απορριμμάτων κατά μήκος της παραλιακής ζώνης, σε συνεργασία με τοπικές ομάδες πολιτών.',
      en: 'Collecting litter along the waterfront, working alongside local citizen groups.'
    },
    locationName: { el: 'Παραλιακή Θεσσαλονίκης', en: 'Thessaloniki waterfront' },
    municipality: { el: 'Θεσσαλονίκη', en: 'Thessaloniki' },
    latitude: 40.6320,
    longitude: 22.9481,
    date: '2026-08-15',
    startTime: '09:00',
    capacity: 30,
    registeredCount: 22,
    urgency: 'normal',
    requiredEquipment: { el: ['Γάντια', 'Καπέλο'], en: ['Gloves', 'Hat'] }
  },
  {
    id: 'act-003',
    categoryId: 'social',
    organization: { el: 'Κοινωνικό Δίκτυο Αλληλεγγύης Πάτρας', en: 'Patras Solidarity Network' },
    title: { el: 'Ταξινόμηση τροφίμων για κοινωνικό παντοπωλείο', en: 'Sorting food for a community pantry' },
    description: {
      el: 'Βοήθεια στην ταξινόμηση και συσκευασία τροφίμων για διανομή σε οικογένειες της περιοχής.',
      en: 'Helping sort and package food donations for distribution to local families.'
    },
    locationName: { el: 'Κοινωνικό Παντοπωλείο Πάτρας', en: 'Patras Community Pantry' },
    municipality: { el: 'Πάτρα', en: 'Patras' },
    latitude: 38.2466,
    longitude: 21.7346,
    date: '2026-08-20',
    startTime: '11:00',
    capacity: 15,
    registeredCount: 15,
    urgency: 'normal',
    requiredEquipment: { el: [], en: [] }
  },
  {
    id: 'act-004',
    categoryId: 'animals',
    organization: { el: 'Φιλοζωική Κρήτης', en: 'Crete Animal Welfare' },
    title: { el: 'Βόλτες σκύλων στο καταφύγιο', en: 'Dog walking at the shelter' },
    description: {
      el: 'Καθημερινή βόλτα και κοινωνικοποίηση σκύλων του καταφυγίου, υπό την καθοδήγηση εθελοντών-υπευθύνων.',
      en: 'Daily walks and socialization for shelter dogs, guided by volunteer coordinators.'
    },
    locationName: { el: 'Καταφύγιο Αδέσποτων Ηρακλείου', en: 'Heraklion Stray Shelter' },
    municipality: { el: 'Ηράκλειο', en: 'Heraklion' },
    latitude: 35.3387,
    longitude: 25.1442,
    date: '2026-08-22',
    startTime: '17:00',
    capacity: 12,
    registeredCount: 5,
    urgency: 'normal',
    requiredEquipment: { el: ['Αθλητικά παπούτσια'], en: ['Comfortable shoes'] }
  },
  {
    id: 'act-005',
    categoryId: 'emergency',
    organization: { el: 'Ομάδα Άμεσης Επέμβασης Βόλου', en: 'Volos Rapid Response Team' },
    title: { el: 'Προετοιμασία για αντιπλημμυρική προστασία', en: 'Flood-preparedness support' },
    description: {
      el: 'Υποστήριξη στη διανομή αμμόσακων και στην προετοιμασία σημείων υψηλού κινδύνου πριν από έντονες βροχοπτώσεις.',
      en: 'Helping distribute sandbags and prepare high-risk points ahead of heavy rainfall.'
    },
    locationName: { el: 'Δημαρχείο Βόλου', en: 'Volos Town Hall' },
    municipality: { el: 'Βόλος', en: 'Volos' },
    latitude: 39.3622,
    longitude: 22.9425,
    date: '2026-08-12',
    startTime: '08:00',
    capacity: 25,
    registeredCount: 9,
    urgency: 'urgent',
    requiredEquipment: { el: ['Αδιάβροχα', 'Μπότες'], en: ['Rain gear', 'Boots'] }
  },
  {
    id: 'act-006',
    categoryId: 'health',
    organization: { el: 'Υγεία για Όλους Λάρισας', en: 'Health For All Larissa' },
    title: { el: 'Επισκέψεις συντροφιάς σε ηλικιωμένους', en: 'Companionship visits for older adults' },
    description: {
      el: 'Σύντομες επισκέψεις σε ηλικιωμένους που ζουν μόνοι, για συντροφιά και μικροβοηθήματα.',
      en: 'Short visits to older adults living alone, for company and small errands.'
    },
    locationName: { el: 'Κέντρο Ανοιχτής Προστασίας Ηλικιωμένων', en: 'Open Care Centre for Older Adults' },
    municipality: { el: 'Λάρισα', en: 'Larissa' },
    latitude: 39.6390,
    longitude: 22.4194,
    date: '2026-09-01',
    startTime: '10:30',
    capacity: 10,
    registeredCount: 4,
    urgency: 'normal',
    requiredEquipment: { el: [], en: [] }
  },
  {
    id: 'act-007',
    categoryId: 'environment',
    organization: { el: 'Αναδάσωση Ηπείρου', en: 'Epirus Reforestation' },
    title: { el: 'Φύτευση δενδρυλλίων στα Ιωάννινα', en: 'Sapling planting in Ioannina' },
    description: {
      el: 'Φύτευση τοπικών ειδών δέντρων σε περιοχή που επλήγη από πυρκαγιά την προηγούμενη χρονιά.',
      en: 'Planting native tree species in an area affected by wildfire the previous year.'
    },
    locationName: { el: 'Λόφος Προφήτη Ηλία', en: 'Prophet Elias Hill' },
    municipality: { el: 'Ιωάννινα', en: 'Ioannina' },
    latitude: 39.6650,
    longitude: 20.8537,
    date: '2026-09-05',
    startTime: '09:00',
    capacity: 40,
    registeredCount: 40,
    urgency: 'normal',
    requiredEquipment: { el: ['Γάντια', 'Φτυάρι (αν διαθέτετε)'], en: ['Gloves', 'A shovel (if you have one)'] }
  },
  {
    id: 'act-008',
    categoryId: 'social',
    organization: { el: 'Στέγη Αλληλεγγύης Αθήνας', en: 'Athens Solidarity Shelter' },
    title: { el: 'Ταξινόμηση ρούχων για δωρεά', en: 'Sorting donated clothing' },
    description: {
      el: 'Ταξινόμηση και τακτοποίηση δωρισμένων ρούχων πριν τη διανομή τους σε ανθρώπους που τα έχουν ανάγκη.',
      en: 'Sorting and organizing donated clothing before distribution to people in need.'
    },
    locationName: { el: 'Στέγη Αλληλεγγύης', en: 'Solidarity Shelter' },
    municipality: { el: 'Αθήνα', en: 'Athens' },
    latitude: 37.9838,
    longitude: 23.7275,
    date: '2026-08-18',
    startTime: '16:00',
    capacity: 18,
    registeredCount: 6,
    urgency: 'normal',
    requiredEquipment: { el: [], en: [] }
  },
  {
    id: 'act-009',
    categoryId: 'animals',
    organization: { el: 'Ουρές Χαράς Θεσσαλονίκης', en: 'Thessaloniki Wagging Tails' },
    title: { el: 'Καθαρισμός καταφυγίου ζώων', en: 'Animal shelter clean-up' },
    description: {
      el: 'Γενικός καθαρισμός χώρων διαμονής και εξοπλισμού στο καταφύγιο αδέσποτων ζώων.',
      en: 'General cleaning of living areas and equipment at the stray animal shelter.'
    },
    locationName: { el: 'Καταφύγιο Ουρές Χαράς', en: 'Wagging Tails Shelter' },
    municipality: { el: 'Θεσσαλονίκη', en: 'Thessaloniki' },
    latitude: 40.6401,
    longitude: 22.9444,
    date: '2026-09-10',
    startTime: '10:00',
    capacity: 16,
    registeredCount: 13,
    urgency: 'high',
    requiredEquipment: { el: ['Γάντια', 'Ρούχα που λερώνονται'], en: ['Gloves', 'Clothes that can get dirty'] }
  },
  {
    id: 'act-010',
    categoryId: 'emergency',
    organization: { el: 'Εθελοντές Πολιτικής Προστασίας Καβάλας', en: 'Kavala Civil Protection Volunteers' },
    title: { el: 'Εκπαίδευση επιτήρησης για δασικές πυρκαγιές', en: 'Wildfire watch training' },
    description: {
      el: 'Βασική εκπαίδευση σε τεχνικές επιτήρησης και έγκαιρης αναφοράς για την αντιπυρική περίοδο.',
      en: 'Basic training in lookout techniques and early reporting for the fire season.'
    },
    locationName: { el: 'Πυροφυλάκιο Καβάλας', en: 'Kavala Fire Lookout Post' },
    municipality: { el: 'Καβάλα', en: 'Kavala' },
    latitude: 40.9397,
    longitude: 24.4021,
    date: '2026-08-25',
    startTime: '08:30',
    capacity: 20,
    registeredCount: 7,
    urgency: 'urgent',
    requiredEquipment: { el: ['Καπέλο', 'Νερό'], en: ['Hat', 'Water'] }
  },
  {
    id: 'act-011',
    categoryId: 'health',
    organization: { el: 'Χαμόγελο Υγείας Πάτρας', en: 'Patras Health Smile' },
    title: { el: 'Εργαστήριο πρώτων βοηθειών', en: 'First aid workshop' },
    description: {
      el: 'Πρακτικό εργαστήριο βασικών πρώτων βοηθειών για εθελοντές και κατοίκους της περιοχής.',
      en: 'Hands-on workshop covering basic first aid for volunteers and local residents.'
    },
    locationName: { el: 'Πνευματικό Κέντρο Πάτρας', en: 'Patras Cultural Centre' },
    municipality: { el: 'Πάτρα', en: 'Patras' },
    latitude: 38.2466,
    longitude: 21.7346,
    date: '2026-07-20',
    startTime: '18:00',
    capacity: 25,
    registeredCount: 25,
    urgency: 'normal',
    requiredEquipment: { el: [], en: [] }
  },
  {
    id: 'act-012',
    categoryId: 'social',
    organization: { el: 'Ανθρώπινο Δίκτυο Ρόδου', en: 'Rhodes Human Network' },
    title: { el: 'Ενισχυτική διδασκαλία για παιδιά', en: 'Tutoring support for children' },
    description: {
      el: 'Δωρεάν ενισχυτική διδασκαλία σε παιδιά οικογενειών που έχουν ανάγκη υποστήριξης.',
      en: 'Free tutoring support for children from families who need extra help.'
    },
    locationName: { el: 'Κοινοτικό Κέντρο Ρόδου', en: 'Rhodes Community Centre' },
    municipality: { el: 'Ρόδος', en: 'Rhodes' },
    latitude: 36.4341,
    longitude: 28.2176,
    date: '2026-09-15',
    startTime: '17:30',
    capacity: 12,
    registeredCount: 3,
    urgency: 'normal',
    requiredEquipment: { el: [], en: [] }
  },
  {
    id: 'act-013',
    categoryId: 'environment',
    organization: { el: 'Καθαρές Ακτές Πάτμου', en: 'Patmos Clean Shores' },
    title: { el: 'Καθαρισμός ακτών στην Πάτμο', en: 'Coastal clean-up in Patmos' },
    description: {
      el: 'Συλλογή πλαστικών και άλλων απορριμμάτων από τις ακτές του νησιού πριν την τουριστική περίοδο.',
      en: 'Collecting plastics and other debris from the island\'s shores ahead of the tourist season.'
    },
    locationName: { el: 'Παραλία Γροίκου', en: 'Grikos Beach' },
    municipality: { el: 'Πάτμος', en: 'Patmos' },
    latitude: 37.3086,
    longitude: 26.5453,
    date: '2026-08-30',
    startTime: '09:30',
    capacity: 20,
    registeredCount: 11,
    urgency: 'normal',
    requiredEquipment: { el: ['Γάντια'], en: ['Gloves'] }
  }
]
