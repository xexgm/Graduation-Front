import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import type { User } from '@/types'
import { authApi } from '@/api'

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))

  const isLoggedIn = computed(() => !!token.value && !!user.value)

  const login = async (username: string, password: string, remember = false) => {
    try {
      const response = await authApi.login({ username, password, remember })
      const { user: userData, token: userToken } = response.data
      
      user.value = userData
      token.value = userToken
      localStorage.setItem('token', userToken)
      
      if (remember) {
        localStorage.setItem('remember', 'true')
      }
      
      return response
    } catch (error) {
      throw error
    }
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch (error) {
      console.error('登出失败:', error)
    } finally {
      user.value = null
      token.value = null
      localStorage.removeItem('token')
      localStorage.removeItem('remember')
    }
  }

  const updateUser = (userData: Partial<User>) => {
    if (user.value) {
      user.value = { ...user.value, ...userData }
    }
  }

  const fetchUserInfo = async () => {
    try {
      const response = await authApi.getUserInfo()
      user.value = response.data
      return response.data
    } catch (error) {
      throw error
    }
  }

  const initializeAuth = async () => {
    if (token.value) {
      try {
        await fetchUserInfo()
      } catch (error) {
        logout()
      }
    }
  }

  return {
    user,
    token,
    isLoggedIn,
    login,
    logout,
    updateUser,
    fetchUserInfo,
    initializeAuth
  }
})