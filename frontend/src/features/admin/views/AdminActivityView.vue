<script setup>
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import OHPageHeader from '@/components/common/OHPageHeader.vue'
import OHCard from '@/components/common/OHCard.vue'
import LoadingState from '@/components/feedback/LoadingState.vue'
import ErrorState from '@/components/feedback/ErrorState.vue'
import EmptyState from '@/components/feedback/EmptyState.vue'
import AdminNavTabs from '../components/AdminNavTabs.vue'
import { getActivityLog } from '../services/activityLog.service'
import { activityMetadataForTranslation } from '../utils/activityDescribe'

const { t, locale } = useI18n()

const entries = ref([])
const loading = ref(false)
const error = ref(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    entries.value = await getActivityLog()
  } catch (err) {
    error.value = err.message
    entries.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)

function activityText(entry) {
  return t(`admin.activity.entries.${entry.actionType}`, activityMetadataForTranslation(entry, t))
}

function formatTimestamp(isoString) {
  const formatter = new Intl.DateTimeFormat(locale.value === 'en' ? 'en-GB' : 'el-GR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  return formatter.format(new Date(isoString))
}
</script>

<template>
  <DefaultLayout>
    <OHPageHeader eyebrow="OneHelp" :title="t('admin.activity.pageTitle')" :subtitle="t('admin.activity.subtitle')" />
    <AdminNavTabs />

    <LoadingState v-if="loading" :label="t('admin.common.loading')" />

    <ErrorState
      v-else-if="error"
      :title="t('admin.common.errorTitle')"
      :message="t('admin.common.errorMessage')"
      @retry="load"
    />

    <EmptyState
      v-else-if="entries.length === 0"
      :title="t('admin.activity.emptyTitle')"
      :message="t('admin.activity.emptyMessage')"
      icon="mdi-history"
    />

    <OHCard v-else class="pa-0">
      <VList :aria-label="t('admin.activity.pageTitle')" density="comfortable">
        <template v-for="(entry, index) in entries" :key="entry.id">
          <VDivider v-if="index > 0" />
          <VListItem class="py-2">
            <template #prepend>
              <div class="oh-icon-well oh-activity__well bg-surfaceOperational mr-1">
                <VIcon icon="mdi-history" size="18" color="textSecondary" aria-hidden="true" />
              </div>
            </template>
            <VListItemTitle class="text-body-2">{{ activityText(entry) }}</VListItemTitle>
            <VListItemSubtitle class="text-caption">{{ formatTimestamp(entry.timestamp) }}</VListItemSubtitle>
          </VListItem>
        </template>
      </VList>
    </OHCard>
  </DefaultLayout>
</template>

<style scoped>
.oh-activity__well {
  width: 36px;
  height: 36px;
}
</style>
