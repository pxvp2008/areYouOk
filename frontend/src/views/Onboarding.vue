<template>
  <div class="onboarding-page">
    <div class="onboarding-container">
      <el-card class="onboarding-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <el-icon><Guide /></el-icon>
            <span>{{ steps[currentStep].title }}</span>
          </div>
        </template>

        <div class="step-indicator">
          <el-steps :active="currentStep" align-center finish-status="success">
            <el-step title="输入Token" description="配置您的API密钥" />
            <el-step title="接口验证" description="测试连通性" />
            <el-step title="完成" description="开始使用" />
          </el-steps>
        </div>

        <div class="step-content">
          <!-- 步骤1: 输入Token -->
          <div v-if="currentStep === 0" class="step-1">
            <p class="step-description">{{ steps[0].description }}</p>

            <!-- Token获取说明 -->
            <el-alert
              title="如何获取API Token？（你的Token只会保存在你本地的数据库中，我是拿不到的）"
              type="info"
              :closable="false"
              show-icon
              class="token-guide"
            >
              <template #default>
                <div class="token-steps">
                  <p><strong>步骤1：</strong>访问智谱AI控制台：<a href="https://bigmodel.cn/console/overview" target="_blank">https://bigmodel.cn/console/overview</a></p>
                  <p><strong>步骤2：</strong>以Chrome浏览器为例：F12 打开【开发者工具】，点击【网络】，勾选【Fetch/XHR】</p>
                  <p><strong>步骤3：</strong>刷新页面，点击一条请求</p>
                  <p><strong>步骤4：</strong>在【标头】中找到【Authorization】</p>
                  <p><strong>步骤5：</strong>将【Authorization】对应的一长串值，复制到下方文本框中，然后点击下一步</p>
                </div>
              </template>
            </el-alert>

            <el-form :model="form" label-position="top">
              <el-form-item>
                <el-input
                  v-model="form.token"
                  type="textarea"
                  :rows="6"
                  placeholder="请输入智谱AI的API Token"
                  class="token-input"
                />
              </el-form-item>
              <el-form-item>
                <el-button
                  type="primary"
                  @click="handleSaveToken"
                  :loading="saving"
                  :disabled="!form.token.trim()"
                  class="action-button"
                >
                  <el-icon><Check /></el-icon>
                  下一步
                </el-button>
              </el-form-item>
            </el-form>
          </div>

          <!-- 步骤2: 接口验证 -->
          <div v-if="currentStep === 1" class="step-2">
            <p class="step-description">{{ steps[1].description }}</p>
            <div class="step-2-actions">
              <div class="left-actions">
                <el-button @click="handlePrevStep">
                  <el-icon><ArrowLeft /></el-icon>
                  上一步
                </el-button>
              </div>
              <div class="right-actions">
                <el-button
                  type="primary"
                  @click="handleVerify"
                  :loading="verifying"
                  :disabled="verifying"
                  class="action-button"
                >
                  <el-icon><Connection /></el-icon>
                  {{ verifying ? '验证中...' : '验证并保存' }}
                </el-button>
              </div>
            </div>
            <div v-if="verificationResult" class="verification-result">
              <el-alert
                :type="verificationResult.success ? 'success' : 'error'"
                :title="verificationResult.message"
                :closable="false"
                show-icon
              />
            </div>
          </div>

          <!-- 步骤3: 完成 -->
          <div v-if="currentStep === 2" class="step-3">
            <p class="step-description">{{ steps[2].description }}</p>
            <el-result
              icon="success"
              title="配置完成！"
              sub-title="您的API Token已配置并验证成功"
            >
              <template #extra>
                <el-button type="primary" @click="handleComplete">
                  <el-icon><Check /></el-icon>
                  开始使用
                </el-button>
              </template>
            </el-result>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Guide, Check, Connection, ArrowLeft } from '@element-plus/icons-vue'
import api from '@/api'

const router = useRouter()
const currentStep = ref(0)
const saving = ref(false)
const verifying = ref(false)
const verificationResult = ref(null)

const form = ref({
  token: ''
})

const steps = [
  {
    title: '配置API Token',
    description: '请输入您的智谱AI API Token'
  },
  {
    title: '接口验证',
    description: '系统将验证Token是否有效，验证通过后才会保存到数据库'
  },
  {
    title: '完成配置',
    description: 'Token配置完成，可以开始使用系统功能'
  }
]

const handleSaveToken = async () => {
  if (!form.value.token.trim()) {
    ElMessage.warning('请输入Token')
    return
  }

  saving.value = true
  try {
    // 临时保存到localStorage，不验证
    localStorage.setItem('api_token', form.value.token)
    ElMessage.success('请进行Token验证')
    currentStep.value = 1
  } catch (error) {
    ElMessage.error('保存失败：' + error.message)
  } finally {
    saving.value = false
  }
}

const handleVerify = async () => {
  verifying.value = true
  verificationResult.value = null

  try {
    const result = await api.verifyToken(form.value.token)
    if (result.success) {
      // 验证通过，保存到数据库
      const saveResult = await api.saveToken(form.value.token)
      if (saveResult.success) {
        verificationResult.value = {
          success: true,
          message: '接口验证成功！Token已保存到数据库'
        }
        ElMessage.success('Token验证通过')
        setTimeout(() => {
          currentStep.value = 2
        }, 1500)
      } else {
        ElMessage.error('保存到数据库失败：' + (saveResult.message || '未知错误'))
      }
    } else {
      verificationResult.value = {
        success: false,
        message: result.message || '接口验证失败，请检查Token是否正确'
      }
      ElMessage.error(result.message || '接口验证失败')
    }
  } catch (error) {
    let errorMessage = '接口验证失败'
    if (error.message.includes('401') || error.message.includes('Token无效')) {
      errorMessage = 'API Token无效或已过期，请检查Token是否正确'
    } else if (error.message.includes('网络错误') || error.message.includes('timeout')) {
      errorMessage = '网络错误，请检查网络连接'
    } else if (error.message) {
      errorMessage = '接口验证失败：' + error.message
    }

    verificationResult.value = {
      success: false,
      message: errorMessage
    }
    ElMessage.error(errorMessage)
  } finally {
    verifying.value = false
  }
}

const handlePrevStep = () => {
  verificationResult.value = null
  currentStep.value = 0
}

const handleComplete = () => {
  router.push('/stats')
}
</script>

<style scoped>
.onboarding-page {
  min-height: calc(100vh - 70px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.onboarding-container {
  width: 100%;
  max-width: 600px;
}

.onboarding-card {
  border-radius: 12px;
  border: 1px solid rgba(77, 103, 130, 0.12);
  box-shadow: 0 2px 12px rgba(77, 103, 130, 0.08);
}

.card-header {
  display: flex;
  align-items: center;
  font-weight: 600;
  font-size: 18px;
  color: #4D6782;
  background: rgba(77, 103, 130, 0.05);
  padding: 16px;
  border-bottom: 1px solid rgba(77, 103, 130, 0.12);
}

.card-header .el-icon {
  margin-right: 10px;
  font-size: 20px;
  color: #4D6782;
}

.step-indicator {
  padding: 20px 16px;
}

.step-content {
  padding: 16px;
}

.step-1 .el-form-item:last-child {
  display: flex !important;
  justify-content: flex-end !important;
}

.step-2-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.left-actions {
  display: flex;
  justify-content: flex-start;
}

.right-actions {
  display: flex;
  justify-content: flex-end;
}

.verification-content {
  text-align: right !important;
}

.el-result__extra {
  display: flex;
  justify-content: flex-end;
}

.step-description {
  font-size: 16px;
  color: #5A5A5A;
  margin-bottom: 20px;
  text-align: center;
}

.token-guide {
  margin-bottom: 24px;
  border-radius: 8px;
  background: rgba(77, 103, 130, 0.04);
  border: 1px solid rgba(77, 103, 130, 0.15);
}

.token-guide :deep(.el-alert__title) {
  color: #4D6782;
  font-weight: 600;
  font-size: 15px;
}

.token-guide :deep(.el-alert__icon) {
  color: #4D6782;
}

.token-steps {
  line-height: 1.6;
  color: #5A5A5A;
}

.token-steps p {
  margin: 8px 0;
  font-size: 14px;
}

.token-steps a {
  color: #4D6782;
  text-decoration: none;
  font-weight: 500;
}

.token-steps a:hover {
  text-decoration: underline;
}

.token-input {
  font-family: 'Courier New', monospace;
}

.token-input :deep(.el-textarea__inner) {
  background: #F5F5F5;
  border: 1px solid #D0D0D0;
  color: #5A5A5A;
  border-radius: 8px;
  transition: all 0.2s ease;
  font-size: 14px;
  line-height: 1.6;
}

.token-input :deep(.el-textarea__inner):focus {
  border-color: #9DB4C0;
  box-shadow: 0 0 0 2px rgba(157, 180, 192, 0.1);
  outline: none;
}

.action-button {
  height: 44px;
  padding: 0 24px;
  font-size: 15px;
  border-radius: 8px;
  background: #4D6782;
  border: none;
  color: #FFFFFF;
  font-weight: 500;
  margin-left: auto !important;
}

.action-button:hover {
  background: #3d5568;
}

.left-actions .el-button {
  height: 44px;
  padding: 0 24px;
  font-size: 15px;
  border-radius: 8px;
  background: #FFFFFF;
  border: 1px solid #b8a99a;
  color: #8b7b6f;
  font-weight: 500;
}

.left-actions .el-button:hover {
  background: rgba(184, 169, 154, 0.1);
  border-color: #a89988;
  color: #7a6b5f;
}

.verification-content {
  text-align: center;
}

.verification-result {
  margin-top: 20px;
}
</style>
