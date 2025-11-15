<template>
  <div class="sync-page">

    <el-card class="sync-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <el-icon><Refresh /></el-icon>
          <span>数据同步</span>
        </div>
      </template>

      <el-tabs v-model="activeTab" class="sync-tabs" @tab-change="handleTabChange">
        <!-- 增量同步 -->
        <el-tab-pane label="增量同步" name="incremental">
          <div>
            <div class="description">
              <el-alert
                type="info"
                :closable="false"
                show-icon
                class="description-alert"
              >
                <template #title>
                  <div class="alert-content">
                    <span>增量同步仅获取比本地数据库更新的数据，适用于日常数据更新</span>
                  </div>
                </template>
              </el-alert>
            </div>

            <div class="sync-form">
              <el-form label-position="top">
                <el-form-item>
                  <div class="sync-config-row">
                    <!-- 当前月份显示 -->
                    <div class="current-month-display">
                      <el-icon class="calendar-icon"><Calendar /></el-icon>
                      <span class="month-text">{{ getCurrentMonth() }}</span>
                      <el-tag type="info" size="small" effect="plain">同步月份</el-tag>
                    </div>

                    <!-- 自动同步配置 -->
                    <div class="auto-sync-config-compact">
                      <div class="auto-sync-switch">
                        <span class="config-label">
                          <el-icon><Switch /></el-icon>
                          启用自动同步
                        </span>
                        <el-switch
                          v-model="autoSyncConfig.enabled"
                          :loading="autoSyncLoading"
                          @change="handleAutoSyncToggle"
                        />
                      </div>

                      <div v-if="autoSyncConfig.enabled" class="auto-sync-frequency">
                        <span class="frequency-label">同步频率</span>
                        <el-select
                          v-model="autoSyncConfig.frequency_seconds"
                          @change="handleFrequencyChange"
                          :loading="autoSyncLoading"
                          class="frequency-select-compact"
                          size="small"
                        >
                          <el-option :value="5" label="5秒" />
                          <el-option :value="10" label="10秒" />
                          <el-option :value="60" label="1分钟" />
                          <el-option :value="300" label="5分钟" />
                        </el-select>
                      </div>

                      <div v-if="autoSyncConfig.enabled" class="auto-sync-status">
                        <el-tag
                          :type="autoSyncConfig.enabled ? 'success' : 'info'"
                          size="small"
                          effect="plain"
                        >
                          <el-icon v-if="autoSyncConfig.enabled">
                            <Loading class="rotating" />
                          </el-icon>
                          {{ autoSyncConfig.enabled ? '自动同步中' : '已停止' }}
                        </el-tag>
                      </div>
                    </div>
                  </div>
                </el-form-item>

                <el-form-item>
                  <el-button
                    type="primary"
                    @click="handleIncrementalSync"
                    :loading="incrementalSyncing"
                    :disabled="incrementalSyncing"
                    class="sync-button"
                  >
                    <el-icon v-if="!incrementalSyncing"><Upload /></el-icon>
                    {{ incrementalSyncing ? '同步中...' : '开始增量同步' }}
                  </el-button>
                </el-form-item>
              </el-form>
            </div>

            <el-alert
              v-if="incrementalSyncing"
              type="info"
              :closable="false"
              show-icon
              class="sync-alert"
            >
              <template #title>
                <div class="sync-alert-content">
                  <el-icon class="rotating"><Loading /></el-icon>
                  <span>正在同步数据，请稍候...</span>
                </div>
              </template>
            </el-alert>

            <!-- 增量同步历史记录 -->
            <div class="history-section">
              <div class="history-header">
                <div class="history-title">
                  <el-icon><Clock /></el-icon>
                  <span>同步历史记录</span>
                </div>
                <el-button
                  type="text"
                  :loading="refreshingIncremental"
                  @click="handleRefreshIncrementalHistory"
                  class="refresh-button"
                  :disabled="refreshingIncremental"
                >
                  <el-icon><Refresh /></el-icon>
                </el-button>
              </div>
              <el-table
                :data="incrementalHistory"
                style="width: 100%"
                size="small"
                :empty-text="'暂无历史记录'"
                v-if="true"
              >
                <el-table-column prop="sync_time" label="同步时间" width="180">
                  <template #default="scope">
                    {{ dayjs(scope.row.sync_time).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss') }}
                  </template>
                </el-table-column>
                <el-table-column prop="billing_month" label="账单月份" width="120" />
                <el-table-column prop="status" label="状态" width="100">
                  <template #default="scope">
                    <el-tag :type="scope.row.status === '成功' ? 'success' : 'danger'" size="small">
                      {{ scope.row.status }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="synced_count" label="成功数量" width="100" />
                <el-table-column prop="failed_count" label="失败数量" width="100" />
                <el-table-column prop="total_count" label="总数量" width="100" />
                <el-table-column prop="message" label="消息" />
              </el-table>

              <!-- 分页 -->
              <div class="pagination-container">
                <el-pagination
                  v-model:current-page="incrementalHistoryPagination.currentPage"
                  v-model:page-size="incrementalHistoryPagination.pageSize"
                  :page-sizes="[10, 20, 50, 100]"
                  :total="incrementalHistoryPagination.total"
                  layout="total, sizes, prev, pager, next, jumper"
                  @size-change="handleIncrementalHistorySizeChange"
                  @current-change="handleIncrementalHistoryPageChange"
                />
              </div>
            </div>
          </div>
        </el-tab-pane>

        <!-- 全量同步 -->
        <el-tab-pane label="全量同步" name="full">
          <div>
            <div class="description">
              <el-alert
                type="warning"
                :closable="false"
                show-icon
                class="description-alert"
              >
                <template #title>
                  <div class="alert-content">
                    <span>全量同步将清空现有数据并重新同步，风险较高！请确认您已备份重要数据。</span>
                  </div>
                </template>
              </el-alert>
            </div>

            <div class="sync-form">
              <el-form :model="fullForm" label-position="top">
                <el-form-item label="账单月份">
                  <el-date-picker
                    v-model="fullForm.billingMonth"
                    type="month"
                    placeholder="选择月份"
                    format="YYYY-MM"
                    value-format="YYYY-MM"
                    class="month-picker"
                  />
                </el-form-item>

                <el-form-item>
                  <el-button
                    type="primary"
                    @click="handleFullSync"
                    :loading="fullSyncing"
                    :disabled="fullSyncing"
                    class="sync-button full-sync-button"
                  >
                    <el-icon v-if="!fullSyncing"><Upload /></el-icon>
                    {{ fullSyncing ? '同步中...' : '开始全量同步' }}
                  </el-button>
                </el-form-item>
              </el-form>
            </div>

            <!-- 进度条 - 仅全量同步时显示 -->
            <div v-if="fullSyncing" class="progress-container">
              <div class="progress-header">
                <span class="progress-stage">{{ getStageText(progress.stage) }}</span>
                <span class="progress-percentage">
                  {{ progress.total > 0 && progress.current > 0 ? Math.floor((progress.current / progress.total) * 100) : progress.percentage }}%
                </span>
              </div>
              <el-progress
                :percentage="progress.total > 0 ? Math.floor((progress.current / progress.total) * 100) : progress.percentage"
                :stroke-width="10"
                color="#4D6782"
                :show-text="false"
              />
              <div class="progress-details">
                <span v-if="progress.total > 0">
                  {{ progress.current }} / {{ progress.total }} 条记录 ({{ progress.current > 0 && progress.total > 0 ? Math.floor((progress.current / progress.total) * 100) : progress.percentage }}%)
                </span>
                <span v-else>
                  {{ progress.percentage }}%
                </span>
              </div>
            </div>

            <!-- 全量同步历史记录 -->
            <div class="history-section full-sync-history">
              <div class="history-header full-sync-header">
                <div class="history-title">
                  <el-icon><Clock /></el-icon>
                  <span>同步历史记录</span>
                </div>
                <el-button
                  type="text"
                  :loading="refreshingFull"
                  @click="handleRefreshFullHistory"
                  class="refresh-button"
                  :disabled="refreshingFull"
                >
                  <el-icon><Refresh /></el-icon>
                </el-button>
              </div>
              <el-table
                :data="fullHistory"
                style="width: 100%"
                size="small"
                :empty-text="'暂无历史记录'"
                v-if="true"
                class="full-sync-table"
              >
                <el-table-column prop="sync_time" label="同步时间" width="180">
                  <template #default="scope">
                    {{ dayjs(scope.row.sync_time).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss') }}
                  </template>
                </el-table-column>
                <el-table-column prop="billing_month" label="账单月份" width="120" />
                <el-table-column prop="status" label="状态" width="100">
                  <template #default="scope">
                    <el-tag :type="scope.row.status === '成功' ? 'success' : 'danger'" size="small">
                      {{ scope.row.status }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="synced_count" label="成功数量" width="100" />
                <el-table-column prop="failed_count" label="失败数量" width="100" />
                <el-table-column prop="total_count" label="总数量" width="100" />
                <el-table-column prop="message" label="消息" />
              </el-table>

              <!-- 分页 -->
              <div class="pagination-container">
                <el-pagination
                  v-model:current-page="fullHistoryPagination.currentPage"
                  v-model:page-size="fullHistoryPagination.pageSize"
                  :page-sizes="[10, 20, 50, 100]"
                  :total="fullHistoryPagination.total"
                  layout="total, sizes, prev, pager, next, jumper"
                  @size-change="handleFullHistorySizeChange"
                  @current-change="handleFullHistoryPageChange"
                />
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

  </div>
</template>

<script setup>
import { ref, onMounted, onActivated, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Upload, Loading, WarningFilled, Clock, Calendar, Switch, Timer } from '@element-plus/icons-vue'
import api from '@/api'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

// 扩展 dayjs
dayjs.extend(utc)
dayjs.extend(timezone)

// 设置默认时区
dayjs.tz.setDefault('Asia/Shanghai')

const activeTab = ref('incremental')

// 全量同步表单
const fullForm = ref({
  billingMonth: ''
})

// 自动同步配置
const autoSyncConfig = ref({
  enabled: false,
  frequency_seconds: 10,
  next_sync_time: null
})
const autoSyncLoading = ref(false)

// 状态
const incrementalSyncing = ref(false)
const fullSyncing = ref(false)
const refreshingIncremental = ref(false)
const refreshingFull = ref(false)
const progress = ref({
  percentage: 0,
  current: 0,
  total: 0,
  stage: 'idle'
})
let progressTimer = null

// 同步历史记录
const incrementalHistory = ref([])
const fullHistory = ref([])

// 增量同步分页数据
const incrementalHistoryPagination = ref({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

// 全量同步分页数据
const fullHistoryPagination = ref({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

// 增量同步
const handleIncrementalSync = async () => {
  // 检查数据库中是否有配置Token
  try {
    const tokenResult = await api.getToken()
    if (!tokenResult.success || !tokenResult.data || !tokenResult.data.token) {
      ElMessage.error('请先在设置页面配置 API Token')
      return
    }
  } catch (error) {
    ElMessage.error('检查 Token 配置失败')
    return
  }

  // 检查是否有基础数据
  try {
    const countResult = await api.getBillsCount()
    if (!countResult.success) {
      throw new Error(countResult.message || '校验失败')
    }

    const { total, hasData } = countResult.data

    if (!hasData) {
      ElMessage.warning({
        message: '无法进行增量同步：系统中暂无账单数据\n\n请先进行一次"全量同步"来获取基础数据',
        duration: 5000
      })
      return
    }
  } catch (error) {
    ElMessage.error('检查数据失败：' + error.message)
    return
  }

  incrementalSyncing.value = true

  try {
    const result = await api.syncBills(getCurrentMonth(), 'incremental')

    if (result.success) {
      ElMessage.success(result.message || '增量数据同步完成')
    } else {
      ElMessage.error(result.message || '同步失败')
    }

    // 重新加载历史记录（后端已自动保存）
    loadSyncHistory()
  } catch (error) {
    incrementalSyncing.value = false
    ElMessage.error('同步失败：' + error.message)
  } finally {
    incrementalSyncing.value = false
  }
}

// 全量同步
const handleFullSync = async () => {
  if (!fullForm.value.billingMonth) {
    ElMessage.warning('请选择账单月份')
    return
  }

  // 检查数据库中是否有配置Token
  try {
    const tokenResult = await api.getToken()
    if (!tokenResult.success || !tokenResult.data || !tokenResult.data.token) {
      ElMessage.error('请先在设置页面配置 API Token')
      return
    }
  } catch (error) {
    ElMessage.error('检查 Token 配置失败')
    return
  }

  // 先检查是否已经有同步在进行
  const statusResult = await api.getSyncStatus()
  if (statusResult.success && statusResult.data.syncing) {
    // 已经有同步在进行，恢复前端状态
    ElMessage.info('检测到已有同步正在进行，已恢复同步状态')
    fullSyncing.value = true
    if (statusResult.data.progress) {
      progress.value = statusResult.data.progress
    }
    if (!progressTimer) {
      startProgressPolling()
    }
    return
  }

  try {
    await ElMessageBox.confirm(
      '全量同步将清空现有数据并重新同步，风险较高！\n请确认您已备份重要数据。',
      '全量同步确认',
      {
        confirmButtonText: '确认执行',
        cancelButtonText: '取消',
        type: 'warning',
        center: true,
        customClass: 'full-sync-confirm-dialog',
        confirmButtonClass: 'confirm-danger-btn',
        cancelButtonClass: 'cancel-btn'
      }
    )
  } catch {
    ElMessage.info('已取消同步')
    return
  }

  fullSyncing.value = true
  progress.value = {
    percentage: 0,
    current: 0,
    total: 0,
    stage: 'idle'
  }

  startProgressPolling()

  try {
    const result = await api.syncBills(fullForm.value.billingMonth, 'full')

    if (!result.success) {
      fullSyncing.value = false
      stopProgressPolling()
      ElMessage.error(result.message || '同步失败')
    }
  } catch (error) {
    fullSyncing.value = false
    stopProgressPolling()
    ElMessage.error('同步失败：' + error.message)
  }
}

// 开始轮询同步进度
const startProgressPolling = () => {
  progressTimer = setInterval(async () => {
    try {
      const result = await api.getSyncStatus()
      if (result.success) {
        if (result.data.progress) {
          progress.value = result.data.progress
        }

        if (!result.data.syncing) {
          fullSyncing.value = false
          stopProgressPolling()

          if (result.data.result) {
            if (result.data.result.success) {
              ElMessage.success('数据同步完成')
            } else {
              ElMessage.error('同步失败：' + (result.data.result.message || '未知错误'))
            }

            // 重新加载历史记录（后端已自动保存）
            loadSyncHistory()
          }
        }
      }
    } catch (error) {
      console.error('获取同步进度失败：', error)
    }
  }, 1000)
}

// 停止轮询同步进度
const stopProgressPolling = () => {
  if (progressTimer) {
    clearInterval(progressTimer)
    progressTimer = null
  }
}

// 获取阶段文本
const getStageText = (stage) => {
  const stageMap = {
    'idle': '等待中',
    'clearing': '正在清空数据',
    'fetching': '正在获取数据',
    'saving': '正在保存数据',
    'completed': '同步完成'
  }
  return stageMap[stage] || '处理中'
}

// 加载同步历史记录
const loadSyncHistory = async () => {
  try {
    // 加载增量同步历史
    await loadIncrementalHistory()

    // 加载全量同步历史
    await loadFullHistory()
  } catch (error) {
    console.error('加载同步历史失败:', error)
  }
}

// 加载增量同步历史记录（分页）
const loadIncrementalHistory = async () => {
  try {
    const { currentPage, pageSize } = incrementalHistoryPagination.value
    const result = await api.getSyncHistory('incremental', pageSize, currentPage)
    if (result.success) {
      incrementalHistory.value = result.data
      // 如果后端返回总数，更新分页信息
      if (result.total !== undefined) {
        incrementalHistoryPagination.value.total = result.total
      }
    }
  } catch (error) {
    console.error('加载增量同步历史失败:', error)
  }
}

// 加载全量同步历史记录（分页）
const loadFullHistory = async () => {
  try {
    const { currentPage, pageSize } = fullHistoryPagination.value
    const result = await api.getSyncHistory('full', pageSize, currentPage)
    if (result.success) {
      fullHistory.value = result.data
      // 如果后端返回总数，更新分页信息
      if (result.total !== undefined) {
        fullHistoryPagination.value.total = result.total
      }
    }
  } catch (error) {
    console.error('加载全量同步历史失败:', error)
  }
}

// 处理全量同步分页变化
const handleFullHistoryPageChange = (page) => {
  fullHistoryPagination.value.currentPage = page
  loadFullHistory()
}

// 处理全量同步每页显示数量变化
const handleFullHistorySizeChange = (size) => {
  fullHistoryPagination.value.pageSize = size
  fullHistoryPagination.value.currentPage = 1 // 重置到第一页
  loadFullHistory()
}

// 处理增量同步分页变化
const handleIncrementalHistoryPageChange = (page) => {
  incrementalHistoryPagination.value.currentPage = page
  loadIncrementalHistory()
}

// 处理增量同步每页显示数量变化
const handleIncrementalHistorySizeChange = (size) => {
  incrementalHistoryPagination.value.pageSize = size
  incrementalHistoryPagination.value.currentPage = 1 // 重置到第一页
  loadIncrementalHistory()
}

// 刷新增量同步历史记录
const handleRefreshIncrementalHistory = async () => {
  refreshingIncremental.value = true
  try {
    await loadIncrementalHistory()
    ElMessage.success('历史记录已刷新')
  } catch (error) {
    ElMessage.error('刷新失败：' + error.message)
  } finally {
    refreshingIncremental.value = false
  }
}

// 刷新全量同步历史记录
const handleRefreshFullHistory = async () => {
  refreshingFull.value = true
  try {
    await loadFullHistory()
    ElMessage.success('历史记录已刷新')
  } catch (error) {
    ElMessage.error('刷新失败：' + error.message)
  } finally {
    refreshingFull.value = false
  }
}

// 获取当前月份
const getCurrentMonth = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// 格式化时间
const formatTime = (timeStr) => {
  if (!timeStr) return '--'
  // 后端已返回本地时间格式，直接使用
  return timeStr
}

// 加载自动同步配置
const loadAutoSyncConfig = async () => {
  try {
    const result = await api.getAutoSyncConfig()
    if (result.success) {
      autoSyncConfig.value = {
        ...result.data
      }
    }
  } catch (error) {
    console.error('加载自动同步配置失败:', error)
  }
}

// 处理自动同步开关
const handleAutoSyncToggle = async (enabled) => {
  if (!enabled) {
    // 关闭自动同步
    try {
      autoSyncLoading.value = true
      const result = await api.stopAutoSync()
      if (result.success) {
        autoSyncConfig.value.enabled = false
        autoSyncConfig.value.next_sync_time = null
        ElMessage.success('自动同步已停止')
      }
    } catch (error) {
      ElMessage.error('停止自动同步失败：' + error.message)
      autoSyncConfig.value.enabled = true // 恢复状态
    } finally {
      autoSyncLoading.value = false
    }
  } else {
    // 开启自动同步 - 需要校验是否有基础数据
    autoSyncLoading.value = true

    try {
      // 1. 检查是否有基础数据
      const countResult = await api.getBillsCount()
      if (!countResult.success) {
        throw new Error(countResult.message || '校验失败')
      }

      const { total, hasData } = countResult.data

      // 2. 如果没有数据，阻止开启并提示
      if (!hasData) {
        autoSyncConfig.value.enabled = false // 恢复状态
        ElMessage.warning({
          message: '无法开启自动同步：系统中暂无账单数据\n\n请先进行一次"全量同步"或"增量同步"来获取基础数据',
          duration: 5000
        })
        return
      }

      // 3. 有数据，继续开启自动同步
      const result = await api.saveAutoSyncConfig({
        enabled: true,
        frequency_seconds: autoSyncConfig.value.frequency_seconds
      })

      if (result.success) {
        autoSyncConfig.value = {
          ...autoSyncConfig.value,
          ...result.data
        }
        ElMessage.success('自动同步已开启')
      }

    } catch (error) {
      ElMessage.error('开启自动同步失败：' + error.message)
      autoSyncConfig.value.enabled = false // 恢复状态
    } finally {
      autoSyncLoading.value = false
    }
  }
}

// 处理频率变化
const handleFrequencyChange = async (frequency) => {
  if (!autoSyncConfig.value.enabled) return

  try {
    autoSyncLoading.value = true
    const result = await api.saveAutoSyncConfig({
      enabled: true,
      frequency_seconds: frequency
    })
    if (result.success) {
      autoSyncConfig.value.frequency_seconds = frequency
      autoSyncConfig.value = {
        ...autoSyncConfig.value,
        ...result.data
      }
      ElMessage.success('频率已更新')
    }
  } catch (error) {
    ElMessage.error('更新频率失败：' + error.message)
  } finally {
    autoSyncLoading.value = false
  }
}

// 恢复全量同步状态
const restoreFullSyncStatus = async () => {
  try {
    const result = await api.getSyncStatus()
    if (result.success && result.data.syncing) {
      // 后台正在同步，恢复前端状态
      fullSyncing.value = true
      if (result.data.progress) {
        progress.value = result.data.progress
      }
      // 启动轮询
      if (!progressTimer) {
        startProgressPolling()
      }
    }
  } catch (error) {
    console.error('恢复同步状态失败：', error)
  }
}

// 监听标签页切换
const handleTabChange = (tabName) => {
  if (tabName === 'full') {
    // 切换到全量同步tab时，检查是否需要恢复状态
    restoreFullSyncStatus()
  }
}

onMounted(() => {
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  fullForm.value.billingMonth = currentMonth

  // 加载自动同步配置
  loadAutoSyncConfig()


  // 加载同步历史记录
  loadSyncHistory()

  // 页面加载时也检查一次
  restoreFullSyncStatus()
})

onActivated(() => {
  // 页面重新激活时也检查状态
  restoreFullSyncStatus()
})
</script>

<style scoped>
.sync-page {
  animation: fadeIn 0.3s ease;
}

.sync-card {
  background: #FFFFFF;
  border: 1px solid rgba(77, 103, 130, 0.12);
  border-radius: 8px;
  margin-bottom: 24px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.sync-card:hover {
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

.sync-tabs {
  padding: 0 20px;
}

.description {
  margin-bottom: 20px;
}

.description-alert {
  border-radius: 8px;
}

.alert-content {
  display: flex;
  align-items: center;
  color: #5A5A5A;
}

.alert-content .el-icon {
  margin-right: 10px;
  font-size: 18px;
}

.sync-form {
  margin-bottom: 20px;
}

.month-picker {
  width: 100%;
  max-width: 250px;
}

@media (min-width: 768px) {
  .month-picker {
    width: 250px;
  }
}

.month-picker :deep(.el-input__wrapper) {
  background: #F5F5F5;
  border: 1px solid #D0D0D0;
  box-shadow: none;
  width: 100%;
  box-sizing: border-box;
}

.month-picker :deep(.el-input__wrapper):hover,
.month-picker :deep(.el-input__wrapper).is-focus {
  border-color: #9DB4C0;
  box-shadow: 0 0 0 2px rgba(157, 180, 192, 0.1);
}

.current-month-display {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(77, 103, 130, 0.08);
  border: 1px solid rgba(77, 103, 130, 0.2);
  border-radius: 6px;
  font-size: 13px;
  color: #4D6782;
  font-weight: 500;
}

.calendar-icon {
  font-size: 16px;
  color: #4D6782;
}

.month-text {
  font-weight: 600;
  color: #4D6782;
  letter-spacing: 0.3px;
}

/* 同步配置行 - 水平布局 */
.sync-config-row {
  display: flex;
  gap: 16px;
  align-items: stretch;
}

/* 自动同步配置 - 紧凑版（与月份显示保持一致的颜色） */
.auto-sync-config-compact {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 12px;
  background: rgba(77, 103, 130, 0.08);  /* 与 current-month-display 保持一致 */
  border: 1px solid rgba(77, 103, 130, 0.2);  /* 与 current-month-display 保持一致 */
  border-radius: 6px;
  min-height: 32px;
  flex: 1;
}

.auto-sync-switch {
  display: flex;
  align-items: center;
  gap: 8px;
}

.auto-sync-frequency {
  display: flex;
  align-items: center;
  gap: 8px;
}

.auto-sync-status {
  display: flex;
  align-items: center;
  margin-left: 8px;
}

/* 配置标签 - 紧凑版 */
.config-label {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #4D6782;
  font-weight: 500;
  padding: 0;
}

.config-label .el-icon {
  margin-right: 6px;
  font-size: 14px;
  color: #4D6782;
}

/* 频率标签 */
.frequency-label {
  font-size: 12px;
  color: #4D6782;
  font-weight: 500;
  white-space: nowrap;
}

.frequency-select-compact {
  width: 120px;
}

.frequency-select-compact :deep(.el-input__wrapper) {
  background: #F5F5F5;
  border: 1px solid rgba(77, 103, 130, 0.2);
  border-radius: 6px;
  height: 28px;
  line-height: 28px;
}

.frequency-select-compact :deep(.el-input__inner) {
  height: 26px;
  line-height: 26px;
  font-size: 12px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sync-config-row {
    flex-direction: column;
    gap: 12px;
  }

  .auto-sync-config-compact {
    width: 100%;
  }
}

.sync-button {
  height: 36px;
  padding: 0 20px;
  font-size: 14px;
  border-radius: 6px;
  transition: all 0.2s ease;
  background: #4D6782;
  border: none;
  color: #FFFFFF;
  font-weight: 500;
}

.sync-button:hover {
  background: #3d5568;
  box-shadow: 0 1px 4px rgba(77, 103, 130, 0.15);
}

.full-sync-button {
  background: #C57272;
  border: none;
}

.full-sync-button:hover {
  background: #B55A5A;
  box-shadow: 0 1px 4px rgba(197, 114, 114, 0.25);
}

.sync-alert {
  background: rgba(77, 103, 130, 0.08);
  border-color: rgba(77, 103, 130, 0.2);
  border-radius: 12px;
  margin-bottom: 20px;
}

.progress-container {
  margin: 20px 0;
  padding: 20px;
  background: #F5F5F5;
  border-radius: 12px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.progress-stage {
  font-size: 15px;
  color: #5A5A5A;
  font-weight: 500;
}

.progress-percentage {
  font-size: 15px;
  color: #4D6782;
  font-weight: 600;
}

.progress-details {
  margin-top: 8px;
  font-size: 13px;
  color: #8E8E8E;
  text-align: center;
}

.sync-alert-content {
  display: flex;
  align-items: center;
  color: #5A5A5A;
}

.rotating {
  animation: rotate 1s linear infinite;
  margin-right: 10px;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.help-card {
  background: rgba(168, 198, 134, 0.08);
  border: 1px solid rgba(168, 198, 134, 0.2);
  border-radius: 12px;
}

.help-card .card-header {
  background: rgba(168, 198, 134, 0.05);
  border-bottom: 1px solid rgba(168, 198, 134, 0.2);
}

.help-content {
  padding: 20px 0;
}

.help-item {
  display: flex;
  align-items: center;
  padding: 14px 0;
  color: #5A5A5A;
  font-size: 15px;
  transition: all 0.2s ease;
}

.help-item:hover {
  color: #A8C686;
  transform: translateX(5px);
}

.help-icon {
  margin-right: 12px;
  color: #A8C686;
  font-size: 18px;
  flex-shrink: 0;
}

/* Tabs样式 */
.sync-tabs :deep(.el-tabs__header) {
  margin: 0 0 20px 0;
}

.sync-tabs :deep(.el-tabs__nav-wrap::after) {
  background-color: rgba(77, 103, 130, 0.12);
}

.sync-tabs :deep(.el-tabs__item) {
  font-size: 16px;
  font-weight: 500;
  color: #8E8E8E;
  padding: 0 30px;
  height: 50px;
  line-height: 50px;
}

.sync-tabs :deep(.el-tabs__item.is-active) {
  color: #4D6782;
}

.sync-tabs :deep(.el-tabs__active-bar) {
  background-color: #4D6782;
}

/* 全量同步确认对话框样式 - 使用:global确保样式在全局作用域生效 */
:global(.el-overlay-dialog.full-sync-confirm-dialog) {
  border-radius: 12px !important;
  padding: 24px 0 !important;
  box-shadow: 0 8px 32px rgba(77, 103, 130, 0.15) !important;
  border: none !important;
}

:global(.full-sync-confirm-dialog .el-message-box__header) {
  background: rgba(184, 169, 154, 0.08) !important;
  border-bottom: 1px solid rgba(184, 169, 154, 0.2) !important;
  padding: 20px 24px 16px 24px !important;
}

:global(.full-sync-confirm-dialog .el-message-box__title) {
  font-size: 18px !important;
  font-weight: 600 !important;
  color: #5A5A5A !important;
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
}

:global(.full-sync-confirm-dialog .el-message-box__content) {
  padding: 28px 24px 24px 24px !important;
}

:global(.full-sync-confirm-dialog .el-message-box__message) {
  color: #5A5A5A !important;
  font-size: 15px !important;
  line-height: 1.7 !important;
  text-align: center !important;
  white-space: pre-line !important;
}

:global(.full-sync-confirm-dialog .el-message-box__btns) {
  padding: 0 24px 24px 24px !important;
  display: flex !important;
  gap: 12px !important;
  justify-content: center !important;
}

:global(.full-sync-confirm-dialog .confirm-danger-btn) {
  background: #D4A5A5 !important;
  border: 1px solid #D4A5A5 !important;
  color: #FFFFFF !important;
  padding: 10px 28px !important;
  font-size: 15px !important;
  font-weight: 500 !important;
  border-radius: 8px !important;
  transition: all 0.2s ease !important;
}

:global(.full-sync-confirm-dialog .confirm-danger-btn:hover) {
  background: #c49494 !important;
  border-color: #c49494 !important;
  box-shadow: 0 2px 8px rgba(212, 165, 165, 0.3) !important;
  transform: translateY(-1px) !important;
}

:global(.full-sync-confirm-dialog .confirm-danger-btn:active) {
  transform: translateY(0) !important;
}

:global(.full-sync-confirm-dialog .cancel-btn) {
  background: #FFFFFF !important;
  border: 1px solid #b8a99a !important;
  color: #8b7b6f !important;
  padding: 10px 28px !important;
  font-size: 15px !important;
  font-weight: 500 !important;
  border-radius: 8px !important;
  transition: all 0.2s ease !important;
}

:global(.full-sync-confirm-dialog .cancel-btn:hover) {
  background: rgba(184, 169, 154, 0.1) !important;
  border-color: #a89988 !important;
  color: #7a6b5f !important;
  transform: translateY(-1px) !important;
}

:global(.full-sync-confirm-dialog .cancel-btn:active) {
  transform: translateY(0) !important;
}

:global(.full-sync-confirm-dialog .el-message-box__status.el-icon-warning) {
  color: #b8a99a !important;
  font-size: 24px !important;
  margin-right: 8px !important;
}

:global(.full-sync-confirm-dialog .el-message-box__headerbtn) {
  top: 18px !important;
  right: 20px !important;
  width: 28px !important;
  height: 28px !important;
  border-radius: 6px !important;
  transition: all 0.2s ease !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

:global(.full-sync-confirm-dialog .el-message-box__headerbtn:hover) {
  background: rgba(184, 169, 154, 0.15) !important;
  transform: rotate(90deg) !important;
}

:global(.full-sync-confirm-dialog .el-message-box__close) {
  color: #b8a99a !important;
  font-size: 16px !important;
  font-weight: 600 !important;
  transition: all 0.2s ease !important;
}

:global(.full-sync-confirm-dialog .el-message-box__headerbtn:hover .el-message-box__close) {
  color: #8b7b6f !important;
  transform: scale(1.1) !important;
}

/* 历史记录区域样式 */
.history-section {
  margin-top: 30px;
  padding: 20px;
  background: rgba(77, 103, 130, 0.05);
  border: 1px solid rgba(77, 103, 130, 0.12);
  border-radius: 8px;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  font-size: 16px;
  color: #4D6782;
  margin-bottom: 16px;
}

.history-title {
  display: flex;
  align-items: center;
}

.history-title .el-icon {
  margin-right: 8px;
  font-size: 18px;
  color: #4D6782;
}

.refresh-button {
  padding: 8px;
  border-radius: 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  background: transparent;
}

.refresh-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(77, 103, 130, 0.08);
  opacity: 0;
  transition: opacity 0.3s ease;
  border-radius: 8px;
}

.refresh-button::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: rgba(77, 103, 130, 0.15);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: width 0.4s ease, height 0.4s ease, opacity 0.3s ease;
  opacity: 0;
}

.refresh-button:hover::before {
  opacity: 1;
}

.refresh-button:hover::after {
  width: 100%;
  height: 100%;
  opacity: 1;
}

.refresh-button:hover {
  box-shadow: 0 2px 8px rgba(77, 103, 130, 0.15);
}

.refresh-button .el-icon {
  font-size: 16px;
  color: #4D6782;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: block;
  position: relative;
  z-index: 1;
}

.refresh-button:hover .el-icon {
  color: #4D6782;
  transform: rotate(180deg) scale(1.1);
  filter: drop-shadow(0 0 2px rgba(77, 103, 130, 0.3));
}

.refresh-button:active::after {
  width: 0;
  height: 0;
  opacity: 0;
}

.refresh-button:active .el-icon {
  transform: rotate(360deg) scale(0.95);
}

.refresh-button:active {
  box-shadow: 0 1px 4px rgba(77, 103, 130, 0.1);
}

.refresh-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.refresh-button:disabled::before,
.refresh-button:disabled::after {
  display: none;
}

.refresh-button:disabled .el-icon {
  animation: none;
  transform: none;
  filter: none;
}

.history-section :deep(.el-table) {
  background: transparent;
}

.history-section :deep(.el-table th) {
  background: rgba(77, 103, 130, 0.08);
  color: #4D6782;
  font-weight: 600;
}

.history-section :deep(.el-table td) {
  background: rgba(255, 255, 255, 0.5);
}

.history-section :deep(.el-table tr:hover > td) {
  background: rgba(77, 103, 130, 0.05);
}

/* 全量同步历史记录 - 红色系样式 */
.full-sync-history {
  background: rgba(197, 114, 114, 0.12);
  border: 1px solid rgba(197, 114, 114, 0.3);
}

.full-sync-header {
  color: #B55A5A;
}

.full-sync-header .el-icon {
  color: #B55A5A;
}

.full-sync-header .refresh-button::before {
  background: rgba(197, 114, 114, 0.08);
}

.full-sync-header .refresh-button::after {
  background: rgba(197, 114, 114, 0.15);
}

.full-sync-header .refresh-button:hover {
  box-shadow: 0 2px 8px rgba(197, 114, 114, 0.2);
}

.full-sync-header .refresh-button .el-icon {
  color: #C57272;
}

.full-sync-header .refresh-button:hover .el-icon {
  color: #C57272;
  filter: drop-shadow(0 0 2px rgba(197, 114, 114, 0.3));
}

.full-sync-header .refresh-button:active {
  box-shadow: 0 1px 4px rgba(197, 114, 114, 0.15);
}

/* 旧的自动同步配置样式已移除，改用新的紧凑版布局 */

.full-sync-table :deep(.el-table th) {
  background: rgba(197, 114, 114, 0.18);
  color: #B55A5A;
  font-weight: 600;
}

.full-sync-table :deep(.el-table td) {
  background: rgba(255, 255, 255, 0.8);
}

.full-sync-table :deep(.el-table tr:hover > td) {
  background: rgba(197, 114, 114, 0.15);
}

/* 增量同步分页样式 - 蓝色系 */
.history-section .pagination-container :deep(.el-pagination) {
  --el-pagination-bg-color: rgba(255, 255, 255, 0.8);
  --el-pagination-text-color: #4D6782;
  --el-pagination-border-radius: 8px;
}

.history-section .pagination-container :deep(.el-pagination .el-pager li) {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(77, 103, 130, 0.2);
  color: #4D6782;
  margin: 0 2px;
  border-radius: 6px;
}

.history-section .pagination-container :deep(.el-pagination .el-pager li:hover) {
  color: #4D6782;
  background: rgba(77, 103, 130, 0.1);
}

.history-section .pagination-container :deep(.el-pagination .el-pager li.is-active) {
  background: #4D6782;
  color: #FFFFFF;
  border-color: #4D6782;
}

.history-section .pagination-container :deep(.el-pagination .btn-prev),
.history-section .pagination-container :deep(.el-pagination .btn-next) {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(77, 103, 130, 0.2);
  color: #4D6782;
  border-radius: 6px;
}

.history-section .pagination-container :deep(.el-pagination .btn-prev:hover),
.history-section .pagination-container :deep(.el-pagination .btn-next:hover) {
  color: #4D6782;
  background: rgba(77, 103, 130, 0.1);
}

.history-section .pagination-container :deep(.el-pagination .el-select .el-input .el-input__inner) {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(77, 103, 130, 0.2);
  color: #4D6782;
  border-radius: 6px;
}

.history-section .pagination-container :deep(.el-pagination .el-input__inner:hover) {
  border-color: rgba(77, 103, 130, 0.4);
}

.history-section .pagination-container :deep(.el-pagination .el-input__inner:focus) {
  border-color: #4D6782;
  box-shadow: 0 0 0 2px rgba(77, 103, 130, 0.1);
}

.history-section .pagination-container :deep(.el-pagination__editor) {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(77, 103, 130, 0.2);
  color: #4D6782;
  border-radius: 6px;
}

/* 全量同步分页样式 */
.pagination-container {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.pagination-container :deep(.el-pagination) {
  --el-pagination-bg-color: rgba(255, 255, 255, 0.8);
  --el-pagination-text-color: #B55A5A;
  --el-pagination-border-radius: 8px;
}

.pagination-container :deep(.el-pagination .el-pager li) {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(197, 114, 114, 0.2);
  color: #B55A5A;
  margin: 0 2px;
  border-radius: 6px;
}

.pagination-container :deep(.el-pagination .el-pager li:hover) {
  color: #B55A5A;
  background: rgba(197, 114, 114, 0.1);
}

.pagination-container :deep(.el-pagination .el-pager li.is-active) {
  background: #C57272;
  color: #FFFFFF;
  border-color: #C57272;
}

.pagination-container :deep(.el-pagination .btn-prev),
.pagination-container :deep(.el-pagination .btn-next) {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(197, 114, 114, 0.2);
  color: #B55A5A;
  border-radius: 6px;
}

.pagination-container :deep(.el-pagination .btn-prev:hover),
.pagination-container :deep(.el-pagination .btn-next:hover) {
  color: #B55A5A;
  background: rgba(197, 114, 114, 0.1);
}

.pagination-container :deep(.el-pagination .el-select .el-input .el-input__inner) {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(197, 114, 114, 0.2);
  color: #B55A5A;
  border-radius: 6px;
}

.pagination-container :deep(.el-pagination .el-input__inner:hover) {
  border-color: rgba(197, 114, 114, 0.4);
}

.pagination-container :deep(.el-pagination .el-input__inner:focus) {
  border-color: #C57272;
  box-shadow: 0 0 0 2px rgba(197, 114, 114, 0.1);
}

.pagination-container :deep(.el-pagination__editor) {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(197, 114, 114, 0.2);
  color: #B55A5A;
  border-radius: 6px;
}
</style>
