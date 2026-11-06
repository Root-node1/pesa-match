<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-semibold">
        Payments
      </h1>
      <UButton to="/payments/new">
        New payment
      </UButton>
    </div>
    <div
      v-if="loading"
      class="text-muted"
    >
      Loading...
    </div>
    <UTable
      v-else
      :rows="rows"
      :columns="columns"
    />
    <div class="flex justify-between mt-4">
      <UButton
        :disabled="page<=1"
        @click="page--;load()"
      >
        Prev
      </UButton>
      <span>Page {{ page }} / {{ totalPages }}</span>
      <UButton
        :disabled="page>=totalPages"
        @click="page++;load()"
      >
        Next
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const loading = ref(true)
const rows = ref<any[]>([])
const page = ref(1)
const totalPages = ref(1)
const columns = [
  { accessorKey: 'transactionReference', header: 'Reference' },
  { accessorKey: 'amountMinor', header: 'Amount (minor)' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'reconciliationStatus', header: 'Recon' }
]
async function load() {
  loading.value = true
  try {
    const res: any = await api.listPayments({ page: page.value, limit: 20 })
    const d = res?.data ?? res
    rows.value = d.items ?? []
    totalPages.value = d.totalPages ?? 1
  } finally { loading.value = false }
}
onMounted(load)
</script>
