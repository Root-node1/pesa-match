export default defineNuxtRouteMiddleware(async () => {
  const { token, tryRefresh, fetchMe, user } = useAuth()
  if (!token.value) {
    const ok = await tryRefresh()
    if (!ok) return navigateTo('/auth/login')
  }
  if (!user.value) await fetchMe()
  if (!user.value) return navigateTo('/auth/login')
})
