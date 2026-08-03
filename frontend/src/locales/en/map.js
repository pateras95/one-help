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
    directions: 'Directions',
    directionsAriaLabel: 'Open directions to "{title}" in Google Maps in a new tab',
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
    directions: 'Directions',
    directionsAriaLabel: 'Open directions to "{title}" in Google Maps in a new tab',
    noCoordinatesNote: "A map isn't available for this action — see its location below."
  },
  organizerForm: {
    sectionCoordinates: 'Action location on map',
    coordinatesHint: 'Optional. This map marker controls where this action appears on the Actions Map — it is separate from the address fields above and does not change them.',
    pickerInstructions: 'Click or tap the map to place the marker. Drag the marker to move it.',
    pickerAriaLabel: "Interactive map for choosing this action's location. Click or tap to place a marker, or drag the marker to move it.",
    selectedCoordinates: 'Selected coordinates: {lat}, {lng}',
    noLocationSelected: 'No location selected yet — this action will not appear on the map until you place a marker.',
    clearLocation: 'Clear location',
    missingCoordinatesNote: "This action has no coordinates, so it won't appear on the map. It stays visible in the Actions list."
  },
  validation: {
    invalidLatitude: 'Latitude must be between -90 and 90.',
    invalidLongitude: 'Longitude must be between -180 and 180.',
    coordinatesRequiredTogether: 'Fill in both coordinate fields, or leave both blank.'
  }
}
