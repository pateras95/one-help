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
        variant="tonal"
        color="primary"
        size="small"
        class="oh-language-switcher__trigger"
        :aria-label="t('common.languageSwitcher.current', { language: t(currentOption.nameKey) })"
      >
        <img :src="currentOption.flag" alt="" class="oh-language-switcher__flag" />
        <span class="oh-language-switcher__code">{{ currentOption.shortLabel }}</span>
        <VIcon icon="mdi-chevron-down" size="16" aria-hidden="true" />
      </VBtn>
    </template>

    <VList density="compact" :aria-label="t('common.languageSwitcher.label')">
      <VListItem
        v-for="option in LOCALE_OPTIONS"
        :key="option.code"
        :active="option.code === localeStore.locale"
        @click="localeStore.setLocale(option.code)"
      >
        <template #prepend>
          <img :src="option.flag" alt="" class="oh-language-switcher__flag" />
        </template>

        <VListItemTitle class="ml-3">{{ t(option.nameKey) }}</VListItemTitle>

        <template #append>
          <VIcon
            v-if="option.code === localeStore.locale"
            icon="mdi-check"
            size="18"
            color="primary"
            :aria-label="t('common.languageSwitcher.selected')"
          />
        </template>
      </VListItem>
    </VList>
  </VMenu>
</template>

<style scoped>
.oh-language-switcher__trigger :deep(.v-btn__content) {
  gap: 6px;
}

.oh-language-switcher__flag {
  width: 20px;
  height: 14px;
  border-radius: 2px;
  object-fit: cover;
  display: block;
  flex-shrink: 0;
}

.oh-language-switcher__code {
  font-weight: 600;
  letter-spacing: 0.02em;
}
</style>
