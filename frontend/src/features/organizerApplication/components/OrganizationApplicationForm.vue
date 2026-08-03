<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import OHButton from '@/components/common/OHButton.vue'
import { ORGANIZATION_TYPES } from '@/constants/organizationTypes'
import { ACTION_CATEGORIES } from '@/constants/actionCategories'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const WEBSITE_PATTERN = /^https?:\/\/.+\..+/i
const TEXT_MIN_LENGTH = 20
const TEXT_MAX_LENGTH = 2000

const props = defineProps({
  // Present in edit/resubmit mode, preloads the form. `null` for a
  // brand-new application.
  initialApplication: {
    type: Object,
    default: null
  },
  submitting: {
    type: Boolean,
    default: false
  },
  submitLabel: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['submit'])

const { t, locale } = useI18n()

const name = ref('')
const organizationType = ref('')
const description = ref('')
const contactEmail = ref('')
const phone = ref('')
const website = ref('')
const address = ref('')
const municipality = ref('')
const categories = ref([])
const supportingMessage = ref('')
const acceptedTerms = ref(false)

const fieldErrors = ref({})

function loadFromApplication(application) {
  if (!application) return
  name.value = application.name?.[locale.value] ?? application.name?.el ?? ''
  organizationType.value = application.organizationType ?? ''
  description.value = application.description?.[locale.value] ?? application.description?.el ?? ''
  contactEmail.value = application.contactEmail ?? ''
  phone.value = application.phone ?? ''
  website.value = application.website ?? ''
  address.value = application.address ?? ''
  municipality.value = application.municipality ?? ''
  categories.value = application.categories ? [...application.categories] : []
  supportingMessage.value = application.supportingMessage ?? ''
  acceptedTerms.value = false
}

watch(() => props.initialApplication, loadFromApplication, { immediate: true })

function validate() {
  const errors = {}

  if (!name.value.trim() || name.value.trim().length < 2 || name.value.trim().length > 120) {
    errors.name = t('becomeOrganizer.form.validation.required')
  }
  if (!organizationType.value) {
    errors.organizationType = t('becomeOrganizer.form.validation.required')
  }
  if (!description.value.trim() || description.value.trim().length < TEXT_MIN_LENGTH) {
    errors.description = t('becomeOrganizer.form.validation.textTooShort', { min: TEXT_MIN_LENGTH })
  } else if (description.value.trim().length > TEXT_MAX_LENGTH) {
    errors.description = t('becomeOrganizer.form.validation.textTooLong', { max: TEXT_MAX_LENGTH })
  }
  if (!contactEmail.value.trim()) {
    errors.contactEmail = t('becomeOrganizer.form.validation.required')
  } else if (!EMAIL_PATTERN.test(contactEmail.value.trim())) {
    errors.contactEmail = t('becomeOrganizer.form.validation.invalidEmail')
  }
  if (website.value.trim() && !WEBSITE_PATTERN.test(website.value.trim())) {
    errors.website = t('becomeOrganizer.form.validation.invalidWebsite')
  }
  if (!address.value.trim()) {
    errors.address = t('becomeOrganizer.form.validation.required')
  }
  if (!municipality.value.trim()) {
    errors.municipality = t('becomeOrganizer.form.validation.required')
  }
  if (categories.value.length === 0) {
    errors.categories = t('becomeOrganizer.form.validation.categoriesRequired')
  }
  if (!supportingMessage.value.trim() || supportingMessage.value.trim().length < TEXT_MIN_LENGTH) {
    errors.supportingMessage = t('becomeOrganizer.form.validation.textTooShort', { min: TEXT_MIN_LENGTH })
  } else if (supportingMessage.value.trim().length > TEXT_MAX_LENGTH) {
    errors.supportingMessage = t('becomeOrganizer.form.validation.textTooLong', { max: TEXT_MAX_LENGTH })
  }
  if (!acceptedTerms.value) {
    errors.acceptedTerms = t('becomeOrganizer.form.validation.termsRequired')
  }

  fieldErrors.value = errors
  return Object.keys(errors).length === 0
}

function handleSubmit() {
  if (!validate()) return
  emit('submit', {
    name: name.value.trim(),
    organizationType: organizationType.value,
    description: description.value.trim(),
    contactEmail: contactEmail.value.trim(),
    phone: phone.value.trim() || null,
    website: website.value.trim() || null,
    address: address.value.trim(),
    municipality: municipality.value.trim(),
    categories: categories.value,
    supportingMessage: supportingMessage.value.trim(),
    acceptedTerms: acceptedTerms.value
  })
}

defineExpose({ validate })
</script>

<template>
  <form novalidate @submit.prevent="handleSubmit">
    <h2 class="text-subtitle-1 font-weight-bold mb-3">{{ t('becomeOrganizer.form.sectionOrganization') }}</h2>
    <VRow>
      <VCol cols="12" md="6">
        <VTextField
          v-model="name"
          :label="t('becomeOrganizer.form.nameLabel')"
          variant="outlined"
          :error-messages="fieldErrors.name"
        />
      </VCol>
      <VCol cols="12" md="6">
        <VSelect
          v-model="organizationType"
          :label="t('becomeOrganizer.form.typeLabel')"
          :items="ORGANIZATION_TYPES.map((type) => ({ value: type.id, title: t(type.labelKey) }))"
          variant="outlined"
          :error-messages="fieldErrors.organizationType"
        />
      </VCol>
      <VCol cols="12">
        <VTextarea
          v-model="description"
          :label="t('becomeOrganizer.form.descriptionLabel')"
          :hint="t('becomeOrganizer.form.descriptionHint')"
          persistent-hint
          variant="outlined"
          rows="3"
          auto-grow
          :error-messages="fieldErrors.description"
        />
      </VCol>
    </VRow>

    <h2 class="text-subtitle-1 font-weight-bold mb-3 mt-2">{{ t('becomeOrganizer.form.sectionContact') }}</h2>
    <VRow>
      <VCol cols="12" md="6">
        <VTextField
          v-model="contactEmail"
          type="email"
          :label="t('becomeOrganizer.form.contactEmailLabel')"
          variant="outlined"
          :error-messages="fieldErrors.contactEmail"
        />
      </VCol>
      <VCol cols="12" md="6">
        <VTextField
          v-model="phone"
          :label="t('becomeOrganizer.form.phoneLabel')"
          :hint="t('becomeOrganizer.form.optionalHint')"
          persistent-hint
          variant="outlined"
        />
      </VCol>
      <VCol cols="12" md="6">
        <VTextField
          v-model="website"
          :label="t('becomeOrganizer.form.websiteLabel')"
          :hint="t('becomeOrganizer.form.websiteHint')"
          persistent-hint
          variant="outlined"
          :error-messages="fieldErrors.website"
        />
      </VCol>
    </VRow>

    <h2 class="text-subtitle-1 font-weight-bold mb-3 mt-2">{{ t('becomeOrganizer.form.sectionLocation') }}</h2>
    <VRow>
      <VCol cols="12" md="6">
        <VTextField
          v-model="address"
          :label="t('becomeOrganizer.form.addressLabel')"
          variant="outlined"
          :error-messages="fieldErrors.address"
        />
      </VCol>
      <VCol cols="12" md="6">
        <VTextField
          v-model="municipality"
          :label="t('becomeOrganizer.form.municipalityLabel')"
          variant="outlined"
          :error-messages="fieldErrors.municipality"
        />
      </VCol>
    </VRow>

    <h2 class="text-subtitle-1 font-weight-bold mb-3 mt-2">{{ t('becomeOrganizer.form.sectionActivity') }}</h2>
    <VSelect
      v-model="categories"
      multiple
      chips
      closable-chips
      :label="t('becomeOrganizer.form.categoriesLabel')"
      :items="ACTION_CATEGORIES.map((category) => ({ value: category.id, title: t(category.labelKey) }))"
      variant="outlined"
      class="mb-2"
      :error-messages="fieldErrors.categories"
    />
    <VTextarea
      v-model="supportingMessage"
      :label="t('becomeOrganizer.form.supportingMessageLabel')"
      :hint="t('becomeOrganizer.form.supportingMessageHint')"
      persistent-hint
      variant="outlined"
      rows="4"
      auto-grow
      class="mt-2"
      :error-messages="fieldErrors.supportingMessage"
    />

    <VCheckbox
      v-model="acceptedTerms"
      class="mt-4"
      :label="t('becomeOrganizer.form.termsLabel')"
      :error-messages="fieldErrors.acceptedTerms"
      density="comfortable"
    />

    <OHButton
      type="submit"
      color="primary"
      size="large"
      class="mt-2"
      :loading="submitting"
      :disabled="submitting"
    >
      {{ submitLabel }}
    </OHButton>
  </form>
</template>
