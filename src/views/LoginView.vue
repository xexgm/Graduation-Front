<template>
  <div class="login-container">
    <div class="aurora aurora-primary"></div>
    <div class="aurora aurora-secondary"></div>
    <div class="grid-layer"></div>

    <section class="brand-panel">
      <div class="brand-badge">REALTIME · SECURE · LIGHT</div>
      <h1 class="brand-title">光芒IM</h1>
      <p class="brand-copy">
        聚合实时聊天、语音消息、文件传输与智能转写，让沟通在光里发生。
      </p>
      <div class="brand-metrics">
        <div>
          <strong>WSS</strong>
          <span>安全传输</span>
        </div>
        <div>
          <strong>ASR</strong>
          <span>语音转写</span>
        </div>
        <div>
          <strong>IM</strong>
          <span>即时互联</span>
        </div>
      </div>
    </section>

    <div class="login-card">
      <div class="login-header">
        <div class="logo-mark" aria-label="光芒IM">
          <span class="minimal-logo"></span>
        </div>
        <h2 class="login-title">欢迎回来</h2>
        <p class="login-subtitle">登录光芒IM，继续你的会话</p>
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
      <div class="floating-orb orb-1"></div>
      <div class="floating-orb orb-2"></div>
      <div class="floating-orb orb-3"></div>
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
    console.log('Login API response:', response)
    
    if (response.code === 200 && response.data) {
      console.log('Login successful, initializing WebSocket...')
      try {
        await chatStore.initWebSocket()
        console.log('WebSocket initialized successfully.')
      } catch (wsError) {
        console.error('WebSocket initialization failed:', wsError)
        // 即使 WebSocket 连接失败，也许我们也应该允许用户登录并跳转
      }
      
      ElMessage.success('登录成功！')
      console.log('Pushing router to /lobby')
      router.push('/lobby')
    } else {
      console.warn('Login response code is not 200 or missing data', response)
      throw new Error(response.message || '登录失败')
    }
  } catch (error: any) {
    console.error('Login process error:', error)
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
  gap: 72px;
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  padding: 48px;
  background:
    radial-gradient(circle at 18% 22%, rgba(56, 189, 248, 0.2), transparent 28%),
    radial-gradient(circle at 78% 24%, rgba(139, 92, 246, 0.22), transparent 30%),
    linear-gradient(135deg, #050816 0%, #08111f 48%, #0b1020 100%);
  color: #eef6ff;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(120deg, transparent, rgba(255, 255, 255, 0.04), transparent);
    pointer-events: none;
  }
}

.aurora {
  position: absolute;
  border-radius: 999px;
  filter: blur(18px);
  opacity: 0.78;
  pointer-events: none;
}

.aurora-primary {
  width: 360px;
  height: 360px;
  top: -90px;
  right: 12%;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.5), transparent 68%);
}

.aurora-secondary {
  width: 420px;
  height: 420px;
  left: -120px;
  bottom: -140px;
  background: radial-gradient(circle, rgba(168, 85, 247, 0.38), transparent 70%);
}

.grid-layer {
  position: absolute;
  inset: 0;
  opacity: 0.18;
  background-image:
    linear-gradient(rgba(148, 163, 184, 0.18) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 163, 184, 0.18) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: radial-gradient(circle at center, #000 0%, transparent 72%);
}

.brand-panel {
  width: min(480px, 42vw);
  position: relative;
  z-index: 2;
  animation: slideInLeft 0.7s ease-out;
}

.brand-badge {
  display: inline-flex;
  padding: 8px 14px;
  border: 1px solid rgba(125, 211, 252, 0.28);
  border-radius: 999px;
  color: #7dd3fc;
  background: rgba(14, 165, 233, 0.08);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
}

.brand-title {
  margin: 24px 0 16px;
  font-size: clamp(52px, 7vw, 88px);
  line-height: 0.98;
  font-weight: 900;
  letter-spacing: -0.08em;
  color: #fff;
  text-shadow: 0 0 40px rgba(96, 165, 250, 0.4);
}

.brand-copy {
  max-width: 440px;
  margin: 0;
  color: rgba(226, 232, 240, 0.78);
  font-size: 17px;
  line-height: 1.9;
}

.brand-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 36px;

  div {
    padding: 16px;
    border: 1px solid rgba(148, 163, 184, 0.18);
    border-radius: 18px;
    background: rgba(15, 23, 42, 0.44);
    backdrop-filter: blur(18px);
  }

  strong {
    display: block;
    color: #ffffff;
    font-size: 20px;
    margin-bottom: 4px;
  }

  span {
    color: rgba(203, 213, 225, 0.68);
    font-size: 12px;
  }
}

.login-card {
  width: 420px;
  padding: 36px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 28px;
  position: relative;
  z-index: 2;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.86), rgba(15, 23, 42, 0.66));
  box-shadow:
    0 30px 90px rgba(0, 0, 0, 0.42),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(24px);
  animation: slideInUp 0.6s ease-out;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.logo-mark {
  width: 58px;
  height: 58px;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
  background: linear-gradient(135deg, #38bdf8 0%, #6366f1 50%, #a855f7 100%);
  box-shadow: 0 18px 38px rgba(59, 130, 246, 0.34);
}

.minimal-logo {
  position: relative;
  width: 28px;
  height: 28px;
  border: 2px solid rgba(255, 255, 255, 0.92);
  border-radius: 50%;

  &::before {
    content: '';
    position: absolute;
    right: -4px;
    bottom: 2px;
    width: 10px;
    height: 10px;
    border-right: 2px solid rgba(255, 255, 255, 0.92);
    border-bottom: 2px solid rgba(255, 255, 255, 0.92);
    transform: rotate(10deg);
  }

  &::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 0 14px rgba(255, 255, 255, 0.85);
    transform: translate(-50%, -50%);
  }
}

.login-title {
  font-size: 26px;
  font-weight: 800;
  color: #f8fafc;
  margin-bottom: 8px;
}

.login-subtitle {
  font-size: 14px;
  color: rgba(203, 213, 225, 0.72);
  margin: 0;
}

.login-form {
  .el-form-item {
    margin-bottom: 20px;
  }

  .el-form-item__label {
    color: rgba(226, 232, 240, 0.86);
    font-weight: 500;
    margin-bottom: 6px;
  }

  .input-glass {
    /* Wrapper background/border for Element Plus v2 */
    :deep(.el-input__wrapper) {
      height: 48px;
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 14px;
      background: rgba(2, 6, 23, 0.55);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
    }

    /* Actual input text */
    :deep(.el-input__inner) {
      color: #e2e8f0;

      &::placeholder {
        color: rgba(148, 163, 184, 0.72);
      }
    }

    /* Focus state */
    :deep(.el-input__wrapper.is-focus),
    :deep(.el-input__wrapper:hover) {
      border-color: rgba(56, 189, 248, 0.72) !important;
      box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.16);
      background: rgba(15, 23, 42, 0.84);
    }

    :deep(.el-input__prefix) {
      color: rgba(125, 211, 252, 0.9);
    }

    :deep(.el-input__suffix) {
      color: rgba(148, 163, 184, 0.86);
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
    color: rgba(125, 211, 252, 0.88);
    text-decoration: none;
    
    &:hover {
      color: #e0f2fe;
    }
  }
}

.login-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 700;
  border-radius: 14px;
  background: linear-gradient(135deg, #38bdf8 0%, #6366f1 52%, #9333ea 100%);
  border: none;
  transition: var(--transition-all);
  box-shadow: 0 16px 34px rgba(79, 70, 229, 0.32);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 20px 42px rgba(59, 130, 246, 0.42);
  }
}

.register-link {
  text-align: center;
  margin-top: 20px;
  color: rgba(203, 213, 225, 0.76);
  
  .link {
    color: #7dd3fc;
    text-decoration: none;
    font-weight: 700;
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

.floating-orb {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(125, 211, 252, 0.18);
  background: rgba(125, 211, 252, 0.08);
  animation: float 7s ease-in-out infinite;

  &.orb-1 {
    width: 86px;
    height: 86px;
    top: 18%;
    left: 9%;
  }

  &.orb-2 {
    width: 54px;
    height: 54px;
    right: 18%;
    bottom: 18%;
    animation-delay: 1.5s;
  }

  &.orb-3 {
    width: 34px;
    height: 34px;
    right: 34%;
    top: 26%;
    animation-delay: 3s;
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

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
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

@media (max-width: 980px) {
  .login-container {
    flex-direction: column;
    gap: 28px;
    padding: 32px 20px;
  }

  .brand-panel {
    width: min(420px, 100%);
    text-align: center;
  }

  .brand-copy {
    margin: 0 auto;
  }

  .brand-metrics {
    margin-top: 24px;
  }

  .login-card {
    width: min(420px, 100%);
  }
}
</style>
