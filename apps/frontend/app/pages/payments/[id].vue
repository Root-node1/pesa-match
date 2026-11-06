<template>
  <div>
    <NuxtLink
      to="/payments"
      class="text-sm text-muted"
    >← Back</NuxtLink>
    <div
      v-if="loading"
      class="mt-4"
    >
      Loading...
    </div>
    <div v-else>
      <h1 class="text-2xl font-semibold mt-2">
        {{ payment?.transactionReference || payment?.id }}
      </h1>
      <UCard class="mt-4">
        <p>Amount: {{ payment?.amountMinor }}</p>
        <p>Status: {{ payment?.status }} / {{ payment?.reconciliationStatus }}</p>
        <p>Allocated: {{ payment?.allocatedMinor }} Available: {{ payment?.availableMinor }}</p>
      </UCard>
      <h2 class="text-lg font-semibold mt-6">
        Allocations
      </h2>
      <UTable
        :rows="payment?.matches || []"
        :columns="[{ accessorKey: 'id', header: 'ID' }, { accessorKey: 'amountMinor', header: 'Amount' }, { accessorKey: 'status', header: 'Status' }, { accessorKey: 'reason', header: 'Reason' }]"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const route = useRoute()
const loading = ref(true)
const payment = ref<any>(null)
onMounted(async () => {
  try { const res: any = await api.getPayment(route.params.id as string); payment.value = res?.data ?? res } finally { loading.value = false }
})
</script>
