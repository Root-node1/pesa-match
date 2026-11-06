<template>
  <div>
    <h1 class="text-2xl font-semibold mb-4">
      Settings
    </h1>
    <UCard class="mb-4">
      <p>Email: {{ user?.email }}</p>
      <p>Name: {{ user?.firstName }} {{ user?.lastName }}</p>
      <UButton
        class="mt-4"
        @click="logout"
      >
        Logout
      </UButton>
    </UCard>
    <UCard>
      <template #header>
        <h2 class="font-semibold">
          SMS notifications
        </h2>
      </template>
      <p class="text-sm text-muted mb-2">
        Provider: {{ prefs?.provider }}
      </p>
      <UFormField
        label="Recipient (Kenyan number)"
        class="mb-3"
      >
        <UInput
          v-model="recipient"
          placeholder="0712345678"
        />
      </UFormField>
      <div class="flex items-center gap-3 mb-3">
        <UCheckbox
          v-model="enabled"
          label="Enable SMS notifications"
        />
      </div>
      <UButton
        :loading="saving"
        @click="save"
      >
        Save preferences
      </UButton>
      <p
        v-if="msg"
        class="text-sm mt-2"
      >
        {{ msg }}
      </p>
    </UCard>
    <h2 class="text-lg font-semibold mt-6">
      SMS history
    </h2>
    <UTable
      :rows="sms"
      :columns="[{ accessorKey: 'recipient', header: 'Recipient' }, { accessorKey: 'status', header: 'Status' }, { accessorKey: 'body', header: 'Message' }]"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const { user, logout } = useAuth()
const prefs = ref<any>(null)
const enabled = ref(false)
const recipient = ref('')
const saving = ref(false)
const msg = ref('')
const sms = ref<any[]>([])
async function load() {
  try {
    const p: any = await api.getNotificationPreferences(); const d = p?.data ?? p; prefs.value = d; enabled.value = !!d?.enabled; recipient.value = d?.recipient ?? ''
    const s: any = await api.listSms(); sms.value = s?.data ?? s ?? []
  } catch (e: any) { msg.value = e?.data?.message || 'Failed' }
}
async function save() {
  saving.value = true; msg.value = ''
  try {
    await api.updateNotificationPreferences({ enabled: enabled.value, recipient: recipient.value, consent: enabled.value })
    msg.value = 'Saved'
    await load()
  } catch (e: any) { msg.value = e?.data?.message || 'Failed' } finally { saving.value = false }
}
onMounted(load)
</script>
