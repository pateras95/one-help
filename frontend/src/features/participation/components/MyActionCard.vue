<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import OHCard from '@/components/common/OHCard.vue'
import OHButton from '@/components/common/OHButton.vue'
import { getActionCategory } from '@/constants/actionCategories'
import { actionDetailsPath } from '@/constants/routes'
import { PARTICIPATION_STATUS } from '../utils/participationStatus'

const props = defineProps({
  participation: {
    type: Object,
    required: true
  },
  // `null` when the referenced action can no longer be found (e.g. a
  // malformed/tampered participation record) — rendered as a distinct
  // "unknown action" state rather than crashing on missing fields.
  action: {
    type: Object,
    default: null
  },
  cancellable: {
    type: Boolean,
    default: false
  }
})

defineEmits(['cancel'])

const { t, locale } = useI18n()

const category = computed(() => (props.action ? getActionCategory(props.action.categoryId) : null))

const formattedDate = computed(() => {
  if (!props.action) return ''
  const formatter = new Intl.DateTimeFormat(locale.value === 'en' ? 'en-GB' : 'el-GR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  })
  return formatter.format(new Date(props.action.date))
})
</script>

<template>
  <OHCard class="pa-5">
    <template v-if="action">
      <div class="d-flex align-center flex-wrap ga-2 mb-2">
        <VChip
          v-if="category"
          size="small"
          :color="category.accent"
          variant="tonal"
          :prepend-icon="category.icon"
        >
          {{ t(category.labelKey) }}
        </VChip>
        <VChip
          size="small"
          variant="tonal"
          :color="participation.status === PARTICIPATION_STATUS.CONFIRMED ? 'success' : 'textSecondary'"
        >
          {{ t(`participation.status.${participation.status}`) }}
        </VChip>
      </div>

      <h3 class="text-subtitle-1 font-weight-bold mb-3">{{ action.title }}</h3>

      <div class="d-flex flex-column ga-1 text-body-2 text-textSecondary mb-4">
        <div class="d-flex align-center ga-2">
          <VIcon icon="mdi-calendar-blank-outline" size="18" aria-hidden="true" />
          <span class="text-capitalize">{{ formattedDate }} · {{ action.startTime }}</span>
        </div>
        <div class="d-flex align-center ga-2">
          <VIcon icon="mdi-map-marker-outline" size="18" aria-hidden="true" />
          <span>{{ action.locationName }}, {{ action.municipality }}</span>
        </div>
        <div class="d-flex align-center ga-2">
          <VIcon icon="mdi-account-group-outline" size="18" aria-hidden="true" />
          <span>{{ action.organization }}</span>
        </div>
      </div>

      <div class="d-flex flex-wrap ga-2">
        <OHButton variant="tonal" color="primary" :to="actionDetailsPath(action.id)">
          {{ t('participation.myActions.viewDetails') }}
        </OHButton>
        <OHButton
          v-if="cancellable"
          variant="outlined"
          color="error"
          :aria-label="t('participation.myActions.cancelAriaLabel', { title: action.title })"
          @click="$emit('cancel')"
        >
          {{ t('participation.myActions.cancelParticipation') }}
        </OHButton>
      </div>
    </template>

    <template v-else>
      <VAlert type="warning" variant="tonal" density="comfortable">
        <p class="font-weight-bold mb-1">{{ t('participation.myActions.unknownAction') }}</p>
        <p class="text-body-2 mb-0">{{ t('participation.myActions.unknownActionMessage') }}</p>
      </VAlert>
      <OHButton
        v-if="cancellable"
        class="mt-3"
        variant="outlined"
        color="error"
        @click="$emit('cancel')"
      >
        {{ t('participation.myActions.cancelParticipation') }}
      </OHButton>
    </template>
  </OHCard>
</template>
