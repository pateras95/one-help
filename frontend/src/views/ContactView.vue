<script setup>
import { useI18n } from 'vue-i18n'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import OHPageHeader from '@/components/common/OHPageHeader.vue'
import OHSection from '@/components/common/OHSection.vue'

const { t } = useI18n()
</script>

<template>
  <DefaultLayout>
    <OHPageHeader
      :title="t('navigation.contact')"
      :subtitle="t('pages.contact.subtitle')"
    />

    <OHSection>
      <p class="text-body-1 text-textSecondary">
        {{ t('pages.contact.body') }}
      </p>
    </OHSection>
  </DefaultLayout>
</template>
