<template>
  <div class="register-container gradient-bg">
    <div class="register-card glass-morphism">
      <div class="register-header">
        <h1 class="register-title">创建账号</h1>
        <p class="register-subtitle">加入我们，开始精彩聊天</p>
      </div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        class="register-form"
        label-position="top"
        @submit.prevent="handleRegister"
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

        <el-form-item prop="nickname" label="昵称（可选）">
          <el-input
            v-model="form.nickname"
            placeholder="请输入昵称（可选）"
            size="large"
            class="input-glass"
          >
            <template #prefix>
              <el-icon><Avatar /></el-icon>
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
          <el-button
            type="primary"
            size="large"
            class="register-btn"
            :loading="loading"
            @click="handleRegister"
          >
            {{ loading ? '注册中...' : '立即注册' }}
          </el-button>
        </el-form-item>

        <div class="login-link">
          <span>已有账号？</span>
          <router-link to="/login" class="link">立即登录</router-link>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { User, Lock, Message, Avatar } from '@element-plus/icons-vue'
import { authApi } from '@/api'
import type { RegisterForm } from '@/types'

const router = useRouter()
const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive<RegisterForm>({
  username: '',
  password: '',
  nickname: ''
})

const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 8, message: '密码长度不能少于 8 个字符', trigger: 'blur' },
    { pattern: /^(?=.*[a-zA-Z])(?=.*\d).+$/, message: '密码必须包含数字和字母', trigger: 'blur' }
  ]
}

const handleRegister = async () => {
  if (!formRef.value) return

  try {
    const valid = await formRef.value.validate()
    if (!valid) return

    loading.value = true
    
    await authApi.register(form)
    
    ElMessage.success('注册成功！请登录')
    router.push('/login')
  } catch (error: any) {
    ElMessage.error(error.message || '注册失败，请重试')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.register-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  position: relative;
  overflow: hidden;
}

.register-card {
  width: 400px;
  padding: 40px;
  border-radius: var(--radius-large);
  position: relative;
  z-index: 10;
  animation: slideInUp 0.6s ease-out;
}

.register-header {
  text-align: center;
  margin-bottom: 32px;
}

.register-title {
  font-size: 28px;
  font-weight: 700;
  color: white;
  margin-bottom: 8px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.register-subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
}

.register-form {
  .el-form-item {
    margin-bottom: 20px;
  }

  .el-form-item__label {
    color: rgba(255, 255, 255, 0.9);
    font-weight: 500;
    margin-bottom: 6px;
  }

  .input-glass {
    :deep(.el-input__wrapper) {
      background: rgba(255, 255, 255, 0.95);
      border: 1px solid rgba(0, 0, 0, 0.1);
      box-shadow: none;
    }

    :deep(.el-input__inner) {
      color: var(--text-primary);

      &::placeholder {
        color: var(--text-placeholder);
      }
    }

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

.register-btn {
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

.login-link {
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
</style>
