export default {
  navigation: {
    landmark: 'Admin navigation',
    dashboard: 'Admin dashboard',
    users: 'Users',
    organizations: 'Organizations',
    actions: 'Actions',
    reports: 'Reports',
    activity: 'Activity'
  },
  common: {
    loading: 'Loading...',
    errorTitle: 'Could not load this data',
    errorMessage: 'Please try again shortly.',
    view: 'View',
    close: 'Close',
    cancel: 'Cancel'
  },
  errors: {
    invalidRequest: 'This request could not be processed.',
    notFound: 'This record could not be found.',
    cannotSuspendSelf: 'You cannot suspend your own administrator account.',
    invalidTransition: 'This status change is not allowed.',
    reasonRequired: 'A reason is required.',
    duplicateOpenReport: 'You already have an open report for this action.',
    cannotReportOwnAction: 'You cannot report your own action.',
    generic: 'Something went wrong. Please try again.'
  },
  accountStatus: {
    active: 'Active',
    suspended: 'Suspended'
  },
  organizationStatus: {
    pending: 'Pending approval',
    approved: 'Approved',
    rejected: 'Rejected',
    suspended: 'Suspended'
  },
  moderationStatus: {
    pendingReview: 'Pending review',
    approved: 'Approved',
    rejected: 'Rejected',
    hidden: 'Hidden'
  },
  reportStatus: {
    open: 'Open',
    investigating: 'Investigating',
    resolved: 'Resolved',
    dismissed: 'Dismissed'
  },
  reportReason: {
    incorrectInformation: 'Incorrect information',
    unsafeOrInappropriate: 'Unsafe or inappropriate content',
    suspiciousOrganization: 'Suspicious organization',
    actionNoLongerExists: 'Action no longer exists',
    other: 'Other'
  },
  dashboard: {
    pageTitle: 'Admin dashboard',
    subtitle: 'A moderation workspace for accounts, organizations, actions and reports.',
    recentActivityTitle: 'Recent activity',
    summary: {
      totalUsers: 'Total users',
      activeVolunteers: 'Active volunteers',
      organizers: 'Organizers',
      pendingApprovals: 'Pending organizer approvals',
      publishedActions: 'Published actions',
      actionsAwaitingReview: 'Actions awaiting review',
      suspendedAccounts: 'Suspended accounts',
      openReports: 'Open reports'
    }
  },
  users: {
    pageTitle: 'Users',
    subtitle: 'View accounts and manage their standing.',
    emptyTitle: 'No users yet',
    emptyMessage: 'Registered accounts will appear here.',
    registeredAt: 'Registered {date}',
    suspendAction: 'Suspend',
    reactivateAction: 'Reactivate',
    cannotSuspendSelf: 'You cannot suspend your own account.',
    suspendDialog: {
      title: 'Suspend this user?',
      message: 'Suspending {name} will prevent them from signing in until you reactivate their account.'
    },
    reactivateDialog: {
      title: 'Reactivate this user?',
      message: '{name} will be able to sign in again immediately.'
    },
    viewDialog: {
      title: 'User details',
      roleLabel: 'Role',
      statusLabel: 'Account status',
      registeredLabel: 'Registered'
    },
    notifications: {
      suspendSuccess: 'The user account was suspended.',
      reactivateSuccess: 'The user account was reactivated.'
    }
  },
  organizations: {
    pageTitle: 'Organizations',
    subtitle: 'Review organizer applications and manage organization standing.',
    emptyTitle: 'No organizations yet',
    emptyMessage: 'Organizer applications will appear here.',
    submittedAt: 'Submitted {date}',
    actions: {
      approve: 'Approve',
      reject: 'Reject',
      suspend: 'Suspend',
      restore: 'Restore'
    },
    approveDialog: {
      title: 'Approve this organization?',
      message: '{name} will be able to publish actions once approved.'
    },
    rejectDialog: {
      title: 'Reject this organization?',
      message: '{name} will not be able to publish actions. Please explain why.',
      reasonLabel: 'Reason for rejection'
    },
    suspendDialog: {
      title: 'Suspend this organization?',
      message: 'Suspending {name} will hide its published actions from public discovery until it is restored. Records are kept, nothing is deleted.'
    },
    restoreDialog: {
      title: 'Restore this organization?',
      message: '{name} will be approved again and its eligible actions will become publicly visible.'
    },
    viewDialog: {
      contactLabel: 'Contact email',
      statusLabel: 'Status',
      submittedLabel: 'Submitted',
      reviewedLabel: 'Last reviewed',
      rejectionReasonLabel: 'Rejection reason'
    },
    notifications: {
      approveSuccess: 'The organization was approved.',
      rejectSuccess: 'The organization was rejected.',
      suspendSuccess: 'The organization was suspended.',
      restoreSuccess: 'The organization was restored.'
    }
  },
  actions: {
    pageTitle: 'Actions',
    subtitle: 'Review and moderate actions across every organizer lifecycle state.',
    emptyTitle: 'No actions yet',
    emptyMessage: 'Organizer actions will appear here.',
    actions: {
      approve: 'Approve',
      reject: 'Reject',
      hide: 'Hide',
      restore: 'Restore'
    },
    approveDialog: {
      title: 'Approve this action?',
      message: '"{title}" will be eligible to appear publicly once its organizer publishes it.'
    },
    rejectDialog: {
      title: 'Reject this action?',
      message: '"{title}" will not appear publicly. Please explain why.',
      reasonLabel: 'Reason for rejection'
    },
    hideDialog: {
      title: 'Hide this action?',
      message: '"{title}" will be removed from public discovery until restored. Records are kept, nothing is deleted.'
    },
    restoreDialog: {
      title: 'Restore this action?',
      message: '"{title}" will become eligible to appear publicly again.'
    },
    viewDialog: {
      organizerStatusLabel: 'Organizer status',
      moderationStatusLabel: 'Moderation status',
      organizationLabel: 'Organization',
      moderationReasonLabel: 'Moderation reason',
      openPublicPage: 'Open public page'
    },
    notifications: {
      approveSuccess: 'The action was approved.',
      rejectSuccess: 'The action was rejected.',
      hideSuccess: 'The action was hidden.',
      restoreSuccess: 'The action was restored.'
    }
  },
  reports: {
    pageTitle: 'Reports',
    subtitle: 'Review volunteer reports about problematic actions.',
    emptyTitle: 'No reports yet',
    emptyMessage: 'Volunteer reports will appear here.',
    reportedBy: 'Reported by {name} on {date}',
    missingAction: 'This action no longer exists.',
    hideActionAction: 'Hide the related action',
    actions: {
      investigating: 'Mark investigating',
      resolved: 'Resolve',
      dismissed: 'Dismiss'
    },
    statusDialog: {
      investigatingTitle: 'Mark this report as investigating?',
      investigatingMessage: 'This shows the report is being actively looked into.',
      resolvedTitle: 'Resolve this report?',
      resolvedMessage: 'You can add an optional note describing how it was resolved.',
      dismissedTitle: 'Dismiss this report?',
      dismissedMessage: 'You can add an optional note explaining why.',
      noteLabel: 'Note (optional)'
    },
    viewDialog: {
      title: 'Report details',
      actionLabel: 'Action',
      reasonLabel: 'Reason',
      descriptionLabel: 'Description',
      reporterLabel: 'Reported by',
      createdAtLabel: 'Reported on',
      resolutionNoteLabel: 'Resolution note'
    },
    notifications: {
      statusUpdateSuccess: 'The report status was updated.',
      hideActionSuccess: 'The related action was hidden.'
    }
  },
  activity: {
    pageTitle: 'Activity',
    subtitle: 'A read-only, mocked history of admin moderation actions — not a legally compliant audit log.',
    emptyTitle: 'No activity yet',
    emptyMessage: 'Admin moderation actions will appear here as they happen.',
    entries: {
      userSuspended: 'Suspended the user account {email}',
      userReactivated: 'Reactivated the user account {email}',
      organizationApproved: 'Approved the organization "{name}"',
      organizationRejected: 'Rejected the organization "{name}" ({reason})',
      organizationSuspended: 'Suspended the organization "{name}"',
      organizationRestored: 'Restored the organization "{name}"',
      actionApproved: 'Approved the action "{title}"',
      actionRejected: 'Rejected the action "{title}" ({reason})',
      actionHidden: 'Hid the action "{title}"',
      actionRestored: 'Restored the action "{title}"',
      reportStatusChanged: 'Changed a report status from {fromStatus} to {toStatus}'
    }
  }
}
