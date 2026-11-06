<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-semibold">
        Dashboard
      </h1>
      <UButton
        :loading="running"
        @click="runRecon"
      >
        Run reconciliation
      </UButton>
    </div>
    <div
      v-if="loading"
      class="text-muted"
    >
      Loading...
    </div>
    <div
      v-else
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      <UCard
        v-for="m in metrics"
        :key="m.label"
      >
        <p class="text-sm text-muted">
          {{ m.label }}
        </p>
        <p class="text-2xl font-semibold">
          {{ m.value }}
        </p>
      </UCard>
    </div>
    <p
      v-if="error"
      class="text-red-500 mt-4"
    >
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const loading = ref(true)
const running = ref(false)
const error = ref('')
const summary = ref<any>(null)
const metrics = computed(() => {
  const s = summary.value
  if (!s) return []
  return [
    { label: 'Total order value', value: s.totalOrderValueMinor },
    { label: 'Total allocated', value: s.totalAllocatedMinor },
    { label: 'Outstanding balance', value: s.outstandingBalanceMinor },
    { label: 'Fully paid orders', value: s.orders?.fullyPaid ?? 0 },
    { label: 'Partially paid orders', value: s.orders?.partiallyPaid ?? 0 },
    { label: 'Unmatched payments', value: s.payments?.unmatched ?? 0 },
    { label: 'Review required', value: s.reviewRequiredRecords ?? 0 },
    { label: 'Suspected duplicates', value: s.suspectedDuplicates ?? 0 }
  ]
})
async function load() {
  loading.value = true; error.value = ''
  try { const res: any = await api.summary(); summary.value = res?.data ?? res } catch (e: any) { error.value = e?.data?.message || 'Failed to load' } finally { loading.value = false }
}
async function runRecon() {
  running.value = true
  try { await api.runReconciliation(); await load() } catch (e: any) { error.value = e?.data?.message || 'Failed' } finally { running.value = false }
}
onMounted(load)
</script>
