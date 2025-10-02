<template>
  <div class="login-container gradient-bg">
    <div class="login-card glass-morphism">
      <div class="login-header">
        <h1 class="login-title">IM聊天应用</h1>
        <p class="login-subtitle">连接你我，沟通无界</p>
      </div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        class="login-form"
        label-position="top"
        @submit.prevent="handleLogin"
      >
        <el-form-item prop="username" label="用户名">
          <el-input
            v-model="form.username"
            placeholder="请输入用户名"
            size="large"
            class="input-glass"
          >
            <template #prefix>
              <el-icon><User /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item prop="password" label="密码">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            class="input-glass"
            show-password
          >
            <template #prefix>
              <el-icon><Lock /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item>
          <div class="login-options">
            <el-link type="primary" class="forgot-link">
              忘记密码？
            </el-link>
          </div>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            class="login-btn"
            :loading="loading"
            @click="handleLogin"
          >
            {{ loading ? '登录中...' : '登录' }}
          </el-button>
        </el-form-item>

        <div class="register-link">
          <span>还没有账号？</span>
          <router-link to="/register" class="link">立即注册</router-link>
        </div>
      </el-form>
    </div>

    <div class="background-decoration">
      <div class="floating-bubble bubble-1"></div>
      <div class="floating-bubble bubble-2"></div>
      <div class="floating-bubble bubble-3"></div>
      <div class="floating-bubble bubble-4"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import type { LoginForm } from '@/types'

const router = useRouter()
const userStore = useUserStore()
const chatStore = useChatStore()

const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive<LoginForm>({
  username: '',
  password: ''
})

const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于 6 个字符', trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  if (!formRef.value) return

  try {
    const valid = await formRef.value.validate()
    if (!valid) return

    loading.value = true
    
    const response = await userStore.login(form)
    
    if (response.code === 200 && response.data) {
      await chatStore.initWebSocket()
      
      ElMessage.success('登录成功！')
      router.push('/chat')
    }
  } catch (error: any) {
    ElMessage.error(error.message || '登录失败，请检查用户名和密码')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  position: relative;
  overflow: hidden;
}

.login-card {
  width: 400px;
  padding: 40px;
  border-radius: var(--radius-large);
  position: relative;
  z-index: 10;
  animation: slideInUp 0.6s ease-out;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-title {
  font-size: 28px;
  font-weight: 700;
  color: white;
  margin-bottom: 8px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.login-subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
}

.login-form {
  .el-form-item {
    margin-bottom: 20px;
  }

  .el-form-item__label {
    color: rgba(255, 255, 255, 0.9);
    font-weight: 500;
    margin-bottom: 6px;
  }

  .input-glass {
    /* Wrapper background/border for Element Plus v2 */
    :deep(.el-input__wrapper) {
      background: rgba(255, 255, 255, 0.95);
      border: 1px solid rgba(0, 0, 0, 0.1);
      box-shadow: none;
    }

    /* Actual input text */
    :deep(.el-input__inner) {
      color: var(--text-primary);

      &::placeholder {
        color: var(--text-placeholder);
      }
    }

    /* Focus state */
    :deep(.el-input__wrapper.is-focus),
    :deep(.el-input__wrapper:hover) {
      border-color: var(--primary-color) !important;
      box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.15);
      background: #ffffff;
    }

    :deep(.el-input__prefix) {
      color: var(--text-secondary);
    }

    :deep(.el-input__suffix) {
      color: var(--text-secondary);
    }
  }
}

.login-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;

  .remember-me {
    :deep(.el-checkbox__label) {
      color: rgba(255, 255, 255, 0.8);
    }

    :deep(.el-checkbox__inner) {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.3);
    }
  }

  .forgot-link {
    color: rgba(255, 255, 255, 0.8);
    text-decoration: none;
    
    &:hover {
      color: white;
    }
  }
}

.login-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  border-radius: var(--radius-base);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  transition: var(--transition-all);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
  }
}

.register-link {
  text-align: center;
  margin-top: 20px;
  color: rgba(255, 255, 255, 0.8);
  
  .link {
    color: white;
    text-decoration: none;
    font-weight: 600;
    margin-left: 4px;
    
    &:hover {
      text-decoration: underline;
    }
  }
}

.background-decoration {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.floating-bubble {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  animation: float 6s ease-in-out infinite;
  
  &.bubble-1 {
    width: 80px;
    height: 80px;
    top: 20%;
    left: 10%;
    animation-delay: 0s;
  }
  
  &.bubble-2 {
    width: 60px;
    height: 60px;
    top: 60%;
    right: 15%;
    animation-delay: 2s;
  }
  
  &.bubble-3 {
    width: 100px;
    height: 100px;
    bottom: 20%;
    left: 20%;
    animation-delay: 4s;
  }
  
  &.bubble-4 {
    width: 40px;
    height: 40px;
    top: 30%;
    right: 30%;
    animation-delay: 1s;
  }
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-20px);
  }
}
</style>
