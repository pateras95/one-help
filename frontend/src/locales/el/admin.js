export default {
  navigation: {
    landmark: 'Πλοήγηση διαχείρισης',
    dashboard: 'Πίνακας διαχείρισης',
    users: 'Χρήστες',
    organizations: 'Οργανώσεις',
    actions: 'Δράσεις',
    reports: 'Αναφορές',
    activity: 'Δραστηριότητα'
  },
  common: {
    loading: 'Φόρτωση...',
    errorTitle: 'Δεν ήταν δυνατή η φόρτωση των δεδομένων',
    errorMessage: 'Δοκίμασε ξανά σε λίγο.',
    view: 'Προβολή',
    edit: 'Επεξεργασία',
    close: 'Κλείσιμο',
    cancel: 'Ακύρωση'
  },
  errors: {
    invalidRequest: 'Δεν ήταν δυνατή η επεξεργασία του αιτήματος.',
    notFound: 'Η εγγραφή δεν βρέθηκε.',
    cannotSuspendSelf: 'Δεν μπορείς να αναστείλεις τον δικό σου λογαριασμό διαχειριστή.',
    invalidTransition: 'Αυτή η αλλαγή κατάστασης δεν επιτρέπεται.',
    reasonRequired: 'Απαιτείται αιτιολογία.',
    duplicateOpenReport: 'Έχεις ήδη μια ανοιχτή αναφορά για αυτή τη δράση.',
    cannotReportOwnAction: 'Δεν μπορείς να αναφέρεις τη δική σου δράση.',
    duplicateEmail: 'Αυτό το email χρησιμοποιείται ήδη από άλλο λογαριασμό.',
    capacityBelowConfirmed: 'Η χωρητικότητα δεν μπορεί να είναι μικρότερη από τους ήδη επιβεβαιωμένους συμμετέχοντες.',
    generic: 'Κάτι πήγε στραβά. Δοκίμασε ξανά.'
  },
  accountStatus: {
    active: 'Ενεργός',
    suspended: 'Σε αναστολή'
  },
  organizationStatus: {
    pending: 'Εκκρεμεί έγκριση',
    approved: 'Εγκεκριμένη',
    rejected: 'Απορρίφθηκε',
    suspended: 'Σε αναστολή'
  },
  moderationStatus: {
    pendingReview: 'Εκκρεμεί έλεγχος',
    approved: 'Εγκεκριμένη',
    rejected: 'Απορρίφθηκε',
    hidden: 'Κρυφή'
  },
  reportStatus: {
    open: 'Ανοιχτή',
    investigating: 'Υπό διερεύνηση',
    resolved: 'Επιλύθηκε',
    dismissed: 'Απορρίφθηκε'
  },
  reportReason: {
    incorrectInformation: 'Λανθασμένες πληροφορίες',
    unsafeOrInappropriate: 'Μη ασφαλές ή ακατάλληλο περιεχόμενο',
    suspiciousOrganization: 'Ύποπτη οργάνωση',
    actionNoLongerExists: 'Η δράση δεν υπάρχει πια',
    other: 'Άλλο'
  },
  dashboard: {
    pageTitle: 'Πίνακας διαχείρισης',
    subtitle: 'Ένας χώρος εργασίας συντονισμού για λογαριασμούς, οργανώσεις, δράσεις και αναφορές.',
    recentActivityTitle: 'Πρόσφατη δραστηριότητα',
    summary: {
      totalUsers: 'Σύνολο χρηστών',
      activeVolunteers: 'Ενεργοί εθελοντές',
      organizers: 'Διοργανωτές',
      pendingApprovals: 'Εκκρεμείς εγκρίσεις διοργανωτών',
      publishedActions: 'Δημοσιευμένες δράσεις',
      actionsAwaitingReview: 'Δράσεις υπό έλεγχο',
      suspendedAccounts: 'Λογαριασμοί σε αναστολή',
      openReports: 'Ανοιχτές αναφορές'
    }
  },
  users: {
    pageTitle: 'Χρήστες',
    subtitle: 'Δες τους λογαριασμούς και διαχειρίσου την κατάστασή τους.',
    emptyTitle: 'Κανένας χρήστης ακόμα',
    emptyMessage: 'Οι εγγεγραμμένοι λογαριασμοί θα εμφανίζονται εδώ.',
    registeredAt: 'Εγγραφή {date}',
    suspendAction: 'Αναστολή',
    reactivateAction: 'Επανενεργοποίηση',
    editAction: 'Επεξεργασία χρήστη',
    cannotSuspendSelf: 'Δεν μπορείς να αναστείλεις τον δικό σου λογαριασμό.',
    viewOrganizationLink: 'Προβολή οργάνωσης',
    viewActionsLink: 'Προβολή δράσεων',
    integrityWarningNoOrganization: 'Αυτός ο διοργανωτής δεν έχει συνδεδεμένη οργάνωση — πιθανό πρόβλημα ακεραιότητας δεδομένων.',
    search: {
      label: 'Αναζήτηση χρηστών',
      resultCount: '{count} αποτελέσματα',
      noResultsTitle: 'Κανένα αποτέλεσμα',
      noResultsMessage: 'Δοκίμασε διαφορετικούς όρους αναζήτησης.'
    },
    editDialog: {
      title: 'Επεξεργασία χρήστη',
      firstNameLabel: 'Όνομα',
      lastNameLabel: 'Επώνυμο',
      emailLabel: 'Email',
      saveAction: 'Αποθήκευση',
      validation: {
        required: 'Το πεδίο είναι υποχρεωτικό.',
        invalidEmail: 'Δώσε μια έγκυρη διεύθυνση email.'
      }
    },
    suspendDialog: {
      title: 'Αναστολή αυτού του χρήστη;',
      message: 'Η αναστολή του/της {name} θα τον/την εμποδίσει να συνδεθεί μέχρι να επανενεργοποιήσεις τον λογαριασμό του/της.'
    },
    reactivateDialog: {
      title: 'Επανενεργοποίηση αυτού του χρήστη;',
      message: 'Ο/Η {name} θα μπορεί να συνδεθεί ξανά αμέσως.'
    },
    viewDialog: {
      title: 'Στοιχεία χρήστη',
      roleLabel: 'Ρόλος',
      statusLabel: 'Κατάσταση λογαριασμού',
      registeredLabel: 'Εγγραφή'
    },
    notifications: {
      suspendSuccess: 'Ο λογαριασμός χρήστη ανεστάλη.',
      reactivateSuccess: 'Ο λογαριασμός χρήστη επανενεργοποιήθηκε.',
      editSuccess: 'Τα στοιχεία του χρήστη ενημερώθηκαν.'
    }
  },
  organizations: {
    pageTitle: 'Οργανώσεις',
    subtitle: 'Έλεγξε αιτήσεις διοργανωτών και διαχειρίσου την κατάσταση οργανώσεων.',
    emptyTitle: 'Καμία οργάνωση ακόμα',
    emptyMessage: 'Οι αιτήσεις διοργανωτών θα εμφανίζονται εδώ.',
    submittedAt: 'Υποβλήθηκε {date}',
    ownerLabel: 'Ιδιοκτήτης',
    actionCounts: '{total} δράσεις σύνολο ({public} δημόσιες, {hidden} κρυφές)',
    removeOrganizerAction: 'Αφαίρεση διοργανωτή και οργάνωσης',
    search: {
      label: 'Αναζήτηση οργανώσεων',
      resultCount: '{count} αποτελέσματα',
      noResultsTitle: 'Κανένα αποτέλεσμα',
      noResultsMessage: 'Δοκίμασε διαφορετικούς όρους αναζήτησης.'
    },
    editDialog: {
      title: 'Επεξεργασία «{name}»',
      saveAction: 'Αποθήκευση αλλαγών'
    },
    actions: {
      approve: 'Έγκριση',
      reject: 'Απόρριψη',
      suspend: 'Αναστολή',
      restore: 'Επαναφορά'
    },
    approveDialog: {
      title: 'Έγκριση αυτής της οργάνωσης;',
      message: 'Η οργάνωση {name} θα μπορεί να δημοσιεύει δράσεις μόλις εγκριθεί.'
    },
    rejectDialog: {
      title: 'Απόρριψη αυτής της οργάνωσης;',
      message: 'Η οργάνωση {name} δεν θα μπορεί να δημοσιεύει δράσεις. Εξήγησε τον λόγο.',
      reasonLabel: 'Λόγος απόρριψης'
    },
    suspendDialog: {
      title: 'Αναστολή αυτής της οργάνωσης;',
      message: 'Η αναστολή της {name} θα κρύψει τις δημοσιευμένες δράσεις της από τη δημόσια αναζήτηση μέχρι να αποκατασταθεί. Οι εγγραφές διατηρούνται, τίποτα δεν διαγράφεται.'
    },
    restoreDialog: {
      title: 'Επαναφορά αυτής της οργάνωσης;',
      message: 'Η οργάνωση {name} θα εγκριθεί ξανά και οι κατάλληλες δράσεις της θα γίνουν ξανά δημόσια ορατές.'
    },
    viewDialog: {
      contactLabel: 'Email επικοινωνίας',
      statusLabel: 'Κατάσταση',
      submittedLabel: 'Υποβλήθηκε',
      reviewedLabel: 'Τελευταία αξιολόγηση',
      rejectionReasonLabel: 'Λόγος απόρριψης'
    },
    notifications: {
      approveSuccess: 'Η οργάνωση εγκρίθηκε.',
      rejectSuccess: 'Η οργάνωση απορρίφθηκε.',
      suspendSuccess: 'Η οργάνωση ανεστάλη.',
      restoreSuccess: 'Η οργάνωση αποκαταστάθηκε.',
      editSuccess: 'Τα στοιχεία της οργάνωσης ενημερώθηκαν.',
      removeSuccess: 'Ο διοργανωτής και η οργάνωση «{name}» αφαιρέθηκαν.'
    }
  },
  actions: {
    pageTitle: 'Δράσεις',
    subtitle: 'Έλεγξε και συντόνισε δράσεις σε κάθε κατάσταση κύκλου ζωής διοργανωτή.',
    emptyTitle: 'Καμία δράση ακόμα',
    emptyMessage: 'Οι δράσεις διοργανωτών θα εμφανίζονται εδώ.',
    search: {
      label: 'Αναζήτηση δράσεων',
      resultCount: '{count} αποτελέσματα',
      noResultsTitle: 'Κανένα αποτέλεσμα',
      noResultsMessage: 'Δοκίμασε διαφορετικούς όρους αναζήτησης.'
    },
    editDialog: {
      title: 'Επεξεργασία «{title}»'
    },
    actions: {
      approve: 'Έγκριση',
      reject: 'Απόρριψη',
      hide: 'Απόκρυψη',
      restore: 'Επαναφορά'
    },
    approveDialog: {
      title: 'Έγκριση αυτής της δράσης;',
      message: 'Η δράση «{title}» θα μπορεί να εμφανιστεί δημόσια μόλις τη δημοσιεύσει ο διοργανωτής της.'
    },
    rejectDialog: {
      title: 'Απόρριψη αυτής της δράσης;',
      message: 'Η δράση «{title}» δεν θα εμφανίζεται δημόσια. Εξήγησε τον λόγο.',
      reasonLabel: 'Λόγος απόρριψης'
    },
    hideDialog: {
      title: 'Απόκρυψη αυτής της δράσης;',
      message: 'Η δράση «{title}» θα αφαιρεθεί από τη δημόσια αναζήτηση μέχρι να αποκατασταθεί. Οι εγγραφές διατηρούνται, τίποτα δεν διαγράφεται.'
    },
    restoreDialog: {
      title: 'Επαναφορά αυτής της δράσης;',
      message: 'Η δράση «{title}» θα μπορεί να εμφανιστεί ξανά δημόσια.'
    },
    viewDialog: {
      organizerStatusLabel: 'Κατάσταση διοργανωτή',
      moderationStatusLabel: 'Κατάσταση ελέγχου',
      organizationLabel: 'Οργάνωση',
      organizerLabel: 'Διοργανωτής',
      moderationReasonLabel: 'Αιτιολογία ελέγχου',
      openPublicPage: 'Άνοιγμα δημόσιας σελίδας'
    },
    notifications: {
      approveSuccess: 'Η δράση εγκρίθηκε.',
      rejectSuccess: 'Η δράση απορρίφθηκε.',
      hideSuccess: 'Η δράση αποκρύφθηκε.',
      restoreSuccess: 'Η δράση αποκαταστάθηκε.',
      editSuccess: 'Τα στοιχεία της δράσης ενημερώθηκαν.'
    }
  },
  reports: {
    pageTitle: 'Αναφορές',
    subtitle: 'Έλεγξε αναφορές εθελοντών για προβληματικές δράσεις.',
    emptyTitle: 'Καμία αναφορά ακόμα',
    emptyMessage: 'Οι αναφορές εθελοντών θα εμφανίζονται εδώ.',
    reportedBy: 'Αναφέρθηκε από {name} στις {date}',
    missingAction: 'Αυτή η δράση δεν υπάρχει πια.',
    hideActionAction: 'Απόκρυψη της σχετικής δράσης',
    actions: {
      investigating: 'Σήμανση ως υπό διερεύνηση',
      resolved: 'Επίλυση',
      dismissed: 'Απόρριψη'
    },
    statusDialog: {
      investigatingTitle: 'Σήμανση αυτής της αναφοράς ως υπό διερεύνηση;',
      investigatingMessage: 'Αυτό δείχνει ότι η αναφορά εξετάζεται ενεργά.',
      resolvedTitle: 'Επίλυση αυτής της αναφοράς;',
      resolvedMessage: 'Μπορείς να προσθέσεις μια προαιρετική σημείωση για το πώς επιλύθηκε.',
      dismissedTitle: 'Απόρριψη αυτής της αναφοράς;',
      dismissedMessage: 'Μπορείς να προσθέσεις μια προαιρετική σημείωση εξηγώντας τον λόγο.',
      noteLabel: 'Σημείωση (προαιρετικό)'
    },
    viewDialog: {
      title: 'Στοιχεία αναφοράς',
      actionLabel: 'Δράση',
      reasonLabel: 'Λόγος',
      descriptionLabel: 'Περιγραφή',
      reporterLabel: 'Αναφέρθηκε από',
      createdAtLabel: 'Ημερομηνία αναφοράς',
      resolutionNoteLabel: 'Σημείωση επίλυσης'
    },
    notifications: {
      statusUpdateSuccess: 'Η κατάσταση της αναφοράς ενημερώθηκε.',
      hideActionSuccess: 'Η σχετική δράση αποκρύφθηκε.'
    }
  },
  activity: {
    pageTitle: 'Δραστηριότητα',
    subtitle: 'Ένα μη επεξεργάσιμο, εικονικό ιστορικό ενεργειών διαχείρισης — όχι νομικά έγκυρο αρχείο ελέγχου.',
    emptyTitle: 'Καμία δραστηριότητα ακόμα',
    emptyMessage: 'Οι ενέργειες διαχείρισης θα εμφανίζονται εδώ καθώς συμβαίνουν.',
    entries: {
      userSuspended: 'Ανέστειλε τον λογαριασμό χρήστη {email}',
      userReactivated: 'Επανενεργοποίησε τον λογαριασμό χρήστη {email}',
      organizationApproved: 'Ενέκρινε την οργάνωση «{name}»',
      organizationRejected: 'Απέρριψε την οργάνωση «{name}» ({reason})',
      organizationSuspended: 'Ανέστειλε την οργάνωση «{name}»',
      organizationRestored: 'Αποκατέστησε την οργάνωση «{name}»',
      actionApproved: 'Ενέκρινε τη δράση «{title}»',
      actionRejected: 'Απέρριψε τη δράση «{title}» ({reason})',
      actionHidden: 'Απέκρυψε τη δράση «{title}»',
      actionRestored: 'Αποκατέστησε τη δράση «{title}»',
      reportStatusChanged: 'Άλλαξε την κατάσταση μιας αναφοράς από {fromStatus} σε {toStatus}',
      organizerDemoted: 'Αφαίρεσε τον διοργανωτή και την οργάνωση «{name}» ({actionsRemoved} δράσεις)'
    }
  }
}
