import { create } from 'zustand'

export interface UserProfile {
  id: number
  username: string
  role: 'ADMIN' | 'LECTURER' | 'STUDENT'
  fullName: string | null
  email: string | null
}

interface AuthState {
  user: UserProfile | null
  accessToken: string | null
  setAuth: (user: UserProfile, accessToken: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  setAuth: (user, accessToken) => set({ user, accessToken }),
  clearAuth: () => set({ user: null, accessToken: null }),
}))
