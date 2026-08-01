<script setup>
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import OHPageHeader from '@/components/common/OHPageHeader.vue'
import EmptyState from '@/components/feedback/EmptyState.vue'
</script>

<template>
  <DefaultLayout>
    <OHPageHeader
      title="Δράσεις"
      subtitle="Ανακαλύψτε ευκαιρίες εθελοντισμού κοντά σας."
    />

    <EmptyState
      title="Σύντομα διαθέσιμο"
      message="Η λίστα δράσεων θα προστεθεί σε επόμενη φάση."
      icon="mdi-hand-heart-outline"
    />
  </DefaultLayout>
</template>
