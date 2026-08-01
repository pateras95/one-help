<script setup>
import { ref } from 'vue'
import { useDisplay } from 'vuetify'
import { NAVIGATION_ITEMS } from '@/constants/navigation'
import OHLogo from '@/components/common/OHLogo.vue'

const { mobile } = useDisplay()
const isDrawerOpen = ref(false)
</script>

<template>
  <VAppBar color="primary" density="comfortable">
    <VAppBarNavIcon
      v-if="mobile"
      aria-label="Άνοιγμα μενού πλοήγησης"
      :aria-expanded="isDrawerOpen"
      @click="isDrawerOpen = !isDrawerOpen"
    />

    <VAppBarTitle>
      <OHLogo />
    </VAppBarTitle>

    <template v-if="!mobile" #append>
      <nav aria-label="Κύρια πλοήγηση" class="d-flex">
        <VBtn
          v-for="item in NAVIGATION_ITEMS"
          :key="item.to"
          :to="item.to"
          variant="text"
        >
          {{ item.title }}
        </VBtn>
      </nav>
    </template>
  </VAppBar>

  <VNavigationDrawer v-if="mobile" v-model="isDrawerOpen" temporary>
    <VList nav aria-label="Κύρια πλοήγηση">
      <VListItem
        v-for="item in NAVIGATION_ITEMS"
        :key="item.to"
        :to="item.to"
        :title="item.title"
        @click="isDrawerOpen = false"
      />
    </VList>
  </VNavigationDrawer>
</template>
