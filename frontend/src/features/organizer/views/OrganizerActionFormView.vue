<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import OHPageHeader from '@/components/common/OHPageHeader.vue'
import OHButton from '@/components/common/OHButton.vue'
import LoadingState from '@/components/feedback/LoadingState.vue'
import ErrorState from '@/components/feedback/ErrorState.vue'
import EmptyState from '@/components/feedback/EmptyState.vue'
import { useNotificationsStore } from '@/stores/notifications.store'
import { getLocalConfirmedCount } from '@/features/participation/utils/participationCount'
import { organizerActionDetailsPath, ROUTES } from '@/constants/routes'
import { useOrganizerStore } from '../stores/organizer.store'
import { organizerActionErrorKey } from '../utils/organizerActionErrors'
import OrganizerActionForm from '../components/OrganizerActionForm.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const organizerStore = useOrganizerStore()
const notificationsStore = useNotificationsStore()

const submitting = ref(false)
const formError = ref('')

const actionId = computed(() => (typeof route.params.actionId === 'string' ? route.params.actionId : null))
const isEditMode = computed(() => Boolean(actionId.value))

function load() {
  if (isEditMode.value) organizerStore.loadActionById(actionId.value)
}

onMounted(load)
watch(actionId, load)

const isNotFoundError = computed(
  () => organizerStore.selectedActionError === 'actionNotFound' || organizerStore.selectedActionError === 'notOwner'
)

const minCapacity = computed(() => {
  if (!isEditMode.value || !organizerStore.selectedAction) return 0
  return organizerStore.selectedAction.registeredCount + getLocalConfirmedCount(actionId.value)
})

/**
 * Chosen flow: both create and edit redirect to the organizer action
 * details page on success (not back to the dashboard) — the organizer
 * immediately sees the saved result, including its current public
 * visibility, in one place.
 */
async function handleSubmit(payload) {
  formError.value = ''
  submitting.value = true
  try {
    if (isEditMode.value) {
      await organizerStore.update(actionId.value, payload)
      notificationsStore.notify(t('organizer.form.notifications.updateSuccess'), { type: 'success' })
      router.push(organizerActionDetailsPath(actionId.value))
    } else {
      const created = await organizerStore.create(payload)
      notificationsStore.notify(t('organizer.form.notifications.createSuccess'), { type: 'success' })
      router.push(organizerActionDetailsPath(created.id))
    }
  } catch (err) {
    formError.value = t(organizerActionErrorKey(err.message))
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <DefaultLayout>
    <OHButton
      variant="text"
      prepend-icon="mdi-arrow-left"
      class="mb-4"
      :to="ROUTES.ORGANIZER"
    >
      {{ t('organizer.form.backToDashboard') }}
    </OHButton>

    <template v-if="isEditMode">
      <LoadingState v-if="organizerStore.selectedActionLoading" :label="t('organizer.form.loading')" />

      <EmptyState
        v-else-if="isNotFoundError"
        :title="t('organizer.form.notFoundTitle')"
        :message="t('organizer.form.notFoundMessage')"
        icon="mdi-map-marker-question-outline"
      >
        <OHButton class="mt-4" color="primary" :to="ROUTES.ORGANIZER">
          {{ t('organizer.form.backToDashboard') }}
        </OHButton>
      </EmptyState>

      <ErrorState
        v-else-if="organizerStore.selectedActionError"
        :title="t('organizer.form.errorTitle')"
        :message="t('organizer.form.errorMessage')"
        @retry="load"
      />

      <template v-else-if="organizerStore.selectedAction">
        <OHPageHeader eyebrow="OneHelp" :title="t('organizer.form.editTitle')" />
        <VAlert v-if="formError" type="error" variant="tonal" density="comfortable" class="mb-4" role="alert">
          {{ formError }}
        </VAlert>
        <OrganizerActionForm
          :initial-action="organizerStore.selectedAction"
          :min-capacity="minCapacity"
          :submitting="submitting"
          @submit="handleSubmit"
        />
      </template>
    </template>

    <template v-else>
      <OHPageHeader eyebrow="OneHelp" :title="t('organizer.form.createTitle')" />
      <VAlert v-if="formError" type="error" variant="tonal" density="comfortable" class="mb-4" role="alert">
        {{ formError }}
      </VAlert>
      <OrganizerActionForm :submitting="submitting" @submit="handleSubmit" />
    </template>
  </DefaultLayout>
</template>
