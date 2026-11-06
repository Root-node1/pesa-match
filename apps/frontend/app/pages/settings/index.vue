<template>
  <div>
    <h1 class="text-2xl font-semibold mb-4">
      Settings
    </h1>
    <UCard>
      <p>Email: {{ user?.email }}</p>
      <p>Name: {{ user?.firstName }} {{ user?.lastName }}</p>
      <UButton
        class="mt-4"
        @click="logout"
      >
        Logout
      </UButton>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const { user, logout } = useAuth()
</script>
