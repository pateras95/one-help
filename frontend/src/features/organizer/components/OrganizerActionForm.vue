<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import OHButton from '@/components/common/OHButton.vue'
import { ACTION_CATEGORIES, isValidCategoryId } from '@/constants/actionCategories'
import { isPastDate } from '@/utils/date'
import LocationPickerMap from '@/features/map/components/LocationPickerMap.vue'
import { ORGANIZER_ACTION_STATUS } from '../utils/organizerActionStatus'

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/
const URGENCY_LEVELS = ['normal', 'high', 'urgent']

const props = defineProps({
  // Present in edit mode, preloads the form. `null` in create mode.
  initialAction: {
    type: Object,
    default: null
  },
  // Confirmed participants the action already has — capacity can never
  // be set below this. Always 0 in create mode.
  minCapacity: {
    type: Number,
    default: 0
  },
  submitting: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['submit'])

const { t } = useI18n()

const titleEl = ref('')
const titleEn = ref('')
const descriptionEl = ref('')
const descriptionEn = ref('')
const categoryId = ref('')
const date = ref('')
const startTime = ref('')
const locationNameEl = ref('')
const locationNameEn = ref('')
const municipality = ref('')
// Numeric or null (never a string) — set only by the map picker or
// `clearLocation()`, never typed directly, so both are always in sync.
const latitude = ref(null)
const longitude = ref(null)
const capacity = ref(20)
const urgency = ref('normal')
const equipmentEl = ref('')
const equipmentEn = ref('')
const organizerStatus = ref(ORGANIZER_ACTION_STATUS.DRAFT)

const fieldErrors = ref({})

function loadFromAction(action) {
  if (!action) return
  titleEl.value = action.title.el
  titleEn.value = action.title.en
  descriptionEl.value = action.description.el
  descriptionEn.value = action.description.en
  categoryId.value = action.categoryId
  date.value = action.date
  startTime.value = action.startTime
  locationNameEl.value = action.locationName.el
  locationNameEn.value = action.locationName.en
  municipality.value = action.municipality.el
  latitude.value = action.latitude ?? null
  longitude.value = action.longitude ?? null
  capacity.value = action.capacity
  urgency.value = action.urgency
  equipmentEl.value = action.requiredEquipment.el.join(', ')
  equipmentEn.value = action.requiredEquipment.en.join(', ')
}

watch(() => props.initialAction, loadFromAction, { immediate: true })

function handleLocationUpdate({ lat, lng }) {
  latitude.value = lat
  longitude.value = lng
}

function clearLocation() {
  latitude.value = null
  longitude.value = null
}

function parseEquipment(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function validate() {
  const errors = {}

  if (!titleEl.value.trim()) errors.titleEl = t('organizer.form.validation.required')
  if (!titleEn.value.trim()) errors.titleEn = t('organizer.form.validation.required')
  if (!descriptionEl.value.trim()) errors.descriptionEl = t('organizer.form.validation.required')
  if (!descriptionEn.value.trim()) errors.descriptionEn = t('organizer.form.validation.required')
  if (!isValidCategoryId(categoryId.value)) errors.categoryId = t('organizer.form.validation.invalidCategory')
  if (!locationNameEl.value.trim()) errors.locationNameEl = t('organizer.form.validation.required')
  if (!locationNameEn.value.trim()) errors.locationNameEn = t('organizer.form.validation.required')
  if (!municipality.value.trim()) errors.municipality = t('organizer.form.validation.required')
  if (!date.value || isPastDate(date.value)) errors.date = t('organizer.form.validation.invalidDate')
  if (!TIME_PATTERN.test(startTime.value)) errors.startTime = t('organizer.form.validation.invalidTime')

  // Defensive only — the map picker always sets both together with
  // in-range values, so a normal user should never actually hit this.
  const hasLatitude = latitude.value != null
  const hasLongitude = longitude.value != null
  if (hasLatitude !== hasLongitude) {
    errors.location = t('map.validation.coordinatesRequiredTogether')
  } else if (hasLatitude && hasLongitude) {
    if (!Number.isFinite(latitude.value) || latitude.value < -90 || latitude.value > 90) {
      errors.location = t('map.validation.invalidLatitude')
    } else if (!Number.isFinite(longitude.value) || longitude.value < -180 || longitude.value > 180) {
      errors.location = t('map.validation.invalidLongitude')
    }
  }

  const capacityValue = Number(capacity.value)
  if (!Number.isFinite(capacityValue) || capacityValue <= 0) {
    errors.capacity = t('organizer.form.validation.invalidCapacity')
  } else if (capacityValue < props.minCapacity) {
    errors.capacity = t('organizer.form.validation.capacityBelowConfirmed', { confirmed: props.minCapacity })
  }

  fieldErrors.value = errors
  return Object.keys(errors).length === 0
}

function handleSubmit() {
  if (!validate()) return

  const payload = {
    categoryId: categoryId.value,
    title: { el: titleEl.value.trim(), en: titleEn.value.trim() },
    description: { el: descriptionEl.value.trim(), en: descriptionEn.value.trim() },
    locationName: { el: locationNameEl.value.trim(), en: locationNameEn.value.trim() },
    municipality: municipality.value.trim(),
    latitude: latitude.value,
    longitude: longitude.value,
    date: date.value,
    startTime: startTime.value,
    capacity: Number(capacity.value),
    urgency: urgency.value,
    requiredEquipment: { el: parseEquipment(equipmentEl.value), en: parseEquipment(equipmentEn.value) }
  }

  if (!props.initialAction) {
    payload.organizerStatus = organizerStatus.value
  }

  emit('submit', payload)
}

defineExpose({ validate })
</script>

<template>
  <form novalidate @submit.prevent="handleSubmit">
    <h2 class="text-subtitle-1 font-weight-bold mb-3">{{ t('organizer.form.sectionBasics') }}</h2>
    <VRow>
      <VCol cols="12" md="6">
        <VTextField
          v-model="titleEl"
          :label="t('organizer.form.titleElLabel')"
          variant="outlined"
          :error-messages="fieldErrors.titleEl"
        />
      </VCol>
      <VCol cols="12" md="6">
        <VTextField
          v-model="titleEn"
          :label="t('organizer.form.titleEnLabel')"
          variant="outlined"
          :error-messages="fieldErrors.titleEn"
        />
      </VCol>
      <VCol cols="12" md="6">
        <VTextarea
          v-model="descriptionEl"
          :label="t('organizer.form.descriptionElLabel')"
          variant="outlined"
          rows="3"
          :error-messages="fieldErrors.descriptionEl"
        />
      </VCol>
      <VCol cols="12" md="6">
        <VTextarea
          v-model="descriptionEn"
          :label="t('organizer.form.descriptionEnLabel')"
          variant="outlined"
          rows="3"
          :error-messages="fieldErrors.descriptionEn"
        />
      </VCol>
      <VCol cols="12" md="6">
        <VSelect
          v-model="categoryId"
          :label="t('organizer.form.categoryLabel')"
          :items="ACTION_CATEGORIES.map((c) => ({ value: c.id, title: t(c.labelKey) }))"
          variant="outlined"
          :error-messages="fieldErrors.categoryId"
        />
      </VCol>
      <VCol cols="12" md="6">
        <VSelect
          v-model="urgency"
          :label="t('organizer.form.urgencyLabel')"
          :items="URGENCY_LEVELS.map((level) => ({ value: level, title: t(`actions.urgency.${level}`) }))"
          variant="outlined"
        />
      </VCol>
    </VRow>

    <h2 class="text-subtitle-1 font-weight-bold mb-3 mt-2">{{ t('organizer.form.sectionSchedule') }}</h2>
    <VRow>
      <VCol cols="12" md="6">
        <VTextField
          v-model="date"
          type="date"
          :label="t('organizer.form.dateLabel')"
          variant="outlined"
          :error-messages="fieldErrors.date"
        />
      </VCol>
      <VCol cols="12" md="6">
        <VTextField
          v-model="startTime"
          type="time"
          :label="t('organizer.form.startTimeLabel')"
          variant="outlined"
          :error-messages="fieldErrors.startTime"
        />
      </VCol>
    </VRow>

    <h2 class="text-subtitle-1 font-weight-bold mb-3 mt-2">{{ t('organizer.form.sectionLocation') }}</h2>
    <VRow>
      <VCol cols="12" md="6">
        <VTextField
          v-model="locationNameEl"
          :label="t('organizer.form.locationNameElLabel')"
          variant="outlined"
          :error-messages="fieldErrors.locationNameEl"
        />
      </VCol>
      <VCol cols="12" md="6">
        <VTextField
          v-model="locationNameEn"
          :label="t('organizer.form.locationNameEnLabel')"
          variant="outlined"
          :error-messages="fieldErrors.locationNameEn"
        />
      </VCol>
      <VCol cols="12" md="6">
        <VTextField
          v-model="municipality"
          :label="t('organizer.form.municipalityLabel')"
          variant="outlined"
          :error-messages="fieldErrors.municipality"
        />
      </VCol>
    </VRow>

    <h3 class="text-subtitle-2 font-weight-bold mb-2 mt-2">{{ t('map.organizerForm.sectionCoordinates') }}</h3>
    <p class="text-body-2 text-textSecondary mb-1">{{ t('map.organizerForm.coordinatesHint') }}</p>
    <p class="text-caption text-textSecondary mb-3">{{ t('map.organizerForm.pickerInstructions') }}</p>

    <div class="oh-organizer-form__picker-wrapper mb-2">
      <LocationPickerMap :latitude="latitude" :longitude="longitude" @update:location="handleLocationUpdate" />
    </div>

    <div class="d-flex align-center flex-wrap ga-3 mb-1">
      <p class="text-body-2 text-textSecondary mb-0">
        <template v-if="latitude != null && longitude != null">
          {{ t('map.organizerForm.selectedCoordinates', { lat: latitude.toFixed(5), lng: longitude.toFixed(5) }) }}
        </template>
        <template v-else>{{ t('map.organizerForm.noLocationSelected') }}</template>
      </p>
      <OHButton
        v-if="latitude != null || longitude != null"
        variant="text"
        size="small"
        prepend-icon="mdi-map-marker-remove-outline"
        @click="clearLocation"
      >
        {{ t('map.organizerForm.clearLocation') }}
      </OHButton>
    </div>
    <p v-if="fieldErrors.location" class="text-caption text-error mb-3" role="alert">
      {{ fieldErrors.location }}
    </p>

    <h2 class="text-subtitle-1 font-weight-bold mb-3 mt-2">{{ t('organizer.form.sectionDetails') }}</h2>
    <VRow>
      <VCol cols="12" md="6">
        <VTextField
          v-model="capacity"
          type="number"
          min="1"
          :label="t('organizer.form.capacityLabel')"
          variant="outlined"
          :error-messages="fieldErrors.capacity"
        />
      </VCol>
      <VCol cols="12" md="6">
        <VTextField
          v-model="equipmentEl"
          :label="t('organizer.form.equipmentElLabel')"
          :hint="t('organizer.form.equipmentHint')"
          persistent-hint
          variant="outlined"
        />
      </VCol>
      <VCol cols="12" md="6" offset-md="6">
        <VTextField
          v-model="equipmentEn"
          :label="t('organizer.form.equipmentEnLabel')"
          :hint="t('organizer.form.equipmentHint')"
          persistent-hint
          variant="outlined"
        />
      </VCol>
    </VRow>

    <template v-if="!initialAction">
      <h2 class="text-subtitle-1 font-weight-bold mb-3 mt-2">{{ t('organizer.form.sectionStatus') }}</h2>
      <VRadioGroup v-model="organizerStatus" class="mb-2">
        <VRadio :value="'draft'" :label="t('organizer.form.statusDraftOption')" />
        <VRadio :value="'published'" :label="t('organizer.form.statusPublishedOption')" />
      </VRadioGroup>
    </template>

    <OHButton
      type="submit"
      color="primary"
      size="large"
      class="mt-4"
      :loading="submitting"
      :disabled="submitting"
    >
      {{ submitting ? t('organizer.form.submitting') : (initialAction ? t('organizer.form.submitEdit') : t('organizer.form.submitCreate')) }}
    </OHButton>
  </form>
</template>

<style scoped>
.oh-organizer-form__picker-wrapper {
  height: 320px;
}
</style>
