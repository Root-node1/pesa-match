<template>
  <div>
    <h1 class="text-2xl font-semibold mb-4">
      CSV Imports
    </h1>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <UCard>
        <template #header>
          <h2 class="font-semibold">
            Import orders
          </h2>
        </template>
        <input
          type="file"
          accept=".csv"
          @change="onFile($event, 'orders')"
        >
        <UButton
          class="mt-3"
          :loading="loadingOrders"
          @click="upload('orders')"
        >
          Upload
        </UButton>
        <pre
          v-if="resultOrders"
          class="text-sm mt-3"
        >{{ JSON.stringify(resultOrders, null, 2) }}</pre>
      </UCard>
      <UCard>
        <template #header>
          <h2 class="font-semibold">
            Import payments
          </h2>
        </template>
        <input
          type="file"
          accept=".csv"
          @change="onFile($event, 'payments')"
        >
        <UButton
          class="mt-3"
          :loading="loadingPayments"
          @click="upload('payments')"
        >
          Upload
        </UButton>
        <pre
          v-if="resultPayments"
          class="text-sm mt-3"
        >{{ JSON.stringify(resultPayments, null, 2) }}</pre>
      </UCard>
    </div>
    <h2 class="text-lg font-semibold mt-6">
      Import history
    </h2>
    <UTable
      :rows="batches"
      :columns="[{ accessorKey: 'type', header: 'Type' }, { accessorKey: 'sourceName', header: 'File' }, { accessorKey: 'totalRows', header: 'Total' }, { accessorKey: 'importedRows', header: 'Imported' }, { accessorKey: 'failedRows', header: 'Failed' }, { accessorKey: 'status', header: 'Status' }]"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const fileOrders = ref<File | null>(null)
const filePayments = ref<File | null>(null)
const loadingOrders = ref(false)
const loadingPayments = ref(false)
const resultOrders = ref<any>(null)
const resultPayments = ref<any>(null)
const batches = ref<any[]>([])

function onFile(e: any, type: string) {
  const f = e.target.files?.[0]
  if (type === 'orders') fileOrders.value = f
  else filePayments.value = f
}
async function upload(type: string) {
  const f = type === 'orders' ? fileOrders.value : filePayments.value
  if (!f) return
  const loading = type === 'orders' ? loadingOrders : loadingPayments
  loading.value = true
  try {
    const res: any = type === 'orders' ? await api.importOrders(f) : await api.importPayments(f)
    if (type === 'orders') resultOrders.value = res?.data ?? res
    else resultPayments.value = res?.data ?? res
    await loadBatches()
  } catch (e: any) {
    if (type === 'orders') resultOrders.value = { error: e?.data?.message || 'Failed' }
    else resultPayments.value = { error: e?.data?.message || 'Failed' }
  } finally { loading.value = false }
}
async function loadBatches() {
  try { const res: any = await api.listImports(); batches.value = res?.data ?? res ?? [] } catch {}
}
onMounted(loadBatches)
</script>
