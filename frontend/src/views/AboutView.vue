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
      :title="t('navigation.about')"
      :subtitle="t('pages.about.subtitle')"
    />

    <OHSection>
      <p class="text-body-1 text-textSecondary">
        {{ t('pages.about.body') }}
      </p>
    </OHSection>
  </DefaultLayout>
</template>
