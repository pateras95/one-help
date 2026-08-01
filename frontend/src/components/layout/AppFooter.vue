<script setup>
import { SOCIAL_LINKS } from '@/constants/socialLinks'
import { ROUTES } from '@/constants/routes'
import { branding } from '@/config/branding'
import OHLogo from '@/components/common/OHLogo.vue'

const year = new Date().getFullYear()
</script>

<template>
  <VFooter class="oh-footer flex-column" color="background">
    <VContainer>
      <VRow>
        <VCol cols="12" sm="6" md="3">
          <OHLogo text-class="text-subtitle-1" />
          <p class="text-body-2 mt-2">
            Σύνδεση εθελοντών με επαληθευμένες δράσεις.
          </p>
        </VCol>

        <VCol cols="12" sm="6" md="3">
          <h3 class="text-subtitle-2 font-weight-bold mb-2">Επικοινωνία</h3>
          <p class="text-body-2">info@onehelp.gr</p>
        </VCol>

        <VCol cols="12" sm="6" md="3">
          <h3 class="text-subtitle-2 font-weight-bold mb-2">Κοινωνικά δίκτυα</h3>
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
          <h3 class="text-subtitle-2 font-weight-bold mb-2">Σχετικά</h3>
          <RouterLink :to="ROUTES.ABOUT" class="text-body-2">
            Σχετικά με το {{ branding.appName }}
          </RouterLink>
        </VCol>
      </VRow>

      <VDivider class="my-4" />

      <p class="text-caption text-center mb-0">
        © {{ year }} {{ branding.appName }}. Με επιφύλαξη παντός δικαιώματος.
      </p>
    </VContainer>
  </VFooter>
</template>
