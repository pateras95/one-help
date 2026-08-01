<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLocaleStore } from '@/stores/locale.store'
import { LOCALE_OPTIONS } from '@/constants/locales'

const { t } = useI18n()
const localeStore = useLocaleStore()

const currentOption = computed(
  () => LOCALE_OPTIONS.find((option) => option.code === localeStore.locale) ?? LOCALE_OPTIONS[0]
)
</script>

<template>
  <VMenu>
    <template #activator="{ props: menuProps }">
      <VBtn
        v-bind="menuProps"
        variant="text"
        size="small"
        :aria-label="`${t('common.languageSwitcher.label')}: ${currentOption.nativeName}`"
      >
        {{ currentOption.shortLabel }}
      </VBtn>
    </template>

    <VList density="compact" :aria-label="t('common.languageSwitcher.label')">
      <VListItem
        v-for="option in LOCALE_OPTIONS"
        :key="option.code"
        :active="option.code === localeStore.locale"
        @click="localeStore.setLocale(option.code)"
      >
        <VListItemTitle>{{ option.nativeName }}</VListItemTitle>
      </VListItem>
    </VList>
  </VMenu>
</template>
