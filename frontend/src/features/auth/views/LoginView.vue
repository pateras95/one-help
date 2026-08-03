<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import AuthLayout from '@/layouts/AuthLayout.vue'
import OHCard from '@/components/common/OHCard.vue'
import OHButton from '@/components/common/OHButton.vue'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { useNotificationsStore } from '@/stores/notifications.store'
import { isSafeInternalRedirect } from '@/features/auth/utils/safeRedirect'
import { ROLES } from '@/constants/roles'
import { ROUTES } from '@/constants/routes'
import { DEMO_CREDENTIALS } from '@/features/auth/mocks/users.mock'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const notificationsStore = useNotificationsStore()

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const KNOWN_ERROR_CODES = ['unknownEmail', 'invalidPassword', 'accountSuspended']

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const formError = ref('')
const fieldErrors = ref({ email: '', password: '' })

function validate() {
  fieldErrors.value = { email: '', password: '' }

  if (!email.value.trim()) {
    fieldErrors.value.email = t('auth.validation.required')
  } else if (!EMAIL_PATTERN.test(email.value.trim())) {
    fieldErrors.value.email = t('auth.validation.invalidEmail')
  }

  if (!password.value) {
    fieldErrors.value.password = t('auth.validation.required')
  }

  return !fieldErrors.value.email && !fieldErrors.value.password
}

function defaultLandingFor(role) {
  if (role === ROLES.ORGANIZER) return ROUTES.ORGANIZER
  if (role === ROLES.ADMINISTRATOR) return ROUTES.ADMIN
  return ROUTES.MY_ACTIONS
}

function fillDemoCredentials(credentials) {
  email.value = credentials.email
  password.value = credentials.password
}

async function handleSubmit() {
  formError.value = ''
  if (!validate()) return

  try {
    const user = await authStore.login(email.value.trim(), password.value)
    notificationsStore.notify(t('auth.notifications.loginSuccess'), { type: 'success' })

    const queryRedirect = route.query.redirect
    const target = typeof queryRedirect === 'string' && isSafeInternalRedirect(queryRedirect)
      ? queryRedirect
      : defaultLandingFor(user.role)
    router.push(target)
  } catch (err) {
    const code = KNOWN_ERROR_CODES.includes(err.message) ? err.message : 'generic'
    formError.value = t(`auth.errors.${code}`)
  }
}
</script>

<template>
  <AuthLayout :panel-title="t('auth.brandPanel.loginTitle')" :panel-message="t('auth.brandPanel.loginMessage')">
    <OHCard class="pa-6 pa-sm-8">
      <div class="mb-6">
        <h1 class="oh-page-title font-weight-bold text-textPrimary">{{ t('navigation.login') }}</h1>
        <p class="text-body-2 text-textSecondary mt-1">{{ t('auth.login.subtitle') }}</p>
      </div>

      <VAlert
        v-if="formError"
        type="error"
        variant="tonal"
        density="comfortable"
        class="mb-4"
        role="alert"
      >
        {{ formError }}
      </VAlert>

      <form novalidate @submit.prevent="handleSubmit">
        <VTextField
          v-model="email"
          :label="t('auth.login.emailLabel')"
          type="email"
          autocomplete="email"
          variant="outlined"
          class="mb-2"
          :error-messages="fieldErrors.email"
        />

        <VTextField
          v-model="password"
          :label="t('auth.login.passwordLabel')"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="current-password"
          variant="outlined"
          class="mb-2"
          :error-messages="fieldErrors.password"
        >
          <template #append-inner>
            <VBtn
              icon
              variant="text"
              size="small"
              :aria-label="showPassword ? t('auth.login.hidePassword') : t('auth.login.showPassword')"
              @click="showPassword = !showPassword"
            >
              <VIcon :icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'" />
            </VBtn>
          </template>
        </VTextField>

        <p class="text-caption text-textSecondary mb-4">{{ t('auth.login.sessionNote') }}</p>

        <OHButton
          type="submit"
          color="primary"
          size="large"
          block
          :loading="authStore.loading"
          :disabled="authStore.loading"
        >
          {{ authStore.loading ? t('auth.login.submitting') : t('auth.login.submit') }}
        </OHButton>
      </form>

      <p class="text-body-2 text-center mt-4 mb-0">
        {{ t('auth.login.noAccount') }}
        <RouterLink :to="ROUTES.REGISTER" class="font-weight-bold">{{ t('auth.login.registerLink') }}</RouterLink>
      </p>

      <p class="text-body-2 text-center mt-2 mb-0">
        <RouterLink :to="ROUTES.ACTIONS">{{ t('auth.login.backToActions') }}</RouterLink>
      </p>

      <VExpansionPanels class="mt-5" variant="accordion">
        <VExpansionPanel class="oh-demo-panel">
          <VExpansionPanelTitle class="text-caption text-textSecondary">
            {{ t('auth.login.demoTitle') }}
          </VExpansionPanelTitle>
          <VExpansionPanelText>
            <div class="oh-demo-credentials">
              <VBtn
                v-for="credentials in DEMO_CREDENTIALS"
                :key="credentials.email"
                variant="outlined"
                size="small"
                block
                class="mb-2 text-none"
                @click="fillDemoCredentials(credentials)"
              >
                {{ t(`auth.login.demo${credentials.role === 'organizer' ? 'Organizer' : 'Volunteer'}`, credentials) }}
              </VBtn>
            </div>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </OHCard>
  </AuthLayout>
</template>

<style scoped>
.oh-demo-panel {
  background: transparent;
}

.oh-demo-credentials :deep(.v-btn__content) {
  white-space: normal;
  text-align: center;
}
</style>
