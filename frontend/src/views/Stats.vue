<template>
  <div class="stats-page">

    <!-- 近5小时统计 - 重点突出显示 -->
    <div class="stats-period-section-main">
      <el-card class="period-section-card period-main" shadow="hover">
        <template #header>
          <div class="period-header period-main-header">
            <div class="header-left">
              <el-icon class="header-icon-main"><Clock /></el-icon>
              <div class="header-content">
                <span class="header-title-main">近 5 小时使用情况</span>
                <el-tag class="header-tag membership-tag" type="success" effect="plain">
                  {{ currentMembershipTier }}
                </el-tag>
                <el-tooltip
                  v-if="!autoSyncConfig.enabled"
                  content="请在【数据同步】页面启动【启用自动同步】功能"
                  placement="bottom"
                >
                  <el-tag
                    class="header-tag membership-tag status-tag status-tag--danger"
                    type="danger"
                    effect="plain"
                  >
                    自动监控未启动
                  </el-tag>
                </el-tooltip>
                <el-tag
                  v-else
                  class="header-tag membership-tag status-tag"
                  type="success"
                  effect="plain"
                >
                  自动监控中
                  <span v-if="autoSyncConfig.frequencySeconds">
                    · {{ autoSyncConfig.frequencySeconds }}s
                  </span>
                </el-tag>
              </div>
            </div>
            <div class="header-right">
              <el-button
                v-if="!autoSyncConfig.enabled"
                type="primary"
                size="small"
                plain
                @click="handleManualSync"
                :loading="manualSyncing"
                :disabled="manualSyncing"
                class="header-tag membership-tag manual-sync-btn"
              >
                <el-icon v-if="!manualSyncing"><Refresh /></el-icon>
                <el-icon v-else><Loading /></el-icon>
                手动同步账单
              </el-button>
            </div>
          </div>
        </template>

        <!-- 6列2行布局 -->
        <div class="period-stats-grid-main">
          <!-- 第一行：进度条（跨3列）+ 3个指标（各1列） -->
          <el-tooltip
              content="根据官方文档，每次prompt预计可调用模型15-20次，本系统中模型可调用次数计算为：套餐5小时最多的prompts次数*20"
              placement="top"
              :show-after="100"
              :enterable="false"
              popper-class="token-tooltip"
              effect="light"
          >
          <div class="progress-card progress-row">
            <div class="progress-content">
              <div class="progress-header-row">
                <div class="progress-title">
                  <el-icon class="progress-icon"><Odometer /></el-icon>
                  <span>模型调用次数</span>
                </div>
                <div class="progress-percentage" :style="{ color: getProgressColor(apiUsageProgress.percentage) }">
                  {{ apiUsageProgress.percentage }}%
                </div>
              </div>
              <el-progress
                :percentage="apiUsageProgress.percentage"
                :color="getProgressColor(apiUsageProgress.percentage)"
                :stroke-width="12"
                :show-text="false"
                :duration=getProgressDuration(apiUsageProgress.percentage)
                striped
                striped-flow
              />
              <div class="progress-details-row">
                <span class="progress-text">已使用: {{ apiUsageProgress.used.toLocaleString() }} / {{ apiUsageProgress.limit.toLocaleString() }}</span>
                <span class="progress-text">剩余（估算）: {{ apiUsageProgress.remaining.toLocaleString() }}</span>
              </div>
            </div>
          </div>
            </el-tooltip>

          <div class="stat-card stat-card-main">
            <div class="stat-content">
              <div class="stat-icon-main">
                <el-icon><Message /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-label">调用次数</div>
                <div class="stat-value-main">{{ apiUsageProgress.used.toLocaleString() }}</div>
                <div class="stat-trend" :class="apiUsageProgress.growthRate >= 0 ? 'trend-up' : 'trend-warning'">
                  <el-icon><CaretTop v-if="apiUsageProgress.growthRate >= 0" /><CaretBottom v-else /></el-icon>
                  <span>{{ apiUsageProgress.growthRate >= 0 ? '+' : '' }}{{ apiUsageProgress.growthRate.toFixed(1) }}%</span>
                </div>
              </div>
            </div>
          </div>

          <el-tooltip
          content="不包括命中缓存的Tokens"
          placement="top"
          :show-after="100"
          :enterable="false"
          popper-class="token-tooltip"
          effect="light"
        >
          <div class="stat-card stat-card-main">
            <div class="stat-content">
              <div class="stat-icon-main">
                <el-icon><Coin /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-label">总 Token</div>
                <div class="stat-value-main">{{ tokenUsageProgress.used.toLocaleString() }}</div>
                <div class="stat-trend" :class="tokenUsageProgress.growthRate >= 0 ? 'trend-up' : 'trend-warning'">
                  <el-icon><CaretTop v-if="tokenUsageProgress.growthRate >= 0" /><CaretBottom v-else /></el-icon>
                  <span>{{ tokenUsageProgress.growthRate >= 0 ? '+' : '' }}{{ tokenUsageProgress.growthRate.toFixed(1) }}%</span>
                </div>
              </div>
            </div>
          </div>
        </el-tooltip>

          <div class="stat-card stat-card-main">
            <div class="stat-content">
              <div class="stat-icon-main">
                <el-icon><Money /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-label">累计花费金额</div>
                <div class="stat-value-main">¥{{ totalCostProgress.used.toFixed(2) }}</div>
                <div class="stat-trend" :class="totalCostProgress.growthRate >= 0 ? 'trend-up' : 'trend-warning'">
                  <el-icon><CaretTop v-if="totalCostProgress.growthRate >= 0" /><CaretBottom v-else /></el-icon>
                  <span>{{ totalCostProgress.growthRate >= 0 ? '+' : '' }}{{ totalCostProgress.growthRate.toFixed(1) }}%</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 第二行：每小时图表（跨2列）+ 产品分布图表（跨4列） -->
          <div class="chart-card chart-row">
            <HourlyEChart :data="hourlyData" @chart-click="handleChartClick" />
          </div>

          <div class="chart-card chart-row">
            <ProductPieEChart :data="productData" @chart-click="handleChartClick" />
          </div>
        </div>
      </el-card>
    </div>

    <!-- 其他统计 - 横向排列 -->
    <div class="stats-period-section-others">
      <!-- 近1天 -->
      <div class="stats-period-section-other">
        <el-card class="period-section-card period-other" shadow="hover">
          <template #header>
            <div class="period-header period-other-header">
              <el-icon class="header-icon-other"><Timer /></el-icon>
              <span class="header-title">近 1 天</span>
            </div>
          </template>

          <div class="period-stats-grid-other-4row">
            <!-- 第一行：三个指标卡片 -->
            <StatCardVertical
              label="调用次数"
              :value="formatDayStatsValue(dayStats.callCount, 'call')"
              icon="Message"
            />

            <StatCardVertical
              label="总 Token"
              :value="formatDayStatsValue(dayStats.tokenUsage, 'token')"
              icon="Coin"
            />

            <StatCardVertical
              label="累计花费金额"
              :value="formatDayStatsValue(dayStats.totalCost, 'cost')"
              icon="Money"
            />

            <!-- 第二行：每小时调用次数和 Token 数量 -->
            <div class="chart-card chart-row-other hourly-chart-row">
              <HourlyEChart :data="hourlyDataDay" @chart-click="handleChartClick" />
            </div>

            <!-- 第三行：产品占比 -->
            <div class="chart-card chart-row-other product-pie-row">
              <ProductPieChart :data="productDataDay" @chart-click="handleChartClick" />
            </div>

            <!-- 第四行：产品调用次数 -->
            <div class="chart-card chart-row-other product-bar-row">
              <ProductBarEChart :data="productDataDay" @chart-click="handleChartClick" />
            </div>
          </div>
        </el-card>
      </div>

      <!-- 近1周 -->
      <div class="stats-period-section-other">
        <el-card class="period-section-card period-other" shadow="hover">
          <template #header>
            <div class="period-header period-other-header">
              <el-icon class="header-icon-other"><Calendar /></el-icon>
              <span class="header-title">近 1 周</span>
            </div>
          </template>

          <div class="period-stats-grid-other-4row">
            <!-- 第一行：三个指标卡片 -->
            <StatCardVertical
              label="调用次数"
              :value="formatDayStatsValue(weekStats.callCount, 'call')"
              icon="Message"
            />

            <StatCardVertical
              label="总 Token"
              :value="formatDayStatsValue(weekStats.tokenUsage, 'token')"
              icon="Coin"
            />

            <StatCardVertical
              label="累计花费金额"
              :value="formatDayStatsValue(weekStats.totalCost, 'cost')"
              icon="Money"
            />

            <!-- 第二行：每天调用次数和 Token 数量占3列 -->
            <div class="chart-card chart-row-other weekly-chart-row">
              <HourlyEChart :data="hourlyDataWeek" title="每天调用次数和 Token 数量" @chart-click="handleChartClick" />
            </div>

            <!-- 第三行：产品占比占3列 -->
            <div class="chart-card chart-row-other weekly-pie-row">
              <ProductPieChart :data="productDataWeek" @chart-click="handleChartClick" />
            </div>

            <!-- 第四行：产品调用次数占3列 -->
            <div class="chart-card chart-row-other weekly-bar-row">
              <ProductBarEChart :data="productDataWeek" @chart-click="handleChartClick" />
            </div>
          </div>
        </el-card>
      </div>

      <!-- 近1月 -->
      <div class="stats-period-section-other">
        <el-card class="period-section-card period-other" shadow="hover">
          <template #header>
            <div class="period-header period-other-header">
              <el-icon class="header-icon-other"><DataAnalysis /></el-icon>
              <span class="header-title">近 1 月</span>
            </div>
          </template>

          <div class="period-stats-grid-other-4row">
            <!-- 第一行：三个指标卡片 -->
            <StatCardVertical
              label="调用次数"
              :value="formatDayStatsValue(monthStats.callCount, 'call')"
              icon="Message"
            />

            <StatCardVertical
              label="总 Token"
              :value="formatDayStatsValue(monthStats.tokenUsage, 'token')"
              icon="Coin"
            />

            <StatCardVertical
              label="累计花费金额"
              :value="formatDayStatsValue(monthStats.totalCost, 'cost')"
              icon="Money"
            />

            <!-- 第二行：每天调用次数和 Token 数量占3列 -->
            <div class="chart-card chart-row-other monthly-chart-row">
              <HourlyEChart :data="hourlyDataMonth" title="每天调用次数和 Token 数量" @chart-click="handleChartClick" />
            </div>

            <!-- 第三行：产品占比占3列 -->
            <div class="chart-card chart-row-other monthly-pie-row">
              <ProductPieChart :data="productDataMonth" @chart-click="handleChartClick" />
            </div>

            <!-- 第四行：产品调用次数占3列 -->
            <div class="chart-card chart-row-other monthly-bar-row">
              <ProductBarEChart :data="productDataMonth" @chart-click="handleChartClick" />
            </div>
          </div>
        </el-card>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, shallowRef, onMounted, watch, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  DataAnalysis,
  Message,
  Coin,
  TrendCharts,
  Clock,
  Timer,
  Calendar,
  CaretTop,
  CaretBottom,
  Warning,
  PieChart,
  Money,
  Odometer,
  Refresh,
  Loading,
  Upload
} from '@element-plus/icons-vue'
import api from '@/api'
import {
  createSimpleApiHandler,
  createObjectApiHandler,
  createProductDistributionHandler,
  createTimeSeriesHandler
} from '@/composables/useApiCall'
import HourlyEChart from '@/components/HourlyEChart.vue'
import ProductPieEChart from '@/components/ProductPieEChart.vue'
import ProductPieChart from '@/components/ProductPieChart.vue'
import ProductBarEChart from '@/components/ProductBarEChart.vue'
import StatCardVertical from '@/components/StatCardVertical.vue'

// ========== 静态数据定义 ==========
// 产品名称（冻结优化）- 使用Object.freeze避免响应式开销
const PRODUCT_NAMES = Object.freeze([
  'glm-4.5-air 0-32k 0-0.2k',
  'glm-4.5-air 0-32k 0.2k+',
  'glm-4.5-air 32-128k',
  'glm-4.6 0-32k 0-0.2k',
  'glm-4.6 0-32k 0.2k+',
  'glm-4.6 32-200k'
])

// API使用进度数据
const apiUsageProgress = ref({
  percentage: 0,
  used: 0,
  limit: 0,
  remaining: 0,
  growthRate: 0
})

// Token使用量统计数据
const tokenUsageProgress = ref({
  used: 0,
  growthRate: 0
})

// 累计花费金额统计数据
const totalCostProgress = ref({
  used: 0,
  growthRate: 0
})

// 当前会员等级信息
const currentMembershipTier = ref('GLM Coding Pro')

// 自动同步状态信息
const autoSyncConfig = ref({
  enabled: false,
  frequencySeconds: 0
})

// 自动刷新定时器
const autoRefreshTimer = ref(null)

// 手动同步状态
const manualSyncing = ref(false)

// ========== 数据定义（使用shallowRef优化） ==========

// 每小时数据（数据量小，使用ref）
const hourlyData = ref({
  labels: [],
  callCountData: [],
  tokenData: []
})

// 产品分布数据（共享产品名称）
const productData = shallowRef({
  productNames: PRODUCT_NAMES,
  productValues: [450, 320, 280, 380, 260, 290]
})

// 近1天每小时数据（24小时，使用shallowRef）
const hourlyDataDay = shallowRef({
  labels: ['00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'],
  callCountData: [120, 95, 78, 65, 58, 62, 89, 145, 298, 456, 587, 623, 689, 712, 645, 598, 534, 489, 423, 367, 298, 245, 189, 156],
  tokenData: [76000, 61000, 50000, 42000, 38000, 41000, 58000, 95000, 198000, 312000, 398000, 425000, 468000, 485000, 438000, 406000, 362000, 332000, 287000, 249000, 202000, 166000, 128000, 106000]
})

// 近1天产品分布数据
const productDataDay = shallowRef({
  productNames: PRODUCT_NAMES,
  productValues: [1850, 1200, 980, 1420, 890, 1050]
})

// 近1天统计数据
const dayStats = ref({
  callCount: 0,
  tokenUsage: 0,
  totalCost: 0
})

// 近1周统计数据
const weekStats = ref({
  callCount: 0,
  tokenUsage: 0,
  totalCost: 0
})

// 近1月统计数据
const monthStats = ref({
  callCount: 0,
  tokenUsage: 0,
  totalCost: 0
})

// 近1周每小时数据（7天，使用ref）
const hourlyDataWeek = ref({
  labels: ['12-06', '12-07', '12-08', '12-09', '12-10', '12-11', '12-12'],
  callCountData: [6520, 7234, 6890, 7456, 7123, 5890, 4567],
  tokenData: [4180000, 4650000, 4420000, 4780000, 4560000, 3780000, 2930000]
})

// 近1周产品分布数据
const productDataWeek = shallowRef({
  productNames: PRODUCT_NAMES,
  productValues: [8950, 6780, 5230, 7890, 5650, 6230]
})

// 近1月每小时数据（30天，使用shallowRef优化性能）
const hourlyDataMonth = shallowRef({
  labels: ['11-13', '11-14', '11-15', '11-16', '11-17', '11-18', '11-19', '11-20', '11-21', '11-22', '11-23', '11-24', '11-25', '11-26', '11-27', '11-28', '11-29', '11-30', '12-01', '12-02', '12-03', '12-04', '12-05', '12-06', '12-07', '12-08', '12-09', '12-10', '12-11', '12-12'],
  callCountData: [820, 920, 890, 1050, 980, 890, 820, 1150, 1320, 1250, 1180, 1340, 1290, 1420, 1350, 1280, 1450, 1380, 1520, 1480, 1550, 1620, 1580, 1650, 1720, 1680, 1750, 1820, 1780, 1850],
  tokenData: [520000, 580000, 560000, 670000, 620000, 560000, 520000, 730000, 840000, 800000, 750000, 850000, 820000, 900000, 860000, 810000, 920000, 880000, 970000, 940000, 990000, 1030000, 1000000, 1050000, 1090000, 1060000, 1110000, 1150000, 1120000, 1170000]
})

// 近1月产品分布数据
const productDataMonth = shallowRef({
  productNames: PRODUCT_NAMES,
  productValues: [35680, 28950, 22340, 32450, 25670, 28340]
})

// ========== 性能优化工具函数 ==========

// 防抖函数 - 减少频繁调用
const debounce = (fn, delay = 300) => {
  let timer = null
  return function(...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), delay)
  }
}

// 图表懒加载控制
const visibleCharts = ref(new Set())

// 检查元素是否在视窗内
const checkVisibility = () => {
  const elements = document.querySelectorAll('.chart-card')
  elements.forEach(el => {
    const rect = el.getBoundingClientRect()
    const isVisible = rect.top < window.innerHeight && rect.bottom > 0
    if (isVisible) {
      visibleCharts.value.add(el.dataset.chartId)
    }
  })
}

// 防抖的可见性检查
const debouncedCheckVisibility = debounce(checkVisibility, 100)

// 初始加载时检查
onMounted(() => {
  checkVisibility()
  // 滚动时检查
  window.addEventListener('scroll', debouncedCheckVisibility, { passive: true })
  // 窗口大小改变时检查
  window.addEventListener('resize', debouncedCheckVisibility, { passive: true })
})

// ========== 数据处理函数 ==========

// 获取进度条颜色（使用computed缓存）
const getProgressColor = (percentage) => {
  if (percentage >= 90) return '#E74C3C'      // 红色 (危险)
  if (percentage >= 70) return '#F39C12'      // 橙色 (警告)
  if (percentage >= 50) return '#4D6782'      // 主色 (正常)
  return '#A8C686'                            // 绿色 (良好)
}

const getProgressDuration = (percentage) => {
  if (percentage >= 90) return 14      // 很快
  if (percentage >= 70) return 16      // 快
  if (percentage >= 50) return 18      // 正常
  return 20                            // 慢
}

// 处理图表点击事件
const handleChartClick = (params) => {
  console.log('图表点击:', params)
  ElMessage.info(`点击了: ${params.name}`)
}

const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num.toString()
}

// 格式化近1天统计数据
const formatDayStatsValue = (value, type) => {
  if (type === 'cost') {
    return '¥' + value.toFixed(2)
  }
  if (type === 'token') {
    return formatNumber(value)
  }
  return value.toLocaleString()
}

// 获取会员等级
const fetchCurrentMembershipTier = async () => {
  try {
    const result = await api.getCurrentMembershipTier()
    if (result.success && result.data?.membershipTier) {
      currentMembershipTier.value = result.data.membershipTier
    }
  } catch (error) {
    console.error('获取会员等级失败:', error)
    // 使用默认的会员等级
  }
}

// 获取自动同步状态
const fetchAutoSyncStatus = async () => {
  try {
    const result = await api.getAutoSyncConfig()
    if (result.success && result.data) {
      autoSyncConfig.value = {
        enabled: result.data.enabled || false,
        frequencySeconds: result.data.frequency_seconds || 0
      }
    }
  } catch (error) {
    console.error('获取自动同步状态失败:', error)
    // 使用默认的关闭状态
    autoSyncConfig.value = {
      enabled: false,
      frequencySeconds: 0
    }
  }
}

// 获取API使用进度
const fetchApiUsageProgress = async () => {
  try {
    const result = await api.getApiUsageProgress()
    if (result.success && result.data) {
      apiUsageProgress.value = {
        percentage: result.data.percentage || 0,
        used: result.data.used || 0,
        limit: result.data.limit || 0,
        remaining: result.data.remaining || 0,
        growthRate: result.data.growthRate || 0
      }
    }
  } catch (error) {
    console.error('获取API使用进度失败:', error)
    // 使用默认值
    apiUsageProgress.value = {
      percentage: 0,
      used: 0,
      limit: 0,
      remaining: 0,
      growthRate: 0
    }
  }
}

// 获取Token使用量统计
const fetchTokenUsageProgress = async () => {
  const result = await createObjectApiHandler(
    api.getTokenUsageProgress,
    {
      defaultValue: {
        used: 0,
        growthRate: 0
      },
      errorMessage: '获取Token使用量统计'
    }
  )()
  tokenUsageProgress.value = result
}

// 获取累计花费金额统计
const fetchTotalCostProgress = async () => {
  const result = await createObjectApiHandler(
    api.getTotalCostProgress,
    {
      defaultValue: {
        used: 0,
        growthRate: 0
      },
      errorMessage: '获取累计花费金额统计'
    }
  )()
  totalCostProgress.value = result
}

onMounted(() => {
  fetchCurrentMembershipTier()
  fetchAutoSyncStatus()
  fetchApiUsageProgress()
  fetchTokenUsageProgress()
  fetchTotalCostProgress()
  fetchHourlyUsage()
  fetchProductDistribution()
  fetchProductDistributionForDay()
  fetchProductDistributionForWeek()
  fetchProductDistributionForMonth()
  fetchDayApiUsage()
  fetchDayTokenUsage()
  fetchDayTotalCost()
  fetchWeekApiUsage()
  fetchWeekTokenUsage()
  fetchWeekTotalCost()
  fetchMonthApiUsage()
  fetchMonthTokenUsage()
  fetchMonthTotalCost()
  fetchHourlyUsageForDay()
  fetchDailyUsageForWeek()
  fetchDailyUsageForMonth()
})

// 自动刷新所有统计数据（当自动监控启动时）
const refreshAllStats = async () => {
  try {
    // 刷新所有关键统计指标
    await Promise.all([
      fetchApiUsageProgress(),
      fetchTokenUsageProgress(),
      fetchTotalCostProgress(),
      fetchHourlyUsage(),
      fetchProductDistribution(),
      fetchProductDistributionForDay(),
      fetchProductDistributionForWeek(),
      fetchProductDistributionForMonth(),
      fetchDayApiUsage(),
      fetchDayTokenUsage(),
      fetchDayTotalCost(),
      fetchWeekApiUsage(),
      fetchWeekTokenUsage(),
      fetchWeekTotalCost(),
      fetchMonthApiUsage(),
      fetchMonthTokenUsage(),
      fetchMonthTotalCost(),
      fetchHourlyUsageForDay(),
      fetchDailyUsageForWeek(),
      fetchDailyUsageForMonth()
    ])
  } catch (error) {
    console.error('自动刷新统计数据失败:', error)
  }
}

// 监听自动同步状态变化，自动启动/停止定时刷新
watch(() => autoSyncConfig.value.enabled, (newValue) => {
  if (newValue) {
    // 启动自动刷新 - 每5秒刷新一次
    if (!autoRefreshTimer.value) {
      autoRefreshTimer.value = setInterval(() => {
        refreshAllStats()
      }, 5000)
      console.log('已启动自动刷新定时器（每5秒）')
    }
  } else {
    // 停止自动刷新
    if (autoRefreshTimer.value) {
      clearInterval(autoRefreshTimer.value)
      autoRefreshTimer.value = null
      console.log('已停止自动刷新定时器')
    }
  }
})

// 组件卸载时清理定时器
onUnmounted(() => {
  if (autoRefreshTimer.value) {
    clearInterval(autoRefreshTimer.value)
    autoRefreshTimer.value = null
    console.log('组件卸载，已清理自动刷新定时器')
  }
})

// 获取每小时调用次数和Token数量
const fetchHourlyUsage = async () => {
  const result = await createTimeSeriesHandler(
    api.getHourlyUsage,
    '获取每小时调用次数和Token数量'
  )(5)
  hourlyData.value = result
}

// 获取近1天每小时调用次数和Token数量
const fetchHourlyUsageForDay = async () => {
  const result = await createTimeSeriesHandler(
    api.getHourlyUsage,
    '获取近1天每小时调用次数和Token数量'
  )(24)
  hourlyDataDay.value = result
}

// 获取产品分布数据（按model_product_name分组，统计sum(api_usage)）
const fetchProductDistribution = async () => {
  const result = await createProductDistributionHandler(
    api.getProductDistribution,
    '获取产品分布数据'
  )(5)
  productData.value = result
}

// 获取近1天产品分布数据（按model_product_name分组，统计sum(api_usage)）
const fetchProductDistributionForDay = async () => {
  const result = await createProductDistributionHandler(
    api.getProductDistribution,
    '获取近1天产品分布数据'
  )(24)
  productDataDay.value = result
}

// 获取近1周产品分布数据（按model_product_name分组，统计sum(api_usage)）
const fetchProductDistributionForWeek = async () => {
  const result = await createProductDistributionHandler(
    api.getProductDistribution,
    '获取近1周产品分布数据'
  )(168)
  productDataWeek.value = result
}

// 获取近1月产品分布数据（按model_product_name分组，统计sum(api_usage)）
const fetchProductDistributionForMonth = async () => {
  const result = await createProductDistributionHandler(
    api.getProductDistribution,
    '获取近1月产品分布数据'
  )(720)
  productDataMonth.value = result
}

// 获取近1天调用次数
const fetchDayApiUsage = async () => {
  dayStats.value.callCount = await createSimpleApiHandler(
    api.getDayApiUsage,
    { errorMessage: '获取近1天调用次数' }
  )()
}

// 获取近1天Token使用量
const fetchDayTokenUsage = async () => {
  dayStats.value.tokenUsage = await createSimpleApiHandler(
    api.getDayTokenUsage,
    { errorMessage: '获取近1天Token使用量' }
  )()
}

// 获取近1天累计花费金额
const fetchDayTotalCost = async () => {
  dayStats.value.totalCost = await createSimpleApiHandler(
    api.getDayTotalCost,
    { errorMessage: '获取近1天累计花费金额' }
  )()
}

// 获取近1周调用次数
const fetchWeekApiUsage = async () => {
  weekStats.value.callCount = await createSimpleApiHandler(
    api.getWeekApiUsage,
    { errorMessage: '获取近1周调用次数' }
  )()
}

// 获取近1周Token使用量
const fetchWeekTokenUsage = async () => {
  weekStats.value.tokenUsage = await createSimpleApiHandler(
    api.getWeekTokenUsage,
    { errorMessage: '获取近1周Token使用量' }
  )()
}

// 获取近1周累计花费金额
const fetchWeekTotalCost = async () => {
  weekStats.value.totalCost = await createSimpleApiHandler(
    api.getWeekTotalCost,
    { errorMessage: '获取近1周累计花费金额' }
  )()
}

// 获取近1月调用次数
const fetchMonthApiUsage = async () => {
  monthStats.value.callCount = await createSimpleApiHandler(
    api.getMonthApiUsage,
    { errorMessage: '获取近1月调用次数' }
  )()
}

// 获取近1月Token使用量
const fetchMonthTokenUsage = async () => {
  monthStats.value.tokenUsage = await createSimpleApiHandler(
    api.getMonthTokenUsage,
    { errorMessage: '获取近1月Token使用量' }
  )()
}

// 获取近1月累计花费金额
const fetchMonthTotalCost = async () => {
  monthStats.value.totalCost = await createSimpleApiHandler(
    api.getMonthTotalCost,
    { errorMessage: '获取近1月累计花费金额' }
  )()
}

// 获取每天调用次数和Token数量（近1周）
const fetchDailyUsageForWeek = async () => {
  const result = await createTimeSeriesHandler(
    api.getDailyUsage,
    '获取每天调用次数和Token数量'
  )(7)
  hourlyDataWeek.value = result
}

// 获取每天调用次数和Token数量（近1月）
const fetchDailyUsageForMonth = async () => {
  const result = await createTimeSeriesHandler(
    api.getMonthlyUsage,
    '获取每天调用次数和Token数量'
  )()
  hourlyDataMonth.value = result
}

// 获取当前月份
const getCurrentMonth = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

// 手动同步账单
const handleManualSync = async () => {
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
        message: '无法进行手动同步：系统中暂无账单数据\n\n请先在【数据同步】页面进行一次"全量同步"来获取基础数据',
        duration: 5000
      })
      return
    }
  } catch (error) {
    ElMessage.error('检查数据失败：' + error.message)
    return
  }

  manualSyncing.value = true

  try {
    const result = await api.syncBills(getCurrentMonth(), 'incremental')

    if (result.success) {
      ElMessage.success(result.message || '手动同步账单完成')

      // 同步完成后刷新所有统计数据
      await refreshAllData()
    } else {
      ElMessage.error(result.message || '同步失败')
    }
  } catch (error) {
    ElMessage.error('同步失败：' + error.message)
  } finally {
    manualSyncing.value = false
  }
}

// 刷新所有统计数据
const refreshAllData = async () => {
  try {
    // 并行刷新所有关键数据，提高效率
    await Promise.all([
      fetchCurrentMembershipTier(),
      fetchAutoSyncStatus(),
      fetchApiUsageProgress(),
      fetchTokenUsageProgress(),
      fetchTotalCostProgress(),
      fetchHourlyUsage(),
      fetchProductDistribution(),
      fetchProductDistributionForDay(),
      fetchProductDistributionForWeek(),
      fetchProductDistributionForMonth(),
      fetchDayApiUsage(),
      fetchDayTokenUsage(),
      fetchDayTotalCost(),
      fetchWeekApiUsage(),
      fetchWeekTokenUsage(),
      fetchWeekTotalCost(),
      fetchMonthApiUsage(),
      fetchMonthTokenUsage(),
      fetchMonthTotalCost(),
      fetchDailyUsageForWeek(),
      fetchDailyUsageForMonth()
    ])

    console.log('统计数据刷新完成')
  } catch (error) {
    console.error('刷新统计数据失败:', error)
    // 不显示错误消息，避免干扰用户
  }
}
</script>


<style>
/* 自定义Token Tooltip样式 - 符合系统设计风格 */
.token-tooltip {
  background: rgba(77, 103, 130, 0.95) !important;
  color: #FFFFFF !important;
  border: 1px solid rgba(77, 103, 130, 0.3) !important;
  border-radius: 8px !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  padding: 8px 12px !important;
  box-shadow: 0 4px 16px rgba(77, 103, 130, 0.2) !important;
  backdrop-filter: blur(8px) !important;
  max-width: 200px !important;
  text-align: center !important;
  line-height: 1.4 !important;
}

/* Tooltip箭头样式 */
.token-tooltip .el-popper__arrow::before {
  background: rgba(77, 103, 130, 0.95) !important;
  border: 1px solid rgba(77, 103, 130, 0.3) !important;
}
</style>

<style scoped>
/* 页面容器 */
.stats-page {
  /* 扁平化设计：移除所有动画效果，提升性能 */
  padding: 24px;
  max-width: 1920px;
  margin: 0 auto;
}

/* ========== 近5小时重点区域 ========== */
.stats-period-section-main {
  margin-bottom: 32px;
}

/* 主周期卡片 */
.period-main {
  background: #FFFFFF;
  border: 2px solid rgba(77, 103, 130, 0.15);
  border-radius: 16px;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.period-main:hover {
  border-color: rgba(77, 103, 130, 0.3);
  box-shadow: 0 8px 24px rgba(77, 103, 130, 0.15);
}

/* 主周期头部（降低颜色饱和度） */
.period-main-header {
  background: linear-gradient(135deg, #6B7C8A 0%, #7B8C9A 100%);
  color: #FFFFFF;
  padding: 15px 32px;
  border-bottom: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  flex: 1;
}

.header-right {
  display: flex;
  align-items: center;
}

.header-icon-main {
  font-size: 28px;
  margin-right: 16px;
  color: #FFFFFF;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.header-title-main {
  font-size: 22px;
  font-weight: 600;
  line-height: 1;  /* 设置行高为1，使文本高度等于字体大小 */
}

.header-tag {
  border-color: rgba(184, 212, 166, 0.5);
  color: #B8D4A6;
  background: rgba(184, 212, 166, 0.15);
  backdrop-filter: blur(8px);
  /* 确保标签行高与标题文本一致 */
  line-height: 1;
}

/* 会员等级标签样式（浅色文字 + 深色背景，高对比度） */
.header-tag.membership-tag {
  border-color: rgba(61, 85, 104, 0.3);
  color: #FFFFFF;
  background: rgba(61, 85, 104, 0.85);  /* 深色背景 */
  font-weight: 600;
  transform: translateY(1px);  /* 降低1px，与标题对齐 */
}

/* 悬停效果 */
.header-tag.membership-tag:hover {
  background: rgba(61, 85, 104, 0.95);  /* 更深 */
}

/* "自动监控中"绿色系变体（保持相同风格） */
.header-tag.membership-tag.status-tag {
  border-color: rgba(141, 169, 98, 0.5);
  color: #FFFFFF;
  background: rgba(141, 169, 98, 0.85);  /* 深绿色背景 */
  font-weight: 600;
  transform: translateY(1px);  /* 降低1px，与标题对齐 */
}

/* "自动监控中"悬停效果 */
.header-tag.membership-tag.status-tag:hover {
  background: rgba(141, 169, 98, 0.95);  /* 更深绿色 */
}

/* "自动监控未启动"深橙灰色系变体（覆盖默认绿色样式，保持系统风格） */
.header-tag.membership-tag.status-tag--danger {
  border-color: rgba(149, 88, 53, 0.5) !important;
  color: #FFFFFF !important;
  background: rgba(149, 88, 53, 0.85) !important;  /* 深橙灰色背景，保持系统风格 */
  font-weight: 600;
  transform: translateY(1px);  /* 降低1px，与标题对齐 */
}

/* "自动监控未启动"悬停效果 */
.header-tag.membership-tag.status-tag--danger:hover {
  background: rgba(149, 88, 53, 0.95) !important;  /* 更深橙灰色 */
}

/* 手动同步按钮样式（扁平化设计） */
.header-tag.membership-tag.manual-sync-btn {
  border-color: rgba(77, 103, 130, 0.4) !important;
  color: #4D6782 !important;
  background: rgba(255, 255, 255, 0.9) !important;
  font-weight: 500;
  height: 24px;
  padding: 0 12px;
  font-size: 11px;
  transform: translateY(1px);  /* 降低1px，与标题对齐 */
  /* 扁平化设计：移除过渡动画 */
  border-radius: 12px;
}

/* 手动同步按钮悬停效果（扁平化设计） */
.header-tag.membership-tag.manual-sync-btn:hover {
  background: #4D6782 !important;
  border-color: #4D6782 !important;
  color: #FFFFFF !important;
  /* 扁平化设计：移除动画效果，仅保留颜色变化 */
}

/* 手动同步按钮加载状态 */
.header-tag.membership-tag.manual-sync-btn.is-loading {
  background: rgba(77, 103, 130, 0.15) !important;
  border-color: rgba(77, 103, 130, 0.5) !important;
  color: #4D6782 !important;
}

/* 主周期统计网格 - 6列2行布局 */
.period-stats-grid-main {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-template-rows: auto auto;
  gap: 24px;
  padding: 32px;
}

/* 进度条：跨3列（第1-3列） */
.progress-row {
  grid-column: span 3;
}

/* 统计卡片：每个占1列 */
.stat-card-main {
  grid-column: span 1;
  width: 100%;
}

/* 图表：每小时图表占2列，产品分布占4列 */
.chart-row {
  width: 100%;
}

/* 每小时图表占2列 */
.chart-row:nth-of-type(5) {
  grid-column: span 2;
}

/* 产品分布占4列 */
.chart-row:nth-of-type(6) {
  grid-column: span 4;
}

@media (max-width: 1400px) {
  .period-stats-grid-main {
    grid-template-columns: repeat(2, 1fr);
  }

  .progress-row {
    grid-column: span 2;
  }

  .chart-row {
    grid-column: span 2;
  }

  .stat-card-main {
    grid-column: span 1;
  }
}

@media (max-width: 1200px) {
  .period-stats-grid-main {
    grid-template-columns: 1fr;
  }

  .progress-row,
  .chart-row,
  .stat-card-main {
    grid-column: 1 / -1;
  }
}

/* 主周期统计卡片（扁平化设计版） */
.stat-card-main {
  background: rgba(77, 103, 130, 0.03);
  border: 1px solid rgba(77, 103, 130, 0.1);
  border-radius: 12px;
  padding: 0;
  position: relative;
  overflow: hidden;
  /* 扁平化设计：移除所有动画和过渡效果 */
}

/* 扁平化设计：移除渐变遮罩层，简化视觉层次 */

.stat-card-main:hover {
  /* 扁平化设计：移除hover动画效果 */
  /* 仅保留边框颜色变化作为交互反馈 */
  border-color: rgba(77, 103, 130, 0.2);
}

.stat-content {
  display: flex;
  align-items: center;
  padding: 20px;
  position: relative;
  z-index: 1;
}

.stat-icon-main {
  font-size: 34px;
  margin-right: 18px;
  color: #4D6782;
  opacity: 0.9;
  /* 扁平化设计：移除所有动画和过渡效果 */
}

.stat-card-main:hover .stat-icon-main {
  /* 扁平化设计：移除缩放和颜色动画 */
  opacity: 1;
  color: #4D6782; /* 保持原色，避免视觉跳动 */
}

.stat-info {
  flex: 1;
  min-width: 0;
}

.stat-label {
  font-size: 12px;
  opacity: 0.7;
  margin-bottom: 8px;
  color: #6B7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
}

.stat-value-main {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
  color: #4D6782;
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  /* 扁平化设计：移除所有动画效果 */
}

.stat-card-main:hover .stat-value-main {
  /* 扁平化设计：移除hover缩放动画 */
}

/* 趋势指示器 */
.stat-trend {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.trend-up {
  background: rgba(76, 175, 80, 0.1);
  color: #4CAF50;
}

.trend-warning {
  background: rgba(255, 152, 0, 0.1);
  color: #FF9800;
}

/* ========== 进度条样式（扁平化设计版） ========== */
.progress-card {
  background: rgba(77, 103, 130, 0.02);
  border: 1px solid rgba(77, 103, 130, 0.1);
  border-radius: 12px;
  padding: 0;
  /* 扁平化设计：移除所有动画和过渡效果 */
  position: relative;
  overflow: hidden;
}

/* 扁平化设计：移除渐变遮罩层，简化视觉层次 */

.progress-card:hover {
  /* 扁平化设计：移除hover动画效果 */
  /* 仅保留边框颜色变化作为交互反馈 */
  border-color: rgba(77, 103, 130, 0.15);
}

.progress-content {
  padding: 24px 28px;
  position: relative;
  z-index: 1;
}

.progress-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.progress-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #4D6782;
}

.progress-icon {
  font-size: 16px;
}

.progress-percentage {
  font-size: 24px;
  font-weight: 700;
  transition: all 0.3s ease;
}

.progress-details-row {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
}

.progress-text {
  font-size: 12px;
  color: #8E8E8E;
}

/* ========== 图表卡片样式（扁平化设计版） ========== */
.chart-card {
  background: rgba(77, 103, 130, 0.02);
  border: 1px solid rgba(77, 103, 130, 0.1);
  border-radius: 12px;
  overflow: hidden;
  /* 扁平化设计：移除所有动画和过渡效果 */
  position: relative;
  height: 320px;
}

/* 扁平化设计：移除渐变遮罩层，简化视觉层次 */

.chart-card:hover {
  /* 扁平化设计：移除hover动画效果 */
  /* 仅保留边框颜色变化作为交互反馈 */
  border-color: rgba(77, 103, 130, 0.15);
}

/* 确保图表内容在覆盖层之上 */
.chart-card :deep(.chart-container) {
  position: relative;
  z-index: 1;
}

/* 自定义进度条样式 */
.progress-card :deep(.el-progress) {
  margin: 8px 0;
}

.progress-card :deep(.el-progress-bar__outer) {
  background-color: rgba(77, 103, 130, 0.1);
  border-radius: 10px;
}

.progress-card :deep(.el-progress-bar__inner) {
  border-radius: 10px;
  transition: all 0.3s ease;
}

.progress-card :deep(.el-progress-bar__innerText) {
  color: #FFFFFF;
  font-size: 12px;
  font-weight: 600;
}

.progress-card :deep(.el-progress--striped .el-progress-bar__inner) {
  background-image: linear-gradient(
    45deg,
    rgba(255, 255, 255, 0.15) 25%,
    rgba(255, 255, 255, 0.1) 25%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(255, 255, 255, 0.15) 50%,
    rgba(255, 255, 255, 0.15) 75%,
    rgba(255, 255, 255, 0.1) 75%,
    rgba(255, 255, 255, 0.1) 100%
  );
  background-size: 30px 30px;
  animation: progress-stripes 2s linear infinite;
}

@keyframes progress-stripes {
  0% {
    background-position: 0 0;
  }
  100% {
    background-position: 30px 0;
  }
}

/* ========== 其他周期区域 ========== */
.stats-period-section-others {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
}

@media (max-width: 1400px) {
  .stats-period-section-others {
    flex-direction: column;
  }
}

/* 单个其他周期 */
.stats-period-section-other {
  flex: 1;
  min-width: 0;
}

/* 其他周期卡片 */
.period-other {
  background: #FFFFFF;
  border: 1px solid rgba(77, 103, 130, 0.12);
  border-radius: 12px;
  transition: all 0.3s ease;
  overflow: hidden;
}

.period-other:hover {
  border-color: rgba(77, 103, 130, 0.25);
  box-shadow: 0 4px 16px rgba(77, 103, 130, 0.12);
}

/* 其他周期头部 */
.period-other-header {
  background: rgba(77, 103, 130, 0.05);
  color: #4D6782;
  padding: 18px 24px;
  border-bottom: 1px solid rgba(77, 103, 130, 0.1);
  display: flex;
  align-items: center;
}

.header-icon-other {
  font-size: 20px;
  margin-right: 10px;
  color: #4D6782;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
}

/* 其他周期统计网格 */
.period-stats-grid-other {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  padding: 20px;
}

@media (max-width: 1200px) {
  .period-stats-grid-other {
    grid-template-columns: 1fr;
  }
}

/* 近1天4行布局网格 */
.period-stats-grid-other-4row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: auto auto auto auto;
  gap: 16px;
  padding: 20px;
}

/* 第一行：三个指标卡片各占1列 */
.period-stats-grid-other-4row .stat-card-other:nth-child(1),
.period-stats-grid-other-4row .stat-card-other:nth-child(2),
.period-stats-grid-other-4row .stat-card-other:nth-child(3) {
  grid-column: span 1;
}

/* 第二行：每小时图表占3列 */
.period-stats-grid-other-4row .hourly-chart-row {
  grid-column: 1 / -1;
}

/* 第三行：产品占比占3列 */
.period-stats-grid-other-4row .product-pie-row {
  grid-column: 1 / -1;
}

/* 第四行：产品调用次数占3列 */
.period-stats-grid-other-4row .product-bar-row {
  grid-column: 1 / -1;
}

/* 近1周每周图表行占3列 */
.period-stats-grid-other-4row .weekly-chart-row {
  grid-column: 1 / -1;
}

/* 近1周产品占比占3列 */
.period-stats-grid-other-4row .weekly-pie-row {
  grid-column: 1 / -1;
}

/* 近1周产品调用次数占3列 */
.period-stats-grid-other-4row .weekly-bar-row {
  grid-column: 1 / -1;
}

/* 近1月每周图表行占3列 */
.period-stats-grid-other-4row .monthly-chart-row {
  grid-column: 1 / -1;
}

/* 近1月产品占比占3列 */
.period-stats-grid-other-4row .monthly-pie-row {
  grid-column: 1 / -1;
}

/* 近1月产品调用次数占3列 */
.period-stats-grid-other-4row .monthly-bar-row {
  grid-column: 1 / -1;
}

/* 图表行样式（扁平化设计版） */
.chart-row-other {
  background: rgba(77, 103, 130, 0.02);
  border: 1px solid rgba(77, 103, 130, 0.08);
  border-radius: 10px;
  overflow: hidden;
  position: relative;
  height: 280px;
  /* 扁平化设计：移除所有硬件加速和动画 */
}

/* 扁平化设计：移除渐变遮罩层，简化视觉层次 */

.chart-row-other:hover {
  /* 扁平化设计：移除hover动画效果 */
  /* 仅保留边框颜色变化作为交互反馈 */
  border-color: rgba(77, 103, 130, 0.15);
}

@media (max-width: 1200px) {
  .period-stats-grid-other-4row {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
  }

  .period-stats-grid-other-4row .stat-card-other,
  .period-stats-grid-other-4row .hourly-chart-row,
  .period-stats-grid-other-4row .product-pie-row,
  .period-stats-grid-other-4row .product-bar-row {
    grid-column: 1 / -1;
  }

  .chart-row-other {
    height: 250px;
  }
}

/* 其他周期统计卡片（扁平化设计版） */
.stat-card-other {
  background: rgba(77, 103, 130, 0.02);
  border: 1px solid rgba(77, 103, 130, 0.08);
  border-radius: 10px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  /* 扁平化设计：移除所有动画和过渡效果 */
}

/* 扁平化设计：移除渐变遮罩层，简化视觉层次 */

.stat-card-other:hover {
  /* 扁平化设计：移除hover动画效果 */
  /* 仅保留边框颜色变化作为交互反馈 */
  border-color: rgba(77, 103, 130, 0.15);
}

.stat-content {
  display: flex;
  align-items: center;
  padding: 20px;
  position: relative;
  z-index: 1;
}

.stat-icon-other {
  font-size: 28px;
  margin-right: 14px;
  color: #4D6782;
  opacity: 0.8;
  /* 扁平化设计：移除所有动画和过渡效果 */
}

.stat-card-other:hover .stat-icon-other {
  /* 扁平化设计：移除缩放和颜色动画 */
  opacity: 1;
  color: #4D6782; /* 保持原色，避免视觉跳动 */
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
  color: #4D6782;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  /* 扁平化设计：移除所有动画效果 */
}

.stat-card-other:hover .stat-value {
  /* 扁平化设计：移除hover缩放动画 */
}

/* ========== 响应式设计 ========== */
@media (max-width: 1920px) {
  .stats-page {
    padding: 0;
  }
}

@media (max-width: 1600px) {
  .period-stats-grid-main {
    padding: 28px;
    gap: 20px;
  }

  .stat-value-main {
    font-size: 22px;
  }

  .stat-icon-main {
    font-size: 30px;
  }

  .stat-content {
    padding: 22px;
  }
}

@media (max-width: 1400px) {
  .period-main-header {
    padding: 20px 28px;
  }

  .header-title-main {
    font-size: 20px;
    line-height: 1;
  }

  .stat-content {
    padding: 24px;
  }
}

@media (max-width: 1200px) {
  .stats-period-section-others {
    flex-direction: column;
  }

  .period-stats-grid-main {
    grid-template-columns: 1fr;
    gap: 20px;
    padding: 24px;
  }

  .stat-value-main {
    font-size: 22px;
  }

  .stat-icon-main {
    font-size: 28px;
  }

  .stat-content {
    padding: 20px;
  }
}

@media (max-width: 768px) {
  .stats-page {
    padding: 16px;
  }

  .period-main-header,
  .period-other-header {
    padding: 16px 20px;
  }

  .header-title-main {
    font-size: 18px;
    line-height: 1;
  }

  .header-title {
    font-size: 14px;
  }

  .period-stats-grid-main,
  .period-stats-grid-other {
    grid-template-columns: 1fr;
    padding: 20px;
    gap: 16px;
  }

  .stat-content {
    padding: 16px;
  }

  .stat-value-main {
    font-size: 18px;
  }

  .stat-icon-main {
    font-size: 22px;
  }

  .stat-label {
    font-size: 11px;
    margin-bottom: 6px;
  }

  .stat-trend {
    font-size: 10px;
    padding: 3px 6px;
  }

  .stat-value {
    font-size: 16px;
  }

  .stat-icon-other {
    font-size: 22px;
  }

  /* 进度条响应式 */
  .progress-content {
    padding: 20px;
  }

  .progress-header-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .progress-percentage {
    font-size: 20px;
  }

  .progress-details-row {
    flex-direction: column;
    gap: 4px;
  }

  .progress-text {
    font-size: 11px;
  }

  /* 图表响应式 */
  .chart-card {
    height: 280px;
  }
}
</style>
