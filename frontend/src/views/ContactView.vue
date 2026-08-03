<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import OHSection from '@/components/common/OHSection.vue'
import OHCard from '@/components/common/OHCard.vue'
import OHButton from '@/components/common/OHButton.vue'
import { ROUTES } from '@/constants/routes'

const { t } = useI18n()

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_MESSAGE_LENGTH = 10

const contactMethods = [
  { key: 'email', icon: 'mdi-email-outline', color: 'primary' },
  { key: 'phone', icon: 'mdi-phone-outline', color: 'secondary' },
  { key: 'hours', icon: 'mdi-clock-outline', color: 'accent' },
  { key: 'address', icon: 'mdi-map-marker-outline', color: 'success' }
]

const subjectOptions = computed(() => [
  { value: 'general', title: t('pages.contact.form.subjects.general') },
  { value: 'volunteering', title: t('pages.contact.form.subjects.volunteering') },
  { value: 'organization', title: t('pages.contact.form.subjects.organization') },
  { value: 'technical', title: t('pages.contact.form.subjects.technical') }
])

const name = ref('')
const email = ref('')
const subject = ref('general')
const message = ref('')
const fieldErrors = ref({})
const submitting = ref(false)
const submitted = ref(false)

function validate() {
  const errors = {}

  if (!name.value.trim()) errors.name = t('pages.contact.form.validation.required')

  if (!email.value.trim()) {
    errors.email = t('pages.contact.form.validation.required')
  } else if (!EMAIL_PATTERN.test(email.value.trim())) {
    errors.email = t('pages.contact.form.validation.invalidEmail')
  }

  if (!message.value.trim()) {
    errors.message = t('pages.contact.form.validation.required')
  } else if (message.value.trim().length < MIN_MESSAGE_LENGTH) {
    errors.message = t('pages.contact.form.validation.textTooShort', { min: MIN_MESSAGE_LENGTH })
  }

  fieldErrors.value = errors
  return Object.keys(errors).length === 0
}

async function handleSubmit() {
  if (!validate()) return

  submitting.value = true
  // Mocked submission — no backend yet, this only simulates the round trip.
  await new Promise((resolve) => setTimeout(resolve, 500))
  submitting.value = false
  submitted.value = true
}

function resetForm() {
  name.value = ''
  email.value = ''
  subject.value = 'general'
  message.value = ''
  fieldErrors.value = {}
  submitted.value = false
}
</script>

<template>
  <DefaultLayout>
    <!-- Hero -->
    <section class="oh-hero oh-surface-wash text-center">
      <span class="oh-eyebrow mb-4 justify-center">{{ t('pages.contact.hero.eyebrow') }}</span>
      <h1 class="oh-display font-weight-bold text-textPrimary oh-measure mx-auto">
        {{ t('pages.contact.hero.headline') }}
      </h1>
      <p class="text-body-1 text-textSecondary mt-5 oh-measure mx-auto">
        {{ t('pages.contact.hero.lead') }}
      </p>
    </section>

    <!-- Contact methods -->
    <OHSection
      variant="tinted"
      center
      :eyebrow="t('pages.contact.methods.eyebrow')"
      :title="t('pages.contact.methods.title')"
      :subtitle="t('pages.contact.methods.subtitle')"
    >
      <div class="oh-contact-methods" role="list">
        <OHCard
          v-for="method in contactMethods"
          :key="method.key"
          class="pa-5 oh-card-interactive oh-contact-methods__card"
          role="listitem"
        >
          <div class="oh-icon-well" :class="`bg-${method.color}`">
            <VIcon :icon="method.icon" size="24" color="white" aria-hidden="true" />
          </div>
          <h3 class="text-subtitle-1 font-weight-bold mt-4 mb-1">
            {{ t(`pages.contact.methods.${method.key}.label`) }}
          </h3>
          <p class="text-body-1 font-weight-bold mb-1">
            {{ t(`pages.contact.methods.${method.key}.value`) }}
          </p>
          <p class="text-body-2 text-textSecondary mb-0">
            {{ t(`pages.contact.methods.${method.key}.description`) }}
          </p>
        </OHCard>
      </div>
    </OHSection>

    <!-- Contact form -->
    <OHSection
      center
      :eyebrow="t('pages.contact.form.eyebrow')"
      :title="t('pages.contact.form.title')"
      :subtitle="t('pages.contact.form.subtitle')"
    >
      <OHCard class="pa-6 pa-sm-8 oh-contact-form mx-auto">
        <Transition name="oh-fade" mode="out-in">
          <div v-if="submitted" key="success" class="oh-contact-success text-center py-6">
            <div class="oh-icon-well oh-icon-well--xl bg-success mx-auto">
              <VIcon icon="mdi-check-bold" size="36" color="white" aria-hidden="true" />
            </div>
            <h3 class="oh-section-title font-weight-bold mt-5 mb-2">
              {{ t('pages.contact.form.success.title') }}
            </h3>
            <p class="text-body-1 text-textSecondary oh-measure mx-auto mb-6">
              {{ t('pages.contact.form.success.message') }}
            </p>
            <OHButton variant="outlined" color="primary" @click="resetForm">
              {{ t('pages.contact.form.success.action') }}
            </OHButton>
          </div>

          <form v-else key="form" novalidate class="text-left" @submit.prevent="handleSubmit">
            <VTextField
              v-model="name"
              :label="t('pages.contact.form.nameLabel')"
              autocomplete="name"
              variant="outlined"
              class="mb-2"
              :error-messages="fieldErrors.name"
            />

            <VTextField
              v-model="email"
              :label="t('pages.contact.form.emailLabel')"
              type="email"
              autocomplete="email"
              variant="outlined"
              class="mb-2"
              :error-messages="fieldErrors.email"
            />

            <VSelect
              v-model="subject"
              :label="t('pages.contact.form.subjectLabel')"
              :items="subjectOptions"
              item-title="title"
              item-value="value"
              variant="outlined"
              class="mb-2"
            />

            <VTextarea
              v-model="message"
              :label="t('pages.contact.form.messageLabel')"
              :hint="t('pages.contact.form.messageHint')"
              persistent-hint
              rows="4"
              variant="outlined"
              class="mb-2"
              :error-messages="fieldErrors.message"
            />

            <OHButton
              type="submit"
              color="primary"
              size="large"
              block
              class="mt-4"
              :loading="submitting"
              :disabled="submitting"
            >
              {{ submitting ? t('pages.contact.form.submitting') : t('pages.contact.form.submit') }}
            </OHButton>
          </form>
        </Transition>
      </OHCard>
    </OHSection>

    <!-- FAQ shortcut -->
    <section class="oh-container">
      <div class="oh-faq-shortcut">
        <div class="oh-icon-well oh-icon-well--lg bg-white">
          <VIcon icon="mdi-help-circle-outline" size="30" color="primary" aria-hidden="true" />
        </div>
        <div class="oh-faq-shortcut__text">
          <h2 class="text-h6 font-weight-bold mb-1">{{ t('pages.contact.faqShortcut.title') }}</h2>
          <p class="text-body-2 oh-faq-shortcut__message mb-0">{{ t('pages.contact.faqShortcut.message') }}</p>
        </div>
        <OHButton
          variant="outlined"
          class="oh-faq-shortcut__action"
          :to="ROUTES.ABOUT"
        >
          {{ t('pages.contact.faqShortcut.action') }}
        </OHButton>
      </div>
    </section>
  </DefaultLayout>
</template>

<style scoped>
.oh-hero {
  padding-block: var(--oh-space-xl) var(--oh-space-2xl);
}

@media (min-width: 960px) {
  .oh-hero {
    padding-block: var(--oh-space-3xl) var(--oh-space-2xl);
  }
}

/* ---------- Contact methods ---------- */

.oh-contact-methods {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--oh-space-md);
  text-align: left;
}

@media (min-width: 600px) {
  .oh-contact-methods { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 960px) {
  .oh-contact-methods { grid-template-columns: repeat(4, 1fr); }
}

.oh-contact-methods__card {
  height: 100%;
}

/* ---------- Contact form ---------- */

.oh-contact-form {
  max-width: 640px;
}

.oh-fade-enter-active,
.oh-fade-leave-active {
  transition: opacity var(--oh-transition-base);
}
.oh-fade-enter-from,
.oh-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .oh-fade-enter-active,
  .oh-fade-leave-active {
    transition: none;
  }
}

/* ---------- FAQ shortcut ---------- */

.oh-faq-shortcut {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--oh-space-md);
  border-radius: var(--oh-radius-lg);
  border: 1px solid rgb(var(--v-theme-border));
  background: rgb(var(--v-theme-surfaceVariant));
  padding: var(--oh-space-lg);
  margin-block: var(--oh-space-lg);
}

.oh-faq-shortcut__message {
  max-width: 46ch;
}

@media (min-width: 768px) {
  .oh-faq-shortcut {
    flex-direction: row;
    text-align: left;
    padding: var(--oh-space-lg) var(--oh-space-xl);
  }
  .oh-faq-shortcut__text { flex: 1 1 auto; }
  .oh-faq-shortcut__action { flex-shrink: 0; }
}
</style>
