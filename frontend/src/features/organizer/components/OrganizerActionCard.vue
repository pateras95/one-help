<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import OHCard from '@/components/common/OHCard.vue'
import { getActionCategory } from '@/constants/actionCategories'
import { isPastDate } from '@/utils/date'
import { useParticipationStore } from '@/features/participation/stores/participation.store'
import { getLocalConfirmedCount } from '@/features/participation/utils/participationCount'
import { localizeField } from '../utils/localizeField'
import { ORGANIZER_ACTION_STATUS, allowedNextStatuses } from '../utils/organizerActionStatus'

const props = defineProps({
  action: {
    type: Object,
    required: true
  }
})

defineEmits(['view', 'edit', 'participants', 'transition'])

const { t, locale } = useI18n()
const participationStore = useParticipationStore()

const title = computed(() => localizeField(props.action.title, locale.value))
const category = computed(() => getActionCategory(props.action.categoryId))

const confirmedCount = computed(() => {
  void participationStore.countVersion
  return props.action.registeredCount + getLocalConfirmedCount(props.action.id)
})

const formattedDate = computed(() => {
  const formatter = new Intl.DateTimeFormat(locale.value === 'en' ? 'en-GB' : 'el-GR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
  return formatter.format(new Date(props.action.date))
})

const statusColor = computed(() => {
  if (props.action.organizerStatus === ORGANIZER_ACTION_STATUS.PUBLISHED) return 'success'
  if (props.action.organizerStatus === ORGANIZER_ACTION_STATUS.DRAFT) return 'textSecondary'
  if (props.action.organizerStatus === ORGANIZER_ACTION_STATUS.CLOSED) return 'warning'
  return 'error'
})

// 'closed' -> 'published' (republish) is only offered when the date is
// still valid — the service would reject it otherwise, but hiding it
// here keeps the menu from offering a transition that can't succeed.
const availableTransitions = computed(() =>
  allowedNextStatuses(props.action.organizerStatus).filter(
    (status) => !(status === ORGANIZER_ACTION_STATUS.PUBLISHED && isPastDate(props.action.date))
  )
)

function transitionLabel(status) {
  if (props.action.organizerStatus === ORGANIZER_ACTION_STATUS.CLOSED && status === ORGANIZER_ACTION_STATUS.PUBLISHED) {
    return t('organizer.card.republish')
  }
  if (status === ORGANIZER_ACTION_STATUS.PUBLISHED) return t('organizer.card.publish')
  if (status === ORGANIZER_ACTION_STATUS.CLOSED) return t('organizer.card.close')
  if (status === ORGANIZER_ACTION_STATUS.CANCELLED) return t('organizer.card.cancel')
  return status
}

function transitionKind(status) {
  if (props.action.organizerStatus === ORGANIZER_ACTION_STATUS.CLOSED && status === ORGANIZER_ACTION_STATUS.PUBLISHED) {
    return 'republish'
  }
  return status === ORGANIZER_ACTION_STATUS.PUBLISHED ? 'publish' : status === ORGANIZER_ACTION_STATUS.CLOSED ? 'close' : 'cancel'
}
</script>

<template>
  <OHCard class="pa-5 h-100 d-flex flex-column">
    <div class="d-flex align-center justify-space-between mb-3 ga-2">
      <VChip
        v-if="category"
        size="small"
        :color="category.accent"
        variant="tonal"
        :prepend-icon="category.icon"
      >
        {{ t(category.labelKey) }}
      </VChip>
      <VChip size="small" :color="statusColor" variant="tonal">
        {{ t(`organizer.status.${action.organizerStatus}`) }}
      </VChip>
    </div>

    <h3 class="text-subtitle-1 font-weight-bold mb-2">{{ title }}</h3>

    <div class="d-flex flex-column ga-1 text-body-2 text-textSecondary mb-4">
      <div class="d-flex align-center ga-2">
        <VIcon icon="mdi-calendar-blank-outline" size="18" aria-hidden="true" />
        <span>{{ t('organizer.card.upcomingDate', { date: formattedDate }) }}</span>
      </div>
      <div class="d-flex align-center ga-2">
        <VIcon icon="mdi-account-group-outline" size="18" aria-hidden="true" />
        <span>{{ t('organizer.card.capacity', { confirmed: confirmedCount, capacity: action.capacity }) }}</span>
      </div>
    </div>

    <div class="d-flex flex-wrap ga-2 mt-auto">
      <VBtn variant="tonal" color="primary" size="small" @click="$emit('view')">
        {{ t('organizer.card.view') }}
      </VBtn>
      <VBtn variant="tonal" size="small" @click="$emit('edit')">
        {{ t('organizer.card.edit') }}
      </VBtn>
      <VBtn variant="tonal" size="small" @click="$emit('participants')">
        {{ t('organizer.card.participants') }}
      </VBtn>

      <VMenu v-if="availableTransitions.length">
        <template #activator="{ props: menuProps }">
          <VBtn
            v-bind="menuProps"
            icon="mdi-dots-vertical"
            size="small"
            variant="text"
            :aria-label="t('organizer.card.actionsMenuAriaLabel', { title })"
          />
        </template>
        <VList density="compact">
          <VListItem
            v-for="status in availableTransitions"
            :key="status"
            :title="transitionLabel(status)"
            @click="$emit('transition', { kind: transitionKind(status), status })"
          />
        </VList>
      </VMenu>
    </div>
  </OHCard>
</template>
