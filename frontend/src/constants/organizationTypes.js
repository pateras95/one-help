/**
 * Shared organization-type definitions — the single source of truth for
 * the organizer application form and any admin/organization display.
 * Stable ids + translation keys only, same convention as
 * `actionCategories.js` — never a translated string stored on a record.
 */
export const ORGANIZATION_TYPES = [
  { id: 'ngo', labelKey: 'organizationTypes.ngo' },
  { id: 'municipality', labelKey: 'organizationTypes.municipality' },
  { id: 'healthOrganization', labelKey: 'organizationTypes.healthOrganization' },
  { id: 'volunteerGroup', labelKey: 'organizationTypes.volunteerGroup' },
  { id: 'animalWelfare', labelKey: 'organizationTypes.animalWelfare' },
  { id: 'educationalInstitution', labelKey: 'organizationTypes.educationalInstitution' },
  { id: 'communityAssociation', labelKey: 'organizationTypes.communityAssociation' },
  { id: 'other', labelKey: 'organizationTypes.other' }
]

export function getOrganizationType(typeId) {
  return ORGANIZATION_TYPES.find((type) => type.id === typeId)
}

export function isValidOrganizationTypeId(typeId) {
  return ORGANIZATION_TYPES.some((type) => type.id === typeId)
}
