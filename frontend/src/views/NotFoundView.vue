<script setup>
import { useI18n } from 'vue-i18n'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import EmptyState from '@/components/feedback/EmptyState.vue'
import { ROUTES } from '@/constants/routes'

const { t } = useI18n()
</script>

<template>
  <DefaultLayout>
    <EmptyState
      :title="t('errors.notFound.title')"
      :message="t('errors.notFound.message')"
      icon="mdi-map-marker-question-outline"
    >
      <VBtn class="mt-4" color="primary" :to="ROUTES.HOME">
        {{ t('errors.notFound.backHome') }}
      </VBtn>
    </EmptyState>
  </DefaultLayout>
</template>
