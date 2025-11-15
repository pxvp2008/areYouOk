<template>
  <div class="settings-page">

    <el-card class="settings-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <el-icon><Setting /></el-icon>
          <span>API Token 配置</span>
        </div>
      </template>
      
      <el-form :model="form" label-position="top">
        <el-form-item label="API Token">
          <el-input
            v-model="form.token"
            type="textarea"
            :rows="6"
            placeholder="请输入智谱AI的API Token"
            class="token-input"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="saveToken" :loading="saving" class="action-button">
            <el-icon><Check /></el-icon>
            保存 Token
          </el-button>
          <el-button @click="loadToken" :loading="loadingToken" class="action-button">
            <el-icon><Refresh /></el-icon>
            读取 Token
          </el-button>
          <el-button @click="verifyToken" :loading="verifying" class="action-button">
            <el-icon><Connection /></el-icon>
            验证 Token
          </el-button>
        </el-form-item>

        <div v-if="verificationResult" class="verification-result">
          <el-alert
            :type="verificationResult.success ? 'success' : 'error'"
            :title="verificationResult.message"
            :closable="false"
            show-icon
          />
        </div>
      </el-form>
    </el-card>
    
    <el-card class="settings-card info-card" shadow="never">
      <template #header>
        <div class="card-header">
          <el-icon><InfoFilled /></el-icon>
          <span>使用说明</span>
        </div>
      </template>
      
      <div class="instructions">
        <div class="instruction-item">
          <el-icon class="instruction-icon"><Check /></el-icon>
          <span>访问智谱AI控制台：<a style="color: #4D6782;" href="https://bigmodel.cn/console/overview">https://bigmodel.cn/console/overview</a></span>
        </div>
        <div class="instruction-item">
          <el-icon class="instruction-icon"><Check /></el-icon>
          <span>以Chrome浏览器为例：F12 打开【开发者工具】，点击【网络】，希选 IFetch/XHR】</span>
        </div>
        <div class="instruction-item">
          <el-icon class="instruction-icon"><Check /></el-icon>
          <span>刷新页面，点击一条请求</span>
        </div>
        <div class="instruction-item">
          <el-icon class="instruction-icon"><Check /></el-icon>
          <span>在【标头】中找到 【Authorization]</span>
        </div>
        <div class="instruction-item">
          <el-icon class="instruction-icon"><Check /></el-icon>
          <span>将【Authorization】对应的一长串值，复制到API Token文本框中，点击【验证Token】，没问题后点击保存</span>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Setting, Check, Refresh, InfoFilled, Connection } from '@element-plus/icons-vue'
import api from '@/api'

const form = ref({
  token: ''
})

const saving = ref(false)
const verifying = ref(false)
const loadingToken = ref(false)
const verificationResult = ref(null)

const saveToken = async () => {
  if (!form.value.token.trim()) {
    ElMessage.warning('请输入 Token')
    return
  }

  saving.value = true
  try {
    const result = await api.saveToken(form.value.token)
    if (result.success) {
      ElMessage.success('Token 保存成功')
    } else {
      ElMessage.error(result.message || '保存失败')
    }
  } catch (error) {
    ElMessage.error('保存失败：' + error.message)
  } finally {
    saving.value = false
  }
}

const loadToken = async () => {
  loadingToken.value = true
  try {
    const result = await api.getToken()
    if (result.success && result.data) {
      form.value.token = result.data.token
    } else {
      ElMessage.info('未找到已保存的 Token')
    }
  } catch (error) {
    ElMessage.error('读取Token失败：' + error.message)
  } finally {
    loadingToken.value = false
  }
}

const verifyToken = async () => {
  if (!form.value.token.trim()) {
    ElMessage.warning('请输入 Token')
    return
  }

  verifying.value = true
  verificationResult.value = null

  try {
    // 使用专门的验证接口
    const result = await api.verifyToken(form.value.token)

    if (result.success) {
      verificationResult.value = {
        success: true,
        message: 'Token验证成功！接口可正常访问'
      }
      ElMessage.success('Token验证成功')
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

onMounted(() => {
  loadToken()
})
</script>

<style scoped>
.settings-page {
  animation: fadeIn 0.3s ease;
}

.page-header {
  text-align: center;
  margin-bottom: 24px;
}

.page-header h2 {
  font-size: 42px;
  font-weight: 700;
  color: #4D6782;
  margin: 0 0 15px 0;
}

.page-header p {
  font-size: 16px;
  color: #8E8E8E;
  margin: 0;
  letter-spacing: 0.5px;
}

.settings-card {
  background: #FFFFFF;
  border: 1px solid rgba(77, 103, 130, 0.12);
  border-radius: 8px;
  margin-bottom: 24px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.settings-card:hover {
  border-color: rgba(77, 103, 130, 0.2);
  box-shadow: 0 2px 8px rgba(77, 103, 130, 0.1);
}

.card-header {
  display: flex;
  align-items: center;
  font-weight: 600;
  font-size: 18px;
  color: #4D6782;
  background: rgba(77, 103, 130, 0.05);
  padding: 20px;
  border-bottom: 1px solid rgba(77, 103, 130, 0.12);
}

.card-header .el-icon {
  margin-right: 10px;
  font-size: 20px;
  color: #4D6782;
}

.token-input {
  font-family: 'Courier New', monospace;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.token-input :deep(.el-textarea) {
  width: 100%;
  max-width: 100%;
}

.token-input :deep(.el-textarea__inner) {
  background: #F5F5F5;
  border: 1px solid #D0D0D0;
  color: #5A5A5A;
  border-radius: 8px;
  transition: all 0.2s ease;
  font-size: 14px;
  line-height: 1.6;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
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
  transition: all 0.2s ease;
  font-weight: 500;
}

.action-button:not(:last-child) {
  margin-right: 12px;
  background: #4D6782;
  border: none;
  color: #FFFFFF;
  font-weight: 500;
}

.action-button:not(:last-child):hover {
  background: #3d5568;
  box-shadow: 0 1px 4px rgba(77, 103, 130, 0.15);
}

.action-button:not(:nth-child(3)) {
  margin-right: 12px;
  background: #4D6782;
  border: none;
  color: #FFFFFF;
  font-weight: 500;
}

.action-button:not(:nth-child(3)):hover {
  background: #3d5568;
  box-shadow: 0 1px 4px rgba(77, 103, 130, 0.15);
}

/* 第三个按钮（读取Token）样式 */
.action-button:nth-child(2) {
  background: #FFFFFF;
  border: 1px solid #b8a99a;
  color: #8b7b6f;
  font-weight: 500;
}

.action-button:nth-child(2):hover {
  background: rgba(184, 169, 154, 0.1);
  border-color: #a89988;
  color: #7a6b5f;
}

/* 第三个按钮（验证Token）样式 - 与读取按钮保持一致 */
.action-button:nth-child(3) {
  margin-left: 12px !important;
  background: #FFFFFF !important;
  border: 1px solid #b8a99a !important;
  color: #8b7b6f !important;
  font-weight: 500 !important;
}

.action-button:nth-child(3):hover {
  background: rgba(184, 169, 154, 0.1) !important;
  border-color: #a89988 !important;
  color: #7a6b5f !important;
}

.info-card {
  background: rgba(184, 169, 154, 0.08);
  border: 1px solid rgba(184, 169, 154, 0.2);
  border-radius: 12px;
}

.instructions {
  padding: 10px 0;
}

.instruction-item {
  display: flex;
  align-items: center;
  padding: 14px 0;
  color: #5A5A5A;
  font-size: 15px;
  transition: all 0.2s ease;
}

.instruction-item:hover {
  color: #b8a99a;
}

.instruction-icon {
  margin-right: 12px;
  color: #b8a99a;
  font-size: 18px;
  flex-shrink: 0;
}

.verification-result {
  margin-top: 16px;
  animation: fadeIn 0.3s ease;
}

.verification-result :deep(.el-alert) {
  border-radius: 8px;
  border: none;
}

/* 成功提示 - 莫兰迪绿色系 */
.verification-result :deep(.el-alert--success) {
  background: rgba(168, 198, 134, 0.2) !important;
  color: #5A5A5A !important;
  border: 1px solid rgba(168, 198, 134, 0.5) !important;
}

.verification-result :deep(.el-alert--success .el-alert__description) {
  color: #5A5A5A !important;
}

.verification-result :deep(.el-alert--success .el-alert__icon) {
  color: #8FB996 !important;
}

/* 错误提示 - 红色系（更明显） */
.verification-result :deep(.el-alert--error) {
  background: rgba(200, 120, 120, 0.15) !important;
  color: #5A5A5A !important;
  border: 1px solid rgba(200, 120, 120, 0.4) !important;
}

.verification-result :deep(.el-alert--error .el-alert__description) {
  color: #5A5A5A !important;
}

.verification-result :deep(.el-alert--error .el-alert__icon) {
  color: #C87878 !important;
}
</style>
