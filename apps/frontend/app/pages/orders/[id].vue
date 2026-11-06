<template>
  <div>
    <NuxtLink
      to="/orders"
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
        {{ order?.sourceReference || order?.id }}
      </h1>
      <UCard class="mt-4">
        <p>Amount: {{ order?.amountMinor }}</p>
        <p>Status: {{ order?.status }} / {{ order?.reconciliationStatus }}</p>
        <p>Allocated: {{ order?.allocatedMinor }} Outstanding: {{ order?.outstandingMinor }}</p>
      </UCard>
      <h2 class="text-lg font-semibold mt-6">
        Allocations
      </h2>
      <UTable
        :rows="order?.matches || []"
        :columns="[{ accessorKey: 'id', header: 'ID' }, { accessorKey: 'amountMinor', header: 'Amount' }, { accessorKey: 'status', header: 'Status' }, { accessorKey: 'reason', header: 'Reason' }]"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const route = useRoute()
const loading = ref(true)
const order = ref<any>(null)
onMounted(async () => {
  try { const res: any = await api.getOrder(route.params.id as string); order.value = res?.data ?? res } finally { loading.value = false }
})
</script>
