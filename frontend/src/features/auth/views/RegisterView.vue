<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import AuthLayout from '@/layouts/AuthLayout.vue'
import OHLogo from '@/components/common/OHLogo.vue'
import OHButton from '@/components/common/OHButton.vue'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { useNotificationsStore } from '@/stores/notifications.store'
import { isSafeInternalRedirect } from '@/features/auth/utils/safeRedirect'
import { ROUTES } from '@/constants/routes'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const notificationsStore = useNotificationsStore()

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8
const KNOWN_ERROR_CODES = ['duplicateEmail']

const firstName = ref('')
const lastName = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const acceptTerms = ref(false)
const showPassword = ref(false)
const formError = ref('')
const fieldErrors = ref({})

function validate() {
  const errors = {}

  if (!firstName.value.trim()) errors.firstName = t('auth.validation.required')
  if (!lastName.value.trim()) errors.lastName = t('auth.validation.required')

  if (!email.value.trim()) {
    errors.email = t('auth.validation.required')
  } else if (!EMAIL_PATTERN.test(email.value.trim())) {
    errors.email = t('auth.validation.invalidEmail')
  }

  if (!password.value) {
    errors.password = t('auth.validation.required')
  } else if (password.value.length < MIN_PASSWORD_LENGTH) {
    errors.password = t('auth.validation.passwordTooShort', { min: MIN_PASSWORD_LENGTH })
  }

  if (!confirmPassword.value) {
    errors.confirmPassword = t('auth.validation.required')
  } else if (confirmPassword.value !== password.value) {
    errors.confirmPassword = t('auth.validation.passwordMismatch')
  }

  if (!acceptTerms.value) errors.acceptTerms = t('auth.validation.termsRequired')

  fieldErrors.value = errors
  return Object.keys(errors).length === 0
}

async function handleSubmit() {
  formError.value = ''
  if (!validate()) return

  try {
    await authStore.register({
      firstName: firstName.value,
      lastName: lastName.value,
      email: email.value.trim(),
      password: password.value
    })
    notificationsStore.notify(t('auth.notifications.registerSuccess'), { type: 'success' })

    const queryRedirect = route.query.redirect
    const target = typeof queryRedirect === 'string' && isSafeInternalRedirect(queryRedirect)
      ? queryRedirect
      : ROUTES.MY_ACTIONS
    router.push(target)
  } catch (err) {
    const code = KNOWN_ERROR_CODES.includes(err.message) ? err.message : 'generic'
    formError.value = t(`auth.errors.${code}`)
  }
}
</script>

<template>
  <AuthLayout>
    <div class="text-center mb-6">
      <OHLogo class="justify-center mb-4" />
      <h1 class="oh-page-title font-weight-bold text-textPrimary">{{ t('navigation.register') }}</h1>
      <p class="text-body-2 text-textSecondary mt-1">{{ t('auth.register.subtitle') }}</p>
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
      <div class="d-flex flex-column flex-sm-row ga-3">
        <VTextField
          v-model="firstName"
          :label="t('auth.register.firstNameLabel')"
          autocomplete="given-name"
          variant="outlined"
          class="mb-2"
          :error-messages="fieldErrors.firstName"
        />
        <VTextField
          v-model="lastName"
          :label="t('auth.register.lastNameLabel')"
          autocomplete="family-name"
          variant="outlined"
          class="mb-2"
          :error-messages="fieldErrors.lastName"
        />
      </div>

      <VTextField
        v-model="email"
        :label="t('auth.register.emailLabel')"
        type="email"
        autocomplete="email"
        variant="outlined"
        class="mb-2"
        :error-messages="fieldErrors.email"
      />

      <VTextField
        v-model="password"
        :label="t('auth.register.passwordLabel')"
        :type="showPassword ? 'text' : 'password'"
        autocomplete="new-password"
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

      <VTextField
        v-model="confirmPassword"
        :label="t('auth.register.confirmPasswordLabel')"
        :type="showPassword ? 'text' : 'password'"
        autocomplete="new-password"
        variant="outlined"
        class="mb-2"
        :error-messages="fieldErrors.confirmPassword"
      />

      <VCheckbox
        v-model="acceptTerms"
        :label="t('auth.register.termsLabel')"
        :error-messages="fieldErrors.acceptTerms"
        density="comfortable"
        class="mb-2"
      />

      <OHButton
        type="submit"
        color="primary"
        size="large"
        block
        class="mt-2"
        :loading="authStore.loading"
        :disabled="authStore.loading"
      >
        {{ authStore.loading ? t('auth.register.submitting') : t('auth.register.submit') }}
      </OHButton>
    </form>

    <p class="text-body-2 text-center mt-4 mb-0">
      {{ t('auth.register.haveAccount') }}
      <RouterLink :to="ROUTES.LOGIN" class="font-weight-bold">{{ t('auth.register.loginLink') }}</RouterLink>
    </p>
  </AuthLayout>
</template>
