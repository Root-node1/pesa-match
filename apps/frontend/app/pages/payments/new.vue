<template>
  <div class="max-w-lg">
    <h1 class="text-2xl font-semibold mb-4">
      New payment
    </h1>
    <UCard>
      <UForm
        :state="state"
        @submit="onSubmit"
      >
        <UFormField
          label="Transaction reference"
          class="mb-3"
        >
          <UInput v-model="state.externalTransactionReference" />
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
          label="Payment date"
          class="mb-3"
        >
          <UInput
            v-model="state.paymentDate"
            type="date"
          />
        </UFormField>
        <UFormField
          label="Method"
          class="mb-3"
        >
          <UInput v-model="state.paymentMethod" />
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
const state = reactive({ externalTransactionReference: '', amountMinor: 0, paymentDate: '', paymentMethod: '' })
const loading = ref(false); const error = ref('')
async function onSubmit() {
  loading.value = true; error.value = ''
  try { await api.createPayment({ ...state, amountMinor: Number(state.amountMinor), paymentDate: state.paymentDate || undefined }); await navigateTo('/payments') } catch (e: any) { error.value = e?.data?.message || 'Failed' } finally { loading.value = false }
}
</script>
