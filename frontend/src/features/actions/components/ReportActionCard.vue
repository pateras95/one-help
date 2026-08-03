<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import OHCard from '@/components/common/OHCard.vue'
import OHButton from '@/components/common/OHButton.vue'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { useNotificationsStore } from '@/stores/notifications.store'
import { ROLES } from '@/constants/roles'
import { ROUTES, actionDetailsPath } from '@/constants/routes'
import { createReport } from '@/features/admin/services/reports.service'
import { REPORT_REASON } from '@/features/admin/utils/reportStatus'
import { adminErrorKey } from '@/features/admin/utils/adminErrors'

/**
 * Lets an authenticated volunteer flag a problem with this action for
 * admin review — a secondary, low-stakes action, so it renders nothing
 * at all for organizer/administrator accounts (they have no use for it
 * and it isn't part of their flows) rather than showing an explanatory
 * restriction message the way `ParticipationPanel` does for its
 * higher-stakes join/cancel actions.
 */
const props = defineProps({
  actionId: {
    type: String,
    required: true
  }
})

const { t } = useI18n()
const authStore = useAuthStore()
const notificationsStore = useNotificationsStore()

const showForRole = computed(() => !authStore.isAuthenticated || authStore.hasRole(ROLES.VOLUNTEER))

const dialogOpen = ref(false)
const reason = ref('')
const description = ref('')
const submitting = ref(false)

const reasonOptions = Object.values(REPORT_REASON).map((value) => ({ value, title: t(`admin.reportReason.${value}`) }))

function openDialog() {
  reason.value = ''
  description.value = ''
  dialogOpen.value = true
}

async function submit() {
  if (!reason.value || submitting.value) return
  submitting.value = true
  try {
    await createReport(authStore.currentUser.id, props.actionId, reason.value, description.value)
    notificationsStore.notify(t('actions.report.submitSuccess'), { type: 'success' })
    dialogOpen.value = false
  } catch (err) {
    notificationsStore.notify(t(adminErrorKey(err.message)), { type: 'error' })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <OHCard v-if="showForRole" class="pa-5">
    <h2 class="text-subtitle-2 font-weight-bold mb-2">{{ t('actions.report.sectionTitle') }}</h2>

    <template v-if="!authStore.isAuthenticated">
      <p class="text-body-2 text-textSecondary mb-3">{{ t('actions.report.signInMessage') }}</p>
      <OHButton
        variant="outlined"
        size="small"
        :to="{ path: ROUTES.LOGIN, query: { redirect: actionDetailsPath(actionId) } }"
      >
        {{ t('actions.report.signInAction') }}
      </OHButton>
    </template>

    <template v-else>
      <p class="text-body-2 text-textSecondary mb-3">{{ t('actions.report.description') }}</p>
      <OHButton variant="outlined" size="small" prepend-icon="mdi-flag-outline" @click="openDialog">
        {{ t('actions.report.action') }}
      </OHButton>
    </template>

    <VDialog v-model="dialogOpen" max-width="480">
      <VCard>
        <VCardTitle>{{ t('actions.report.dialogTitle') }}</VCardTitle>
        <VCardText>
          <VSelect
            v-model="reason"
            class="mb-3"
            :label="t('actions.report.reasonLabel')"
            :items="reasonOptions"
            variant="outlined"
            hide-details
          />
          <VTextarea
            v-model="description"
            :label="t('actions.report.descriptionLabel')"
            :hint="t('actions.report.descriptionHint')"
            persistent-hint
            variant="outlined"
            rows="3"
            auto-grow
          />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" :disabled="submitting" @click="dialogOpen = false">
            {{ t('actions.report.cancel') }}
          </VBtn>
          <VBtn
            color="primary"
            :loading="submitting"
            :disabled="submitting || !reason"
            @click="submit"
          >
            {{ t('actions.report.submit') }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </OHCard>
</template>
