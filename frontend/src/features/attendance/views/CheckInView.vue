<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { QrcodeStream } from 'vue-qrcode-reader'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import OHCard from '@/components/common/OHCard.vue'
import OHButton from '@/components/common/OHButton.vue'
import LoadingState from '@/components/feedback/LoadingState.vue'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { useNotificationsStore } from '@/stores/notifications.store'
import { useParticipationStore } from '@/features/participation/stores/participation.store'
import { PARTICIPATION_STATUS } from '@/features/participation/utils/participationStatus'
import { ROLES } from '@/constants/roles'
import { ROUTES } from '@/constants/routes'
import { useAttendanceStore } from '../stores/attendance.store'
import { attendanceErrorKey } from '../utils/attendanceErrors'

const { t, locale } = useI18n()
const route = useRoute()
const authStore = useAuthStore()
const participationStore = useParticipationStore()
const attendanceStore = useAttendanceStore()
const notificationsStore = useNotificationsStore()

const isOrganizer = computed(() => authStore.hasRole(ROLES.ORGANIZER))

// input -> confirm -> success, or one of the terminal error phases below.
const phase = ref('input')
const inputTab = ref('camera')
const cameraState = ref('starting') // starting | active | denied | unavailable
const manualCode = ref('')
const validating = ref(false)
const checkingIn = ref(false)
const pendingToken = ref('')
const resolvedAction = ref(null)
const genericErrorMessage = ref('')

const formattedActionDate = computed(() => {
  if (!resolvedAction.value) return ''
  const formatter = new Intl.DateTimeFormat(locale.value === 'en' ? 'en-GB' : 'el-GR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })
  return formatter.format(new Date(resolvedAction.value.date))
})
const resolvedActionTitle = computed(() => {
  if (!resolvedAction.value) return ''
  return resolvedAction.value.title[locale.value === 'en' ? 'en' : 'el'] ?? resolvedAction.value.title.el
})

async function handleToken(token) {
  if (validating.value) return
  pendingToken.value = token
  validating.value = true
  try {
    const result = await attendanceStore.validateToken(token)
    resolvedAction.value = result.action

    const participation = participationStore.getByActionId(result.action.id)
    if (!participation || participation.status !== PARTICIPATION_STATUS.CONFIRMED) {
      phase.value = 'notConfirmed'
      return
    }

    const existingAttendance = attendanceStore.getByParticipationId(participation.id)
    if (existingAttendance) {
      phase.value = 'alreadyCheckedIn'
      return
    }

    phase.value = 'confirm'
  } catch (err) {
    phase.value = err.message === 'expiredToken' ? 'expired' : 'invalid'
  } finally {
    validating.value = false
  }
}

async function confirmCheckIn() {
  checkingIn.value = true
  try {
    await attendanceStore.checkInByQr(pendingToken.value)
    notificationsStore.notify(t('attendance.checkIn.checkInSuccess'), { type: 'success' })
    phase.value = 'success'
  } catch (err) {
    if (err.message === 'alreadyCheckedIn') {
      phase.value = 'alreadyCheckedIn'
    } else if (err.message === 'notConfirmed') {
      phase.value = 'notConfirmed'
    } else {
      genericErrorMessage.value = t(attendanceErrorKey(err.message))
      phase.value = 'genericError'
    }
  } finally {
    checkingIn.value = false
  }
}

function resetToInput() {
  phase.value = 'input'
  pendingToken.value = ''
  resolvedAction.value = null
  manualCode.value = ''
}

function handleManualSubmit() {
  if (!manualCode.value.trim()) return
  handleToken(manualCode.value.trim())
}

function onCameraOn() {
  cameraState.value = 'active'
}

function onCameraError(err) {
  const permissionDenied = ['NotAllowedError', 'NotReadableError', 'PermissionDeniedError', 'InsecureContextError'].includes(err?.name)
  cameraState.value = permissionDenied ? 'denied' : 'unavailable'
}

function onDetect(detectedCodes) {
  const rawValue = detectedCodes?.[0]?.rawValue
  if (rawValue) handleToken(rawValue)
}

onMounted(() => {
  const queryToken = route.query.token
  if (typeof queryToken === 'string' && queryToken && !isOrganizer.value) {
    handleToken(queryToken)
  }
})
</script>

<template>
  <DefaultLayout>
    <template v-if="isOrganizer">
      <VAlert type="info" variant="tonal" density="comfortable">
        <p class="font-weight-bold mb-1">{{ t('attendance.scan.organizerRestrictionTitle') }}</p>
        <p class="text-body-2 mb-0">{{ t('attendance.scan.organizerRestrictionMessage') }}</p>
      </VAlert>
    </template>

    <template v-else>
      <span class="oh-eyebrow mb-2 d-block">OneHelp</span>
      <h1 class="oh-page-title font-weight-bold text-textPrimary mb-1">{{ t('attendance.scan.pageTitle') }}</h1>
      <p class="text-body-2 text-textSecondary mb-6">{{ t('attendance.scan.subtitle') }}</p>

      <LoadingState v-if="validating" :label="t('attendance.scan.validating')" />

      <OHCard v-else-if="phase === 'input'" class="pa-5">
        <VTabs v-model="inputTab" class="mb-4">
          <VTab value="camera">{{ t('attendance.scan.cameraTab') }}</VTab>
          <VTab value="manual">{{ t('attendance.scan.manualTab') }}</VTab>
        </VTabs>

        <VWindow v-model="inputTab">
          <VWindowItem value="camera">
            <div v-if="cameraState === 'denied'" class="text-center pa-4">
              <VIcon icon="mdi-camera-off-outline" size="40" color="textSecondary" class="mb-2" aria-hidden="true" />
              <p class="font-weight-bold mb-1">{{ t('attendance.scan.cameraDeniedTitle') }}</p>
              <p class="text-body-2 text-textSecondary mb-0">{{ t('attendance.scan.cameraDeniedMessage') }}</p>
            </div>
            <div v-else-if="cameraState === 'unavailable'" class="text-center pa-4">
              <VIcon icon="mdi-camera-off-outline" size="40" color="textSecondary" class="mb-2" aria-hidden="true" />
              <p class="font-weight-bold mb-1">{{ t('attendance.scan.cameraUnavailableTitle') }}</p>
              <p class="text-body-2 text-textSecondary mb-0">{{ t('attendance.scan.cameraUnavailableMessage') }}</p>
            </div>
            <template v-else>
              <p v-if="cameraState === 'starting'" class="text-body-2 text-textSecondary text-center mb-2" role="status">
                {{ t('attendance.scan.cameraStarting') }}
              </p>
              <div class="oh-qr-scanner" role="group" :aria-label="t('attendance.scan.cameraTab')">
                <QrcodeStream :formats="['qr_code']" @detect="onDetect" @camera-on="onCameraOn" @error="onCameraError" />
              </div>
            </template>
          </VWindowItem>

          <VWindowItem value="manual">
            <form novalidate @submit.prevent="handleManualSubmit">
              <VTextField
                v-model="manualCode"
                :label="t('attendance.scan.manualLabel')"
                :placeholder="t('attendance.scan.manualPlaceholder')"
                :hint="t('attendance.scan.manualHint')"
                persistent-hint
                variant="outlined"
                class="mb-3"
              />
              <OHButton type="submit" color="primary" :disabled="!manualCode.trim()">
                {{ t('attendance.scan.manualSubmit') }}
              </OHButton>
            </form>
          </VWindowItem>
        </VWindow>
      </OHCard>

      <OHCard v-else-if="phase === 'confirm'" class="pa-5">
        <h2 class="text-subtitle-1 font-weight-bold mb-2">{{ t('attendance.scan.confirmTitle') }}</h2>
        <p class="text-body-1 mb-4">
          {{ t('attendance.scan.confirmMessage', { title: resolvedActionTitle, date: formattedActionDate }) }}
        </p>
        <div class="d-flex ga-2">
          <OHButton variant="text" :disabled="checkingIn" @click="resetToInput">
            {{ t('attendance.scan.cancelAction') }}
          </OHButton>
          <OHButton color="primary" :loading="checkingIn" :disabled="checkingIn" @click="confirmCheckIn">
            {{ t('attendance.scan.confirmAction') }}
          </OHButton>
        </div>
      </OHCard>

      <OHCard v-else-if="phase === 'success'" class="pa-5 text-center">
        <VIcon icon="mdi-check-circle" size="48" color="success" class="mb-3" aria-hidden="true" />
        <h2 class="text-subtitle-1 font-weight-bold mb-2">{{ t('attendance.scan.successTitle') }}</h2>
        <p class="text-body-2 text-textSecondary mb-4">
          {{ t('attendance.scan.successMessage', { title: resolvedActionTitle }) }}
        </p>
        <OHButton color="primary" :to="ROUTES.MY_ACTIONS">{{ t('attendance.scan.viewMyActions') }}</OHButton>
      </OHCard>

      <OHCard v-else-if="phase === 'invalid'" class="pa-5 text-center">
        <VIcon icon="mdi-qrcode-remove" size="48" color="error" class="mb-3" aria-hidden="true" />
        <p class="font-weight-bold mb-1">{{ t('attendance.scan.invalidTitle') }}</p>
        <p class="text-body-2 text-textSecondary mb-4">{{ t('attendance.scan.invalidMessage') }}</p>
        <OHButton variant="tonal" @click="resetToInput">{{ t('attendance.scan.cancelAction') }}</OHButton>
      </OHCard>

      <OHCard v-else-if="phase === 'expired'" class="pa-5 text-center">
        <VIcon icon="mdi-clock-alert-outline" size="48" color="warning" class="mb-3" aria-hidden="true" />
        <p class="font-weight-bold mb-1">{{ t('attendance.scan.expiredTitle') }}</p>
        <p class="text-body-2 text-textSecondary mb-4">{{ t('attendance.scan.expiredMessage') }}</p>
        <OHButton variant="tonal" @click="resetToInput">{{ t('attendance.scan.cancelAction') }}</OHButton>
      </OHCard>

      <OHCard v-else-if="phase === 'notConfirmed'" class="pa-5 text-center">
        <VIcon icon="mdi-account-alert-outline" size="48" color="warning" class="mb-3" aria-hidden="true" />
        <p class="font-weight-bold mb-1">{{ t('attendance.scan.notConfirmedTitle') }}</p>
        <p class="text-body-2 text-textSecondary mb-4">{{ t('attendance.scan.notConfirmedMessage') }}</p>
        <OHButton color="primary" :to="ROUTES.ACTIONS">{{ t('attendance.scan.cancelAction') }}</OHButton>
      </OHCard>

      <OHCard v-else-if="phase === 'alreadyCheckedIn'" class="pa-5 text-center">
        <VIcon icon="mdi-check-circle-outline" size="48" color="success" class="mb-3" aria-hidden="true" />
        <p class="font-weight-bold mb-1">{{ t('attendance.scan.alreadyCheckedInTitle') }}</p>
        <p class="text-body-2 text-textSecondary mb-4">{{ t('attendance.scan.alreadyCheckedInMessage') }}</p>
        <OHButton color="primary" :to="ROUTES.MY_ACTIONS">{{ t('attendance.scan.viewMyActions') }}</OHButton>
      </OHCard>

      <OHCard v-else-if="phase === 'genericError'" class="pa-5 text-center">
        <VIcon icon="mdi-alert-circle-outline" size="48" color="error" class="mb-3" aria-hidden="true" />
        <p class="text-body-2 text-textSecondary mb-4">{{ genericErrorMessage }}</p>
        <OHButton variant="tonal" @click="resetToInput">{{ t('attendance.scan.cancelAction') }}</OHButton>
      </OHCard>
    </template>
  </DefaultLayout>
</template>

<style scoped>
.oh-qr-scanner {
  max-width: 360px;
  margin: 0 auto;
  border-radius: var(--oh-radius-md);
  overflow: hidden;
}
</style>
