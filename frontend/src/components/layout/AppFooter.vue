<script setup>
import { useI18n } from 'vue-i18n'
import { SOCIAL_LINKS } from '@/constants/socialLinks'
import { ROUTES } from '@/constants/routes'
import { branding } from '@/config/branding'
import OHLogo from '@/components/common/OHLogo.vue'

const { t } = useI18n()
const year = new Date().getFullYear()
</script>

<template>
  <VFooter class="oh-footer flex-column" color="surfaceVariant">
    <VContainer class="py-8">
      <VRow>
        <VCol cols="12" sm="6" md="3">
          <OHLogo text-class="text-subtitle-1" />
          <p class="text-body-2 text-textSecondary mt-2">
            {{ t('footer.tagline') }}
          </p>
        </VCol>

        <VCol cols="12" sm="6" md="3">
          <h3 class="text-subtitle-2 font-weight-bold mb-2">{{ t('footer.contactTitle') }}</h3>
          <p class="text-body-2 text-textSecondary">info@onehelp.gr</p>
        </VCol>

        <VCol cols="12" sm="6" md="3">
          <h3 class="text-subtitle-2 font-weight-bold mb-2">{{ t('footer.socialTitle') }}</h3>
          <div class="d-flex ga-1">
            <VBtn
              v-for="link in SOCIAL_LINKS"
              :key="link.name"
              :icon="link.icon"
              :href="link.href ?? undefined"
              :disabled="!link.href"
              :aria-label="link.name"
              variant="text"
              size="small"
              target="_blank"
              rel="noopener"
            />
          </div>
        </VCol>

        <VCol cols="12" sm="6" md="3">
          <h3 class="text-subtitle-2 font-weight-bold mb-2">{{ t('footer.aboutTitle') }}</h3>
          <RouterLink :to="ROUTES.ABOUT" class="text-body-2 text-textSecondary">
            {{ t('footer.aboutLink', { appName: branding.appName }) }}
          </RouterLink>
        </VCol>
      </VRow>

      <VDivider class="my-4" />

      <p class="text-caption text-textSecondary text-center mb-0">
        {{ t('footer.copyright', { year, appName: branding.appName }) }}
      </p>
    </VContainer>
  </VFooter>
</template>
