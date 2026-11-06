<template>
  <UApp>
    <UHeader>
      <template #left>
        <NuxtLink
          to="/"
          class="font-semibold text-lg"
        >PesaMatch</NuxtLink>
      </template>
      <template #default>
        <UNavigationMenu :items="nav" />
      </template>
      <template #right>
        <UColorModeButton />
        <UButton
          label="Logout"
          color="neutral"
          variant="ghost"
          @click="logout"
        />
      </template>
    </UHeader>
    <UMain>
      <UContainer class="py-6">
        <slot />
      </UContainer>
    </UMain>
  </UApp>
</template>

<script setup lang="ts">
const { logout } = useAuth()
const nav = [
  { label: 'Dashboard', to: '/' },
  { label: 'Orders', to: '/orders' },
  { label: 'Payments', to: '/payments' },
  { label: 'Imports', to: '/imports' },
  { label: 'Reconciliation', to: '/reconciliation' },
  { label: 'Settings', to: '/settings' }
]
</script>
