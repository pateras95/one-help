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
  <VFooter class="oh-footer flex-column" color="primary">
    <span class="oh-footer__glow" aria-hidden="true" />
    <div class="oh-container oh-footer__inner py-10">
      <VRow>
        <VCol cols="12" md="4" class="oh-footer__brand-col">
          <OHLogo variant="monochrome" :size="30" class="oh-footer__logo" />
          <p class="text-body-2 oh-footer__tagline mt-3">
            {{ t('footer.tagline') }}
          </p>
        </VCol>

        <VCol cols="6" sm="4" md="2" offset-md="1">
          <h3 class="oh-footer__heading mb-3">{{ t('footer.contactTitle') }}</h3>
          <p class="text-body-2 oh-footer__muted">info@onehelp.gr</p>
        </VCol>

        <VCol cols="6" sm="4" md="2">
          <h3 class="oh-footer__heading mb-3">{{ t('footer.socialTitle') }}</h3>
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
              class="oh-footer__social-btn"
              target="_blank"
              rel="noopener"
            />
          </div>
        </VCol>

        <VCol cols="12" sm="4" md="3">
          <h3 class="oh-footer__heading mb-3">{{ t('footer.aboutTitle') }}</h3>
          <RouterLink :to="ROUTES.ABOUT" class="text-body-2 oh-footer__link">
            {{ t('footer.aboutLink', { appName: branding.appName }) }}
          </RouterLink>
        </VCol>
      </VRow>

      <div class="oh-footer__rule" />

      <p class="text-caption oh-footer__muted text-center mb-0">
        {{ t('footer.copyright', { year, appName: branding.appName }) }}
      </p>
    </div>
  </VFooter>
</template>

<style scoped>
/*
 * Vuetify's VFooter has its own built-in horizontal padding (16px) —
 * neutralized here so `.oh-container`'s own gutter is the only one that
 * applies, keeping footer content aligned to the same column as the
 * header and page content (same pattern as AppNavigation's app bar).
 *
 * A deliberately dark (primary navy) closing surface — not another
 * white column list — with a soft coral glow in one corner, echoing
 * the auth panel's treatment so the app's "dark brand surface" reads
 * as one consistent device rather than a one-off.
 */
.oh-footer {
  padding-inline: 0;
  position: relative;
  overflow: hidden;
  isolation: isolate;
}

.oh-footer__glow {
  position: absolute;
  top: -30%;
  right: -8%;
  width: 40%;
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(var(--v-theme-secondary), 0.22), transparent 70%);
  pointer-events: none;
  z-index: 0;
}

.oh-footer__inner {
  position: relative;
  z-index: 1;
}

.oh-footer__brand-col {
  max-width: 320px;
}

.oh-footer__tagline {
  color: rgba(255, 255, 255, 0.72);
  max-width: 32ch;
}

.oh-footer__heading {
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
}

.oh-footer__muted {
  color: rgba(255, 255, 255, 0.72);
}

.oh-footer__link {
  color: rgba(255, 255, 255, 0.85);
  text-decoration: none;
}
.oh-footer__link:hover {
  color: #fff;
  text-decoration: underline;
}

.oh-footer__social-btn {
  color: rgba(255, 255, 255, 0.8) !important;
}

.oh-footer__rule {
  height: 1px;
  background: rgba(255, 255, 255, 0.14);
  margin-block: var(--oh-space-lg);
}
</style>
