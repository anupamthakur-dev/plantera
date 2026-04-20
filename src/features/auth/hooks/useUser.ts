import { useMemo } from 'react'
import { useAuth } from '../AuthProvider'

export function useUser() {
  const { user, loading } = useAuth()

  return useMemo(() => {
    return {
      user,
      isUser: Boolean(user),
      loading,
    }
  }, [loading, user])
}
