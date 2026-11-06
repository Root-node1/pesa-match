<template>
  <div class="max-w-md mx-auto mt-16">
    <UCard>
      <template #header>
        <h1 class="text-xl font-semibold">
          Login
        </h1>
      </template>
      <UForm
        :state="state"
        @submit="onSubmit"
      >
        <UFormField
          label="Email"
          name="email"
          class="mb-4"
        >
          <UInput
            v-model="state.email"
            type="email"
          />
        </UFormField>
        <UFormField
          label="Password"
          name="password"
          class="mb-4"
        >
          <UInput
            v-model="state.password"
            type="password"
          />
        </UFormField>
        <UButton
          type="submit"
          :loading="loading"
          block
        >
          Login
        </UButton>
      </UForm>
      <p
        v-if="error"
        class="text-red-500 text-sm mt-2"
      >
        {{ error }}
      </p>
      <p class="text-sm mt-4">
        No account? <NuxtLink
          to="/auth/register"
          class="text-primary"
        >Register</NuxtLink>
      </p>
    </UCard>
  </div>
</template>

<script setup lang="ts">
const state = reactive({ email: '', password: '' })
const loading = ref(false)
const error = ref('')
const { login } = useAuth()
async function onSubmit() {
  loading.value = true; error.value = ''
  try {
    await login(state.email, state.password)
    await navigateTo('/')
  } catch (e: any) {
    error.value = e?.data?.message || 'Login failed'
  } finally { loading.value = false }
}
definePageMeta({ layout: false })
</script>
