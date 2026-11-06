export const useAuth = () => {
  const tokenCookie = useCookie<string | null>('pesa_access', { sameSite: 'lax' })
  const user = useState<any>('pesa_user', () => null)
  const memberships = useState<any[]>('pesa_memberships', () => [])

  const setSession = (res: any) => {
    tokenCookie.value = res?.data?.accessToken ?? res?.accessToken ?? null
    const u = res?.data?.user ?? res?.user
    if (u) user.value = u
    const m = res?.data?.memberships ?? res?.memberships
    if (m) memberships.value = m
  }

  const login = async (email: string, password: string) => {
    const res: any = await api.login({ email, password })
    setSession(res)
    return res
  }

  const register = async (body: any) => {
    const res: any = await api.register(body)
    setSession(res)
    return res
  }

  const fetchMe = async () => {
    try {
      const res: any = await api.me()
      user.value = res?.data?.user ?? res?.user
      memberships.value = res?.data?.memberships ?? res?.memberships ?? []
      return res
    } catch {
      tokenCookie.value = null
      user.value = null
      memberships.value = []
      return null
    }
  }

  const logout = async () => {
    try { await api.logout() } catch {}
    tokenCookie.value = null
    user.value = null
    memberships.value = []
    await navigateTo('/auth/login')
  }

  const tryRefresh = async () => {
    try {
      const res: any = await api.refresh()
      const t = res?.data?.accessToken ?? res?.accessToken
      if (t) tokenCookie.value = t
      return true
    } catch {
      tokenCookie.value = null
      return false
    }
  }

  return { token: tokenCookie, user, memberships, login, register, fetchMe, logout, tryRefresh }
}
