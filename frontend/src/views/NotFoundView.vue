<script setup>
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import EmptyState from '@/components/feedback/EmptyState.vue'
</script>

<template>
  <DefaultLayout>
    <EmptyState
      title="Η σελίδα δεν βρέθηκε"
      message="Ελέγξτε τη διεύθυνση ή επιστρέψτε στην αρχική σελίδα."
      icon="mdi-map-marker-question-outline"
    >
      <VBtn class="mt-4" color="primary" to="/">
        Επιστροφή στην αρχική
      </VBtn>
    </EmptyState>
  </DefaultLayout>
</template>
