const base = () => useRuntimeConfig().public.apiBase as string

function token() {
  const c = useCookie<string | null>('pesa_access')
  return c.value
}

async function request<T>(path: string, opts: any = {}): Promise<T> {
  const headers: Record<string, string> = { ...(opts.headers || {}) }
  const t = token()
  if (t) headers.Authorization = `Bearer ${t}`
  return await $fetch<T>(`${base()}${path}`, {
    ...opts,
    headers,
    credentials: 'include'
  })
}

export const api = {
  health: () => request<any>('/health'),
  register: (body: any) => request<any>('/auth/register', { method: 'POST', body }),
  login: (body: any) => request<any>('/auth/login', { method: 'POST', body }),
  refresh: () => request<any>('/auth/refresh', { method: 'POST' }),
  logout: () => request<any>('/auth/logout', { method: 'POST' }),
  me: () => request<any>('/auth/me'),
  listOrders: (q: any = {}) => request<any>('/orders', { query: q }),
  getOrder: (id: string) => request<any>(`/orders/${id}`),
  createOrder: (body: any) => request<any>('/orders', { method: 'POST', body }),
  listPayments: (q: any = {}) => request<any>('/payments', { query: q }),
  getPayment: (id: string) => request<any>(`/payments/${id}`),
  createPayment: (body: any) => request<any>('/payments', { method: 'POST', body }),
  listImports: () => request<any>('/imports'),
  importOrders: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return request<any>('/imports/orders', { method: 'POST', body: fd })
  },
  importPayments: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return request<any>('/imports/payments', { method: 'POST', body: fd })
  },
  runReconciliation: () => request<any>('/reconciliation/run', { method: 'POST' }),
  summary: () => request<any>('/reconciliation/summary'),
  exceptions: () => request<any>('/reconciliation/exceptions'),
  matches: (status?: string) => request<any>('/reconciliation/matches', { query: status ? { status } : {} }),
  approveMatch: (id: string, reason?: string) => request<any>(`/matches/${id}/approve`, { method: 'POST', body: { reason } }),
  rejectMatch: (id: string, reason: string) => request<any>(`/matches/${id}/reject`, { method: 'POST', body: { reason } }),
  manualMatch: (body: any) => request<any>('/matches/manual', { method: 'POST', body }),
  reverseMatch: (id: string, reason: string) => request<any>(`/matches/${id}/reverse`, { method: 'POST', body: { reason } }),
  matchHistory: (id: string) => request<any>(`/matches/${id}/history`),
  exportReconciliation: () => `${base()}/exports/reconciliation`,
  getNotificationPreferences: () => request<any>('/notifications/preferences'),
  updateNotificationPreferences: (body: any) => request<any>('/notifications/preferences', { method: 'PATCH', body }),
  listSms: () => request<any>('/notifications/sms'),
  retrySms: (id: string) => request<any>(`/notifications/sms/${id}/retry`, { method: 'POST' }),
  exportExceptions: () => `${base()}/exports/exceptions`
}
