export default {
  pageTitle: 'Become an organizer',
  subtitle: 'Apply to register your organization and gain organizer access.',
  loading: 'Loading your application...',
  form: {
    introTitle: 'Organization application',
    introMessage: 'Tell us about your organization. Your application will be reviewed by an administrator before you gain organizer access.',
    sectionOrganization: 'Organization details',
    sectionContact: 'Contact details',
    sectionLocation: 'Location',
    sectionActivity: 'Activity',
    nameLabel: 'Organization name',
    typeLabel: 'Organization type',
    descriptionLabel: 'Description',
    descriptionHint: 'Tell us a bit about the organization and its work.',
    contactEmailLabel: 'Contact email',
    phoneLabel: 'Phone',
    optionalHint: 'Optional',
    websiteLabel: 'Website',
    websiteHint: 'Optional — e.g. https://example.org',
    addressLabel: 'Address / area',
    municipalityLabel: 'Municipality / city',
    categoriesLabel: 'Activity categories',
    supportingMessageLabel: 'Supporting message',
    supportingMessageHint: 'Tell us why you want to create this organization on OneHelp.',
    termsLabel: 'I confirm the information above is accurate.',
    submitNew: 'Submit application',
    submitUpdate: 'Save changes',
    submitResubmit: 'Resubmit application',
    validation: {
      required: 'This field is required.',
      textTooShort: 'Needs at least {min} characters.',
      textTooLong: 'Up to {max} characters.',
      invalidEmail: 'Enter a valid email address.',
      invalidWebsite: 'Enter a valid website address (e.g. https://example.org).',
      categoriesRequired: 'Select at least one category.',
      termsRequired: 'You must confirm the information is accurate.'
    }
  },
  summary: {
    title: 'Application details'
  },
  common: {
    cancel: 'Cancel'
  },
  pending: {
    title: 'Your application is pending',
    message: 'Your organization application is being reviewed by an administrator. You will be notified once a decision is made.',
    submittedAt: 'Submitted on {date}',
    editAction: 'Edit application',
    editTitle: 'Edit application'
  },
  approved: {
    title: 'Your organization was approved',
    message: '"{name}" has been approved and you are now its organizer.',
    roleNote: 'You have gained organizer access.',
    dashboardCta: 'Go to organizer dashboard'
  },
  rejected: {
    title: 'Your application was rejected',
    message: 'Your organization application was not approved this time.',
    reasonLabel: 'Rejection reason',
    resubmitAction: 'Correct and resubmit',
    resubmitTitle: 'Resubmit application'
  },
  suspended: {
    title: 'Your organization has been suspended',
    message: '"{name}" is currently suspended by an administrator.',
    note: 'You cannot manage actions while suspended. Contact an administrator for more information.'
  },
  account: {
    introTitle: 'Want to become an organizer?',
    introMessage: 'Apply to register your organization on OneHelp.',
    introCta: 'Become an organizer',
    pendingTitle: 'Organization application in progress',
    pendingMessage: 'Your application is pending review by an administrator.',
    viewDetailsCta: 'View details',
    rejectedTitle: 'Organization application rejected',
    rejectedMessage: 'View the reason and resubmit your application.',
    approvedTitle: 'You are an organizer',
    approvedMessage: 'You manage "{name}".',
    dashboardCta: 'Organizer dashboard',
    suspendedTitle: 'Your organization is suspended',
    suspendedMessage: 'Organizer access is temporarily restricted due to suspension.'
  },
  notifications: {
    submitSuccess: 'Your application was submitted successfully.',
    updateSuccess: 'Your application was updated.',
    resubmitSuccess: 'Your application was resubmitted successfully.'
  },
  errors: {
    invalidRequest: 'The request could not be processed.',
    notFound: 'Application not found.',
    alreadyHasOrganization: 'You already have an active application or organization.',
    notPending: 'This application is no longer pending.',
    notRejected: 'This application has not been rejected.',
    invalidOrganizationType: 'Select a valid organization type.',
    invalidEmail: 'Enter a valid email address.',
    invalidWebsite: 'Enter a valid website address.',
    invalidCategories: 'Select at least one valid category.',
    termsNotAccepted: 'You must confirm the information is accurate.',
    suspended: 'Your organization account is currently suspended.',
    duplicateName: 'This name is already used by another organization.',
    notOrganizer: 'You are not the organizer of any organization.',
    generic: 'Something went wrong. Please try again.'
  },
  demotion: {
    dialogTitle: 'Remove organization and become a volunteer?',
    dialogMessage: 'This will permanently remove the organization "{name}" and all of its related data. This action cannot be undone.',
    consequencesTitle: 'The following will be permanently removed:',
    consequenceOrganization: 'The organization',
    consequenceActions: 'All of the organization\'s actions',
    consequenceParticipations: 'Volunteer participations in those actions',
    consequenceAttendance: 'Attendance / check-in data',
    consequenceReports: 'Related reports',
    confirmCheckboxLabel: 'I understand this action is permanent and cannot be undone.',
    cancel: 'Cancel',
    confirmAction: 'Remove organization'
  }
}
