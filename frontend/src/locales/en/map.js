export default {
  filters: {
    statusLabel: 'Status',
    statusAll: 'Any status',
    nearMeSortNote: 'Sorted by approximate distance from you.'
  },
  page: {
    title: 'Actions Map',
    subtitle: 'See where volunteering actions are happening and find the ones nearest to you.',
    mapAriaLabel: 'Interactive map of volunteering actions',
    resultsHeading: 'Results',
    resultsCount: 'No actions on the map | 1 action on the map | {count} actions on the map',
    loading: 'Loading actions...',
    errorTitle: 'Could not load actions',
    errorMessage: 'Please try again shortly.',
    emptyTitle: 'No actions match your filters',
    emptyMessage: 'Try changing or resetting the search filters.',
    noCoordinatesTitle: 'No actions with a map location yet',
    noCoordinatesMessage: "The actions matching your filters don't have coordinates yet. Check the Actions list for the full results.",
    tileErrorNote: 'The map may not have loaded fully. The results list is still available.'
  },
  selected: {
    title: 'Selected action',
    close: 'Close selected action',
    viewDetails: 'View details',
    noneTitle: 'No action selected',
    noneMessage: "Select an action on the map or in the list to see its details here."
  },
  nearMe: {
    action: 'Near me',
    loading: 'Finding your location...',
    reset: 'Reset map',
    denied: 'Location access was not allowed. You can keep using the map and list normally.',
    unavailable: 'Location is not available on this device.',
    timeout: 'Finding your location took too long. Please try again.',
    successNote: 'Actions were sorted by approximate distance from your location. Your location is never stored or sent anywhere.',
    markerTooltip: 'Your approximate location'
  },
  distance: {
    m: '{value} m away',
    km: '{value} km away'
  },
  actionDetails: {
    sectionTitle: 'Location on the map',
    openFullMap: 'Open full map',
    noCoordinatesNote: "A map isn't available for this action — see its location below."
  },
  organizerForm: {
    sectionCoordinates: 'Map coordinates (optional)',
    latitudeLabel: 'Latitude',
    longitudeLabel: 'Longitude',
    coordinatesHint: 'Optional. Fill in both fields for this action to appear on the map, or leave both blank.',
    missingCoordinatesNote: "This action has no coordinates, so it won't appear on the map. It stays visible in the Actions list."
  },
  validation: {
    invalidLatitude: 'Latitude must be between -90 and 90.',
    invalidLongitude: 'Longitude must be between -180 and 180.',
    coordinatesRequiredTogether: 'Fill in both coordinate fields, or leave both blank.'
  }
}
