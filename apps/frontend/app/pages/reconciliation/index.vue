<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-semibold">
        Reconciliation
      </h1>
      <UButton
        :loading="running"
        @click="run"
      >
        Run reconciliation
      </UButton>
    </div>
    <UCard
      v-if="summary"
      class="mb-4"
    >
      <p>Allocated: {{ summary.totalAllocatedMinor }} / Outstanding: {{ summary.outstandingBalanceMinor }}</p>
      <p>Review required: {{ summary.reviewRequiredRecords }} Suspected duplicates: {{ summary.suspectedDuplicates }}</p>
    </UCard>
    <h2 class="text-lg font-semibold mt-4">
      Suggested matches
    </h2>
    <UTable
      :rows="suggestions"
      :columns="[{ accessorKey: 'id', header: 'ID' }, { accessorKey: 'amountMinor', header: 'Amount' }, { accessorKey: 'reason', header: 'Reason' }]"
    />
    <div
      v-for="m in suggestions"
      :key="m.id"
      class="flex gap-2 mt-2"
    >
      <UButton
        size="xs"
        @click="approve(m.id)"
      >
        Approve
      </UButton>
      <UButton
        size="xs"
        color="error"
        @click="reject(m.id)"
      >
        Reject
      </UButton>
    </div>
    <h2 class="text-lg font-semibold mt-6">
      Exceptions
    </h2>
    <pre class="text-xs">{{ JSON.stringify(exceptions, null, 2) }}</pre>
    <p
      v-if="error"
      class="text-red-500 mt-2"
    >
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const running = ref(false)
const summary = ref<any>(null)
const suggestions = ref<any[]>([])
const exceptions = ref<any>(null)
const error = ref('')
async function load() {
  try {
    const s: any = await api.summary(); summary.value = s?.data ?? s
    const e: any = await api.exceptions(); exceptions.value = e?.data ?? e
    const m: any = await api.matches('SUGGESTED'); const d = m?.data ?? m; suggestions.value = Array.isArray(d) ? d : (d?.items ?? [])
  } catch (e: any) { error.value = e?.data?.message || 'Failed' }
}
async function run() { running.value = true; try { await api.runReconciliation(); await load() } catch (e: any) { error.value = e?.data?.message } finally { running.value = false } }
async function approve(id: string) { try { await api.approveMatch(id); await load() } catch (e: any) { error.value = e?.data?.message } }
async function reject(id: string) { const reason = prompt('Reason') || 'rejected'; try { await api.rejectMatch(id, reason); await load() } catch (e: any) { error.value = e?.data?.message } }
onMounted(load)
</script>
