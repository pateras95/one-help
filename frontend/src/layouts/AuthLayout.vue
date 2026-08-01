<template>
  <VApp>
    <VMain class="d-flex align-center justify-center">
      <VContainer class="d-flex justify-center">
        <VCard
          class="pa-4"
          max-width="440"
          width="100%"
          elevation="2"
        >
          <slot />
        </VCard>
      </VContainer>
    </VMain>
  </VApp>
</template>
