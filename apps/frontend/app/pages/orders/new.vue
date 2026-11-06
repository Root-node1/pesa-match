<template>
  <div class="max-w-lg">
    <h1 class="text-2xl font-semibold mb-4">
      New order
    </h1>
    <UCard>
      <UForm
        :state="state"
        @submit="onSubmit"
      >
        <UFormField
          label="External reference"
          class="mb-3"
        >
          <UInput v-model="state.externalReference" />
        </UFormField>
        <UFormField
          label="Customer"
          class="mb-3"
        >
          <UInput v-model="state.customerName" />
        </UFormField>
        <UFormField
          label="Description"
          class="mb-3"
        >
          <UInput v-model="state.description" />
        </UFormField>
        <UFormField
          label="Amount (minor units)"
          class="mb-3"
        >
          <UInput
            v-model.number="state.amountMinor"
            type="number"
          />
        </UFormField>
        <UFormField
          label="Order date"
          class="mb-3"
        >
          <UInput
            v-model="state.orderDate"
            type="date"
          />
        </UFormField>
        <UButton
          type="submit"
          :loading="loading"
        >
          Create
        </UButton>
      </UForm>
      <p
        v-if="error"
        class="text-red-500 mt-2"
      >
        {{ error }}
      </p>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const state = reactive({ externalReference: '', customerName: '', description: '', amountMinor: 0, orderDate: '' })
const loading = ref(false); const error = ref('')
async function onSubmit() {
  loading.value = true; error.value = ''
  try { await api.createOrder({ ...state, amountMinor: Number(state.amountMinor), orderDate: state.orderDate || undefined }); await navigateTo('/orders') } catch (e: any) { error.value = e?.data?.message || 'Failed' } finally { loading.value = false }
}
</script>
