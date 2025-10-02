import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, LoginForm, RegisterForm } from '@/types'
import { authApi, apiUtils } from '@/api'
import { useChatStore } from './chat'

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(apiUtils.getToken())

  const isLoggedIn = computed(() => !!token.value && !!user.value)

  // 登录
  const login = async (loginData: LoginForm) => {
    try {
      const response = await authApi.login(loginData)
      
      if (response.code === 200 && response.data) {
        user.value = response.data.user
        token.value = response.data.token
        return response
      } else {
        throw new Error(response.message)
      }
    } catch (error) {
      throw error
    }
  }

  // 注册
  const register = async (registerData: RegisterForm) => {
    try {
      const response = await authApi.register(registerData)
      
      if (response.code === 200) {
        return response
      } else {
        throw new Error(response.message)
      }
    } catch (error) {
      throw error
    }
  }

  // 登出
  const logout = async () => {
    const chatStore = useChatStore()
    try {
      if (user.value && token.value) {
        await authApi.logout({
          userId: user.value.userId,
          token: token.value
        })
      }
    } catch (error) {
      console.error('登出失败:', error)
    } finally {
      user.value = null
      token.value = null
      apiUtils.clearToken()
      chatStore.disconnectWebSocket()
    }
  }

  // 更新用户信息
  const updateUser = (userData: Partial<User>) => {
    if (user.value) {
      user.value = { ...user.value, ...userData }
    }
  }

  // 获取用户信息
  const fetchUserInfo = async (userId?: number) => {
    try {
      const targetUserId = userId || user.value?.userId
      if (!targetUserId) {
        throw new Error('用户ID不存在')
      }
      
      const response = await authApi.getUserInfo(targetUserId)
      if (response.code === 200 && response.data) {
        if (!userId || userId === user.value?.userId) {
          user.value = response.data
        }
        return response.data
      } else {
        throw new Error(response.message)
      }
    } catch (error) {
      throw error
    }
  }

  // 验证Token并初始化用户信息
  const initializeAuth = async () => {
    const savedToken = apiUtils.getToken()
    if (savedToken) {
      try {
        const response = await authApi.validateToken({ token: savedToken })
        if (response.code === 200 && response.data) {
          user.value = response.data
          token.value = savedToken
        } else {
          // Token无效，清除本地存储
          logout()
        }
      } catch (error) {
        console.error('Token验证失败:', error)
        logout()
      }
    }
  }

  // 修改密码
  const changePassword = async (oldPassword: string, newPassword: string) => {
    if (!user.value) {
      throw new Error('用户未登录')
    }

    try {
      const response = await authApi.changePassword({
        userId: user.value.userId,
        oldPassword,
        newPassword
      })
      
      if (response.code === 200) {
        return response
      } else {
        throw new Error(response.message)
      }
    } catch (error) {
      throw error
    }
  }

  return {
    user,
    token,
    isLoggedIn,
    login,
    register,
    logout,
    updateUser,
    fetchUserInfo,
    initializeAuth,
    changePassword
  }
})