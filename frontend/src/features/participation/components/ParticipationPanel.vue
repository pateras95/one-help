<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import OHCard from '@/components/common/OHCard.vue'
import OHButton from '@/components/common/OHButton.vue'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { useNotificationsStore } from '@/stores/notifications.store'
import { ROLES } from '@/constants/roles'
import { ROUTES, actionDetailsPath } from '@/constants/routes'
import { useParticipationStore } from '../stores/participation.store'
import { PARTICIPATION_STATUS } from '../utils/participationStatus'
import { participationErrorKey } from '../utils/participationErrors'

const props = defineProps({
  action: {
    type: Object,
    required: true
  }
})

const { t, locale } = useI18n()
const authStore = useAuthStore()
const participationStore = useParticipationStore()
const notificationsStore = useNotificationsStore()

const showJoinDialog = ref(false)
const showCancelDialog = ref(false)

// Organizer AND administrator accounts share the same "not a volunteer
// flow" restriction — only the copy differs, picked by `restrictionCopy`.
const isNonVolunteer = computed(() => authStore.isAuthenticated && !authStore.hasRole(ROLES.VOLUNTEER))
const restrictionCopy = computed(() => (authStore.hasRole(ROLES.ADMINISTRATOR) ? 'administratorRestriction' : 'organizerRestriction'))
const currentRecord = computed(() => participationStore.getByActionId(props.action.id))
const isConfirmed = computed(() => currentRecord.value?.status === PARTICIPATION_STATUS.CONFIRMED)
const isFull = computed(() => props.action.registeredCount >= props.action.capacity)
const isCompleted = computed(() => props.action.status === 'completed')
// Organizer-closed is distinct from completed: a closed action may
// still be in the future, so it needs its own copy rather than
// reusing "this action has already taken place".
const isOrganizerClosed = computed(() => props.action.status === 'closed')

const formattedDate = computed(() => {
  const formatter = new Intl.DateTimeFormat(locale.value === 'en' ? 'en-GB' : 'el-GR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })
  return formatter.format(new Date(props.action.date))
})

function notifyError(err) {
  notificationsStore.notify(t(participationErrorKey(err.message)), { type: 'error' })
}

async function confirmJoin() {
  if (participationStore.loading) return
  try {
    await participationStore.join(props.action.id)
    notificationsStore.notify(t('participation.notifications.joinSuccess'), { type: 'success' })
    showJoinDialog.value = false
  } catch (err) {
    notifyError(err)
    showJoinDialog.value = false
  }
}

async function confirmCancel() {
  if (participationStore.loading) return
  try {
    await participationStore.cancel(props.action.id)
    notificationsStore.notify(t('participation.notifications.cancelSuccess'), { type: 'success' })
    showCancelDialog.value = false
  } catch (err) {
    notifyError(err)
    showCancelDialog.value = false
  }
}
</script>

<template>
  <OHCard class="pa-5">
    <h2 class="text-subtitle-2 font-weight-bold mb-3">{{ t('participation.panelTitle') }}</h2>

    <template v-if="!authStore.isAuthenticated">
      <VAlert type="info" variant="tonal" density="comfortable" class="mb-3">
        <p class="font-weight-bold mb-1">{{ t('participation.cta.signInTitle') }}</p>
        <p class="text-body-2 mb-0">{{ t('participation.cta.signInMessage') }}</p>
      </VAlert>
      <OHButton
        color="primary"
        size="large"
        block
        :to="{ path: ROUTES.LOGIN, query: { redirect: actionDetailsPath(action.id) } }"
      >
        {{ t('participation.cta.signInAction') }}
      </OHButton>
    </template>

    <template v-else-if="isNonVolunteer">
      <VAlert type="info" variant="tonal" density="comfortable">
        <p class="font-weight-bold mb-1">{{ t(`participation.${restrictionCopy}.title`) }}</p>
        <p class="text-body-2 mb-0">{{ t(`participation.${restrictionCopy}.message`) }}</p>
      </VAlert>
    </template>

    <template v-else-if="isConfirmed">
      <VAlert type="success" variant="tonal" density="comfortable" class="mb-3">
        <p class="font-weight-bold mb-1">{{ t('participation.cta.confirmedTitle') }}</p>
        <p class="text-body-2 mb-0">{{ t('participation.cta.confirmedMessage') }}</p>
      </VAlert>
      <OHButton
        color="error"
        variant="outlined"
        size="large"
        block
        :loading="participationStore.loading"
        :disabled="participationStore.loading"
        :aria-label="t('participation.cta.cancel')"
        @click="showCancelDialog = true"
      >
        {{ participationStore.loading ? t('participation.cta.cancelling') : t('participation.cta.cancel') }}
      </OHButton>
    </template>

    <template v-else-if="isCompleted">
      <VAlert type="info" variant="tonal" density="comfortable">
        <p class="font-weight-bold mb-1">{{ t('participation.cta.unavailableTitle') }}</p>
        <p class="text-body-2 mb-0">{{ t('participation.cta.unavailableMessage') }}</p>
      </VAlert>
    </template>

    <template v-else-if="isOrganizerClosed">
      <VAlert type="info" variant="tonal" density="comfortable">
        <p class="font-weight-bold mb-1">{{ t('participation.cta.closedTitle') }}</p>
        <p class="text-body-2 mb-0">{{ t('participation.cta.closedMessage') }}</p>
      </VAlert>
    </template>

    <template v-else-if="isFull">
      <VAlert type="warning" variant="tonal" density="comfortable">
        <p class="font-weight-bold mb-1">{{ t('participation.cta.fullTitle') }}</p>
        <p class="text-body-2 mb-0">{{ t('participation.cta.fullMessage') }}</p>
      </VAlert>
    </template>

    <template v-else>
      <OHButton
        color="primary"
        size="large"
        block
        :loading="participationStore.loading"
        :disabled="participationStore.loading"
        :aria-label="t('participation.cta.join')"
        @click="showJoinDialog = true"
      >
        {{ participationStore.loading ? t('participation.cta.joining') : t('participation.cta.join') }}
      </OHButton>
    </template>

    <VDialog v-model="showJoinDialog" max-width="480">
      <VCard>
        <VCardTitle>{{ t('participation.joinDialog.title') }}</VCardTitle>
        <VCardText>
          <p>{{ t('participation.joinDialog.message', { title: action.title, date: formattedDate }) }}</p>
          <p class="text-caption text-textSecondary mb-0">{{ t('participation.joinDialog.disclaimer') }}</p>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" :disabled="participationStore.loading" @click="showJoinDialog = false">
            {{ t('participation.joinDialog.cancel') }}
          </VBtn>
          <VBtn
            color="primary"
            :loading="participationStore.loading"
            :disabled="participationStore.loading"
            @click="confirmJoin"
          >
            {{ t('participation.joinDialog.confirm') }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog v-model="showCancelDialog" max-width="480">
      <VCard>
        <VCardTitle>{{ t('participation.cancelDialog.title') }}</VCardTitle>
        <VCardText>
          <p class="mb-0">{{ t('participation.cancelDialog.message', { title: action.title }) }}</p>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" :disabled="participationStore.loading" @click="showCancelDialog = false">
            {{ t('participation.cancelDialog.cancel') }}
          </VBtn>
          <VBtn
            color="error"
            :loading="participationStore.loading"
            :disabled="participationStore.loading"
            @click="confirmCancel"
          >
            {{ t('participation.cancelDialog.confirm') }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </OHCard>
</template>
