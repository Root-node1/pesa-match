<template>
  <div class="max-w-md mx-auto mt-16">
    <UCard>
      <template #header>
        <h1 class="text-xl font-semibold">
          Register
        </h1>
      </template>
      <UForm
        :state="state"
        @submit="onSubmit"
      >
        <UFormField
          label="Organization name"
          name="organizationName"
          class="mb-4"
        >
          <UInput v-model="state.organizationName" />
        </UFormField>
        <UFormField
          label="First name"
          name="firstName"
          class="mb-4"
        >
          <UInput v-model="state.firstName" />
        </UFormField>
        <UFormField
          label="Last name"
          name="lastName"
          class="mb-4"
        >
          <UInput v-model="state.lastName" />
        </UFormField>
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
          Register
        </UButton>
      </UForm>
      <p
        v-if="error"
        class="text-red-500 text-sm mt-2"
      >
        {{ error }}
      </p>
      <p class="text-sm mt-4">
        Have account? <NuxtLink
          to="/auth/login"
          class="text-primary"
        >Login</NuxtLink>
      </p>
    </UCard>
  </div>
</template>

<script setup lang="ts">
const state = reactive({ organizationName: '', firstName: '', lastName: '', email: '', password: '' })
const loading = ref(false)
const error = ref('')
const { register } = useAuth()
async function onSubmit() {
  loading.value = true; error.value = ''
  try {
    await register(state)
    await navigateTo('/')
  } catch (e: any) {
    error.value = e?.data?.message || 'Registration failed'
  } finally { loading.value = false }
}
definePageMeta({ layout: false })
</script>
