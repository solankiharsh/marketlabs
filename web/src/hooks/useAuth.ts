import { useAuthStore } from '@/stores/authStore'

export function useAuth() {
  const { user, isAuthenticated, roles, isLoading, login, logout, fetchUserInfo } = useAuthStore()

  const isAdmin = roles.includes('admin')
  const hasPermission = (permission: string) => roles.includes(permission) || roles.includes('admin')

  return {
    user,
    isAuthenticated,
    roles,
    isLoading,
    isAdmin,
    hasPermission,
    login,
    logout,
    fetchUserInfo,
  }
}
