export default {
  panelTitle: 'Participate',
  cta: {
    signInTitle: 'Sign in to join',
    signInMessage: 'You need to sign in to join this action.',
    signInAction: 'Sign in',
    join: 'Join action',
    joining: 'Joining...',
    confirmedTitle: 'Participation confirmed',
    confirmedMessage: 'You have joined this action.',
    cancel: 'Cancel participation',
    cancelling: 'Cancelling...',
    fullTitle: 'This action is full',
    fullMessage: 'There are no more available places for this action.',
    unavailableTitle: 'This action is no longer available',
    unavailableMessage: 'This action has already taken place and no longer accepts new participants.',
    closedTitle: 'The organizer has closed participation',
    closedMessage: 'This action no longer accepts new participants.'
  },
  organizerRestriction: {
    title: 'Organizer accounts do not join as volunteers',
    message: 'You are signed in as an organizer. Organizer accounts cannot join actions as volunteers through this flow.'
  },
  administratorRestriction: {
    title: 'Administrator accounts do not join as volunteers',
    message: 'You are signed in as an administrator. Administrator accounts cannot join actions as volunteers through this flow.'
  },
  joinDialog: {
    title: 'Confirm participation',
    message: 'Join the action "{title}" ({date})?',
    disclaimer: 'This is a mock, prototype platform — joining here is not an official registration with an organization and does not guarantee acceptance.',
    confirm: 'Yes, join',
    cancel: 'Cancel'
  },
  cancelDialog: {
    title: 'Cancel participation',
    message: 'Cancel your participation in "{title}"? Your place will become available to other volunteers again.',
    confirm: 'Yes, cancel',
    cancel: 'Back'
  },
  notifications: {
    joinSuccess: 'You have successfully joined this action.',
    cancelSuccess: 'Your participation has been cancelled.'
  },
  errors: {
    invalidRequest: 'This request could not be processed.',
    actionNotFound: 'This action could not be found.',
    actionClosed: 'This action no longer accepts new participants.',
    actionFull: 'This action filled up before your participation could be confirmed.',
    alreadyJoined: 'You have already joined this action.',
    participationNotFound: 'No active participation was found to cancel.',
    generic: 'Something went wrong. Please try again.'
  },
  status: {
    confirmed: 'Participation confirmed',
    cancelled: 'Participation cancelled'
  },
  card: {
    alreadyJoined: "You've joined this action"
  },
  availability: {
    places: '{available} places available'
  },
  myActions: {
    title: 'My Actions',
    subtitle: 'Actions you have joined.',
    tabUpcoming: 'Upcoming',
    tabPast: 'Past',
    tabCancelled: 'Cancelled',
    loading: 'Loading your actions...',
    errorTitle: 'Could not load your actions',
    errorMessage: 'Please try again shortly.',
    emptyUpcomingTitle: 'No upcoming participations',
    emptyUpcomingMessage: "You haven't joined any upcoming actions yet.",
    emptyPastTitle: 'No past actions',
    emptyPastMessage: 'Actions you joined will appear here once they take place.',
    emptyCancelledTitle: 'No cancelled participations',
    emptyCancelledMessage: 'Participations you cancel will appear here.',
    browseActions: 'Browse actions',
    viewDetails: 'View details',
    cancelParticipation: 'Cancel participation',
    cancelAriaLabel: 'Cancel participation in {title}',
    unknownAction: 'This action is no longer available',
    unknownActionMessage: 'This action could not be found — it may have been removed.'
  }
}
