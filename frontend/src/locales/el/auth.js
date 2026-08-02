export default {
  roles: {
    volunteer: 'Εθελοντής/τρια',
    organizer: 'Διοργανωτής/τρια',
    moderator: 'Συντονιστής/τρια',
    administrator: 'Διαχειριστής/τρια'
  },
  login: {
    subtitle: 'Συνδέσου για να συνεχίσεις.',
    emailLabel: 'Email',
    passwordLabel: 'Κωδικός πρόσβασης',
    showPassword: 'Εμφάνιση κωδικού',
    hidePassword: 'Απόκρυψη κωδικού',
    sessionNote: 'Πρόκειται για μια εικονική (mock) σύνδεση — η σύνδεσή σου παραμένει αποθηκευμένη σε αυτή τη συσκευή μέχρι να αποσυνδεθείς, χωρίς πραγματικό λογαριασμό ή διακομιστή.',
    submit: 'Σύνδεση',
    submitting: 'Σύνδεση...',
    noAccount: 'Δεν έχεις λογαριασμό;',
    registerLink: 'Δημιούργησε έναν',
    backToActions: 'Επιστροφή στις δράσεις',
    demoTitle: 'Δοκιμαστικοί λογαριασμοί (development)',
    demoVolunteer: 'Εθελοντής: {email} / {password}',
    demoOrganizer: 'Διοργανωτής: {email} / {password}'
  },
  register: {
    subtitle: 'Γίνε εθελοντής/τρια στο OneHelp.',
    firstNameLabel: 'Όνομα',
    lastNameLabel: 'Επώνυμο',
    emailLabel: 'Email',
    passwordLabel: 'Κωδικός πρόσβασης',
    confirmPasswordLabel: 'Επιβεβαίωση κωδικού',
    termsLabel: 'Αποδέχομαι τους όρους χρήσης.',
    submit: 'Δημιουργία λογαριασμού',
    submitting: 'Δημιουργία...',
    haveAccount: 'Έχεις ήδη λογαριασμό;',
    loginLink: 'Σύνδεση'
  },
  validation: {
    required: 'Το πεδίο είναι υποχρεωτικό.',
    invalidEmail: 'Δώσε μια έγκυρη διεύθυνση email.',
    passwordTooShort: 'Ο κωδικός πρέπει να έχει τουλάχιστον {min} χαρακτήρες.',
    passwordMismatch: 'Οι κωδικοί δεν ταιριάζουν.',
    termsRequired: 'Πρέπει να αποδεχτείς τους όρους χρήσης.'
  },
  errors: {
    unknownEmail: 'Δεν βρέθηκε λογαριασμός με αυτό το email.',
    invalidPassword: 'Λανθασμένος κωδικός πρόσβασης.',
    duplicateEmail: 'Υπάρχει ήδη λογαριασμός με αυτό το email.',
    invalidSession: 'Η συνεδρία δεν είναι πλέον έγκυρη. Συνδέσου ξανά.',
    generic: 'Κάτι πήγε στραβά. Δοκίμασε ξανά.'
  },
  notifications: {
    loginSuccess: 'Συνδέθηκες επιτυχώς.',
    registerSuccess: 'Ο λογαριασμός δημιουργήθηκε επιτυχώς.',
    logoutSuccess: 'Αποσυνδέθηκες.'
  },
  account: {
    emailLabel: 'Email',
    roleLabel: 'Ρόλος',
    logout: 'Αποσύνδεση'
  },
  placeholder: {
    signedInAs: 'Συνδεδεμένος/η ως {name}',
    roleLine: 'Ρόλος: {role}',
    comingSoon: 'Η πλήρης λειτουργία θα προστεθεί σε επόμενη φάση.'
  },
  unauthorized: {
    title: 'Μη εξουσιοδοτημένη πρόσβαση',
    message: 'Δεν έχεις δικαίωμα πρόσβασης σε αυτή τη σελίδα.',
    backHome: 'Επιστροφή στην αρχική'
  }
}
