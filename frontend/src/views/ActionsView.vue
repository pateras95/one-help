<script setup>
import { useI18n } from 'vue-i18n'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import OHPageHeader from '@/components/common/OHPageHeader.vue'
import EmptyState from '@/components/feedback/EmptyState.vue'

const { t } = useI18n()
</script>

<template>
  <DefaultLayout>
    <OHPageHeader
      :title="t('navigation.actions')"
      :subtitle="t('pages.actions.subtitle')"
    />

    <EmptyState
      :title="t('pages.actions.emptyTitle')"
      :message="t('pages.actions.emptyMessage')"
      icon="mdi-hand-heart-outline"
    />
  </DefaultLayout>
</template>
