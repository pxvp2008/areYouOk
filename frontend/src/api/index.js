import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
})

// 单用户系统，无需在请求头中添加认证信息
// 智谱AI Token已存储在系统数据库中，后端自动从数据库读取

api.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    if (error.response) {
      const message = error.response.data?.message || error.message
      return Promise.reject(new Error(message))
    }
    return Promise.reject(error)
  }
)

export default {
  syncBills(billingMonth, type = 'full') {
    return api.post('/bills/sync', { billingMonth, type })
  },

  getBills(params) {
    return api.get('/bills', { params })
  },

  getProducts() {
    return api.get('/bills/products')
  },

  getBillsCount() {
    return api.get('/bills/count')
  },

  getCurrentMembershipTier() {
    return api.get('/bills/current-membership-tier')
  },

  getApiUsageProgress() {
    return api.get('/bills/api-usage-progress')
  },

  getTokenUsageProgress() {
    return api.get('/bills/token-usage-progress')
  },

  getTotalCostProgress() {
    return api.get('/bills/total-cost-progress')
  },

  getAutoSyncConfig() {
    return api.get('/auto-sync/config')
  },

  getStats(period = '5h') {
    return api.get('/bills/stats', { params: { period } })
  },

  getSyncStatus() {
    return api.get('/bills/sync-status')
  },

  // 保存同步历史记录
  saveSyncHistory(historyData) {
    return api.post('/bills/sync-history', historyData)
  },

  // 获取同步历史记录
  getSyncHistory(syncType, limit = 10, page = 1) {
    const offset = (page - 1) * limit
    return api.get('/bills/sync-history', {
      params: { sync_type: syncType, limit, offset }
    })
  },

  // Token管理
  verifyToken(token) {
    return api.post('/tokens/verify', { token })
  },

  saveToken(token) {
    return api.post('/tokens/save', { token })
  },

  getToken() {
    return api.get('/tokens/get')
  },

  deleteToken() {
    return api.delete('/tokens/delete')
  },

  // 自动同步相关
  getAutoSyncConfig() {
    return api.get('/auto-sync/config')
  },

  saveAutoSyncConfig(config) {
    return api.post('/auto-sync/config', config)
  },

  triggerAutoSync() {
    return api.post('/auto-sync/trigger')
  },

  stopAutoSync() {
    return api.post('/auto-sync/stop')
  },

  // 获取每小时调用次数和Token数量
  getHourlyUsage(hours = 5) {
    return api.get('/bills/hourly-usage', { params: { hours } })
  },

  // 获取每天调用次数和Token数量
  getDailyUsage(days = 7) {
    return api.get('/bills/daily-usage', { params: { days } })
  },

  // 获取近30天每天调用次数和Token数量
  getMonthlyUsage() {
    return api.get('/bills/daily-usage', { params: { days: 30 } })
  },

  // 获取产品分布统计
  getProductDistribution(hours = 5) {
    return api.get('/bills/product-distribution', { params: { hours } })
  },

  // 获取近1天API使用量统计
  getDayApiUsage() {
    return api.get('/bills/day-api-usage')
  },

  // 获取近1天Token使用量统计
  getDayTokenUsage() {
    return api.get('/bills/day-token-usage')
  },

  // 获取近1天累计花费金额统计
  getDayTotalCost() {
    return api.get('/bills/day-total-cost')
  },

  // 获取近1周API使用量统计
  getWeekApiUsage() {
    return api.get('/bills/week-api-usage')
  },

  // 获取近1周Token使用量统计
  getWeekTokenUsage() {
    return api.get('/bills/week-token-usage')
  },

  // 获取近1周累计花费金额统计
  getWeekTotalCost() {
    return api.get('/bills/week-total-cost')
  },

  // 获取近1月API使用量统计
  getMonthApiUsage() {
    return api.get('/bills/month-api-usage')
  },

  // 获取近1月Token使用量统计
  getMonthTokenUsage() {
    return api.get('/bills/month-token-usage')
  },

  // 获取近1月累计花费金额统计
  getMonthTotalCost() {
    return api.get('/bills/month-total-cost')
  }
}
