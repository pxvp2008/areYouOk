<template>
  <div class="bills-page">

    <el-card class="bills-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-icon><Document /></el-icon>
            <span>账单记录</span>
          </div>
        </div>
      </template>

      <div class="query-section">
        <el-form :inline="true" :model="queryParams" class="query-form">
          <el-form-item label="入账日期">
            <el-date-picker
              v-model="queryParams.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              class="date-picker"
            />
          </el-form-item>
          <el-form-item label="产品名称">
            <el-select
              v-model="queryParams.productNames"
              multiple
              filterable
              clearable
              placeholder="请选择产品"
              collapse-tags
              collapse-tags-tooltip
              :max-collapse-tags="1"
              size="default"
              class="product-select"
            >
              <el-option
                v-for="product in productList"
                :key="product"
                :label="product"
                :value="product"
              />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch" :loading="loading" class="search-btn">
              <el-icon><Search /></el-icon>
              查询
            </el-button>
            <el-button @click="handleReset" class="reset-btn">
              <el-icon><Refresh /></el-icon>
              重置
            </el-button>
          </el-form-item>
        </el-form>
      </div>
      
      <el-table
        :data="tableData"
        v-loading="loading"
        stripe
        class="bills-table"
      >
        <el-table-column prop="billing_no" label="账单编号" width="180" show-overflow-tooltip>
          <template #default="scope">
            <span
              class="billing-no-text"
              @click="handleCopyBillingNo(scope.row.billing_no)"
              :title="scope.row.billing_no"
            >
              {{ scope.row.billing_no }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="transaction_time" label="入账日期" width="180">
          <template #default="scope">
            <span>{{ formatDateTime(scope.row.transaction_time) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="model_product_name" label="产品名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="token_resource_name" label="会员类型" width="120">
          <template #default="scope">
            <el-tag :type="getResourceType(scope.row.token_resource_name)">
              {{ scope.row.token_resource_name || '未知' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="api_usage" label="API使用次数" width="110" align="right">
          <template #default="scope">
            <span class="number-cell">{{ scope.row.api_usage || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="usage_count" label="Token使用量" width="110" align="right">
          <template #default="scope">
            <span class="number-cell">{{ scope.row.usage_count || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="usage_exempt" label="Token免费用量" width="125" align="right">
          <template #default="scope">
            <span class="number-cell">{{ scope.row.usage_exempt || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="token_type" label="Token类型" min-width="100"/>
        <el-table-column prop="deduct_usage" label="抵扣用量" width="80" align="right">
          <template #default="scope">
            <span class="number-cell">{{ scope.row.deduct_usage || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="settlement_amount" label="结算金额" width="100" align="right">
          <template #default="scope">
            <span class="amount-cell">{{ (scope.row.settlement_amount || 0).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="currency" label="货币" width="80" align="center" />
        <el-table-column prop="billing_status" label="状态" width="100" align="center">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.billing_status)">
              {{ scope.row.billing_status || '未知' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right" align="center">
          <template #default="scope">
            <el-button type="primary" link @click="handleViewDetail(scope.row)">
              查看详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-section">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :small="false"
          :disabled="loading"
          :background="true"
          layout="total, sizes, prev, pager, next, jumper, ->"
          :total="total"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          class="custom-pagination"
        />
      </div>
    </el-card>

    <!-- 详情弹窗 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="账单详情"
      width="900px"
      :before-close="() => detailDialogVisible = false"
    >
      <div v-if="selectedBill.id" class="bill-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="账单编号" :span="2">
            <el-tooltip :content="selectedBill.billing_no" placement="top">
              <span class="long-text">{{ selectedBill.billing_no }}</span>
            </el-tooltip>
          </el-descriptions-item>
          <el-descriptions-item label="订单号" :span="2">
            <el-tooltip :content="selectedBill.order_no || '-'" placement="top">
              <span class="long-text">{{ selectedBill.order_no || '-' }}</span>
            </el-tooltip>
          </el-descriptions-item>
          <el-descriptions-item label="账单日期">{{ selectedBill.billing_date }}</el-descriptions-item>
          <el-descriptions-item label="账单时间">{{ selectedBill.billing_time || '-' }}</el-descriptions-item>
          <el-descriptions-item label="入账日期" :span="2">{{ formatDateTime(selectedBill.transaction_time) }}</el-descriptions-item>
          <el-descriptions-item label="产品名称" :span="2">
            <el-tooltip :content="selectedBill.model_product_name" placement="top">
              <span class="long-text">{{ selectedBill.model_product_name }}</span>
            </el-tooltip>
          </el-descriptions-item>
          <el-descriptions-item label="产品代码">{{ selectedBill.model_product_code || '-' }}</el-descriptions-item>
          <el-descriptions-item label="产品类型">{{ selectedBill.model_product_type || '-' }}</el-descriptions-item>
          <el-descriptions-item label="会员类型">{{ selectedBill.token_resource_name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="会员ID">{{ selectedBill.token_account_id || '-' }}</el-descriptions-item>
          <el-descriptions-item label="API使用次数">{{ selectedBill.api_usage || 0 }}</el-descriptions-item>
          <el-descriptions-item label="Token使用量">{{ selectedBill.usage_count || 0 }}</el-descriptions-item>
          <el-descriptions-item label="Token免费用量">{{ selectedBill.usage_exempt || 0 }}</el-descriptions-item>
          <el-descriptions-item label="结算金额">{{ (selectedBill.settlement_amount || 0).toFixed(2) }} {{ selectedBill.currency }}</el-descriptions-item>
          <el-descriptions-item label="应付金额">{{ (selectedBill.due_amount || 0).toFixed(2) }} {{ selectedBill.currency }}</el-descriptions-item>
          <el-descriptions-item label="已付金额">{{ (selectedBill.paid_amount || 0).toFixed(2) }} {{ selectedBill.currency }}</el-descriptions-item>
          <el-descriptions-item label="未付金额">{{ (selectedBill.unpaid_amount || 0).toFixed(2) }} {{ selectedBill.currency }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(selectedBill.billing_status)">
              {{ selectedBill.billing_status || '未知' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="支付方式">{{ selectedBill.payment_type || '-' }}</el-descriptions-item>
          <el-descriptions-item label="开始时间">{{ selectedBill.start_time || '-' }}</el-descriptions-item>
          <el-descriptions-item label="结束时间">{{ selectedBill.end_time || '-' }}</el-descriptions-item>
          <el-descriptions-item label="业务ID" :span="2">
            <el-tooltip :content="selectedBill.business_id || '-'" placement="top">
              <span class="long-text">{{ selectedBill.business_id || '-' }}</span>
            </el-tooltip>
          </el-descriptions-item>
          <el-descriptions-item label="单价">{{ selectedBill.cost_price || 0 }} {{ selectedBill.cost_unit }}</el-descriptions-item>
          <el-descriptions-item label="用量单位">{{ selectedBill.usage_unit || '-' }}</el-descriptions-item>
          <el-descriptions-item label="原价">{{ (selectedBill.original_amount || 0).toFixed(2) }} {{ selectedBill.currency }}</el-descriptions-item>
          <el-descriptions-item label="原价单价">{{ (selectedBill.original_cost_price || 0).toFixed(4) }} {{ selectedBill.cost_unit }}</el-descriptions-item>
          <el-descriptions-item label="赠送抵扣金额">{{ (selectedBill.gift_deduct_amount || 0).toFixed(2) }} {{ selectedBill.currency }}</el-descriptions-item>
          <el-descriptions-item label="开票金额">{{ (selectedBill.invoicing_amount || 0).toFixed(2) }} {{ selectedBill.currency }}</el-descriptions-item>
          <el-descriptions-item label="已开票金额">{{ (selectedBill.invoiced_amount || 0).toFixed(2) }} {{ selectedBill.currency }}</el-descriptions-item>
          <el-descriptions-item label="API密钥" :span="2">
            <el-tooltip :content="selectedBill.api_key || '-'" placement="top">
              <span class="long-text">{{ selectedBill.api_key || '-' }}</span>
            </el-tooltip>
          </el-descriptions-item>
          <el-descriptions-item label="模型代码">{{ selectedBill.model_code || '-' }}</el-descriptions-item>
          <el-descriptions-item label="客户ID">{{ selectedBill.customer_id || '-' }}</el-descriptions-item>
          <el-descriptions-item label="时间窗口">{{ selectedBill.time_window || '-' }}</el-descriptions-item>
          <el-descriptions-item label="扣减用量">{{ selectedBill.deduct_usage || 0 }}</el-descriptions-item>
          <el-descriptions-item label="扣减后">{{ selectedBill.deduct_after || 0 }}</el-descriptions-item>
          <el-descriptions-item label="Token类型">{{ selectedBill.token_type || '-' }}</el-descriptions-item>
          <el-descriptions-item label="现金金额">{{ (selectedBill.cash_amount || 0).toFixed(2) }} {{ selectedBill.currency }}</el-descriptions-item>
          <el-descriptions-item label="信用支付金额">{{ (selectedBill.credit_pay_amount || 0).toFixed(2) }} {{ selectedBill.currency }}</el-descriptions-item>
          <el-descriptions-item label="折扣率">{{ selectedBill.discount_rate ? (selectedBill.discount_rate * 100).toFixed(2) + '%' : '-' }}</el-descriptions-item>
          <el-descriptions-item label="折扣类型">{{ selectedBill.discount_type || '-' }}</el-descriptions-item>
          <el-descriptions-item label="第三方">{{ selectedBill.third_party || '-' }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="detailDialogVisible = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Document, Search, Refresh } from '@element-plus/icons-vue'
import api from '@/api'

const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const productList = ref([])

const queryParams = ref({
  dateRange: [],
  productNames: []
})

// 详情弹窗相关
const detailDialogVisible = ref(false)
const selectedBill = ref({})

const fetchBills = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value
    }

    // 从dateRange数组中提取startDate和endDate
    if (queryParams.value.dateRange && queryParams.value.dateRange.length === 2) {
      params.startDate = queryParams.value.dateRange[0]
      params.endDate = queryParams.value.dateRange[1]
    }

    // 添加产品名称过滤
    if (queryParams.value.productNames && queryParams.value.productNames.length > 0) {
      params.productNames = queryParams.value.productNames
    }

    const result = await api.getBills(params)
    if (result.success) {
      tableData.value = result.data.rows || []
      total.value = result.data.total || 0
    } else {
      ElMessage.error(result.message || '获取账单列表失败')
    }
  } catch (error) {
    ElMessage.error('获取账单列表失败：' + error.message)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  currentPage.value = 1
  fetchBills()
}

const handleReset = () => {
  queryParams.value = {
    dateRange: [],
    productNames: []
  }
  currentPage.value = 1
  fetchBills()
}

const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1
  fetchBills()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  fetchBills()
}

const getStatusType = (status) => {
  const statusMap = {
    'PAID': 'success',
    'UNPAID': 'warning',
    'PENDING': 'info'
  }
  return statusMap[status] || ''
}

const getResourceType = (resource) => {
  if (!resource) return 'info'
  if (resource.includes('Lite')) return 'info'
  if (resource.includes('Pro')) return 'success'
  if (resource.includes('Plus')) return 'warning'
  return 'info'
}

const formatDateTime = (datetime) => {
  if (!datetime) return '-'
  // 将数据库的DATETIME格式转换为 'YYYY-MM-DD HH:mm:ss' 格式显示
  const date = new Date(datetime)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

const handleViewDetail = (row) => {
  selectedBill.value = row
  detailDialogVisible.value = true
}

const handleCopyBillingNo = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('账单编号已复制到剪贴板')
  } catch (err) {
    // 降级方案
    const textArea = document.createElement('textarea')
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.select()
    try {
      document.execCommand('copy')
      ElMessage.success('账单编号已复制到剪贴板')
    } catch (fallbackErr) {
      ElMessage.error('复制失败')
    } finally {
      document.body.removeChild(textArea)
    }
  }
}

const loadProductList = async () => {
  try {
    const result = await api.getProducts()
    if (result.success) {
      productList.value = result.data || []
    } else {
      ElMessage.error(result.message || '获取产品列表失败')
    }
  } catch (error) {
    ElMessage.error('获取产品列表失败：' + error.message)
  }
}

onMounted(() => {
  fetchBills()
  loadProductList()
})
</script>

<style scoped>
.bills-page {
  animation: fadeIn 0.3s ease;
}

.page-header {
  text-align: center;
  margin-bottom: 20px;
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

.bills-card {
  background: #FFFFFF;
  border: 1px solid rgba(77, 103, 130, 0.12);
  border-radius: 8px;
  overflow: hidden;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.bills-card:hover {
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

.header-left {
  display: flex;
  align-items: center;
}

.header-left .el-icon {
  margin-right: 10px;
  font-size: 20px;
  color: #4D6782;
}

.query-section {
  padding: 20px;
  background: rgba(77, 103, 130, 0.03);
  border-bottom: 1px solid rgba(77, 103, 130, 0.08);
}

.query-form {
  margin: 0;
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  align-items: center;
  overflow-x: auto;
  padding-bottom: 5px;
}

.query-form :deep(.el-form-item) {
  margin-bottom: 0 !important;
  flex-shrink: 0 !important;
  height: 40px !important;
  display: flex !important;
  align-items: center !important;
  vertical-align: top !important;
}

.query-form :deep(.el-form--inline .el-form-item) {
  display: flex !important;
  height: 40px !important;
  margin-right: 32px !important;
  margin-bottom: 0 !important;
  vertical-align: top !important;
  align-items: center !important;
}

.query-form :deep(.el-form-item__content) {
  height: 40px !important;
  display: flex !important;
  align-items: center !important;
}

.query-form :deep(.el-form-item__label) {
  height: 40px !important;
  display: flex !important;
  align-items: center !important;
  line-height: 1.2 !important;
  padding-right: 8px !important;
  white-space: nowrap !important;
}

.query-form :deep(.el-input) {
  height: 40px !important;
  width: 100% !important;
  display: block !important;
}

.query-form :deep(.el-input .el-input__wrapper) {
  height: 40px !important;
  padding: 4px 10px !important;
}

.query-form :deep(.el-input .el-input__inner) {
  height: 32px !important;
  line-height: 32px !important;
  padding: 0 !important;
}

.query-form :deep(.el-button) {
  height: 40px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 0 20px !important;
  box-sizing: border-box !important;
}

.query-form :deep(.el-button span) {
  line-height: 1 !important;
  display: flex !important;
  align-items: center !important;
  gap: 4px !important;
}

/* 最终重置：确保所有表单相关元素都遵循40px高度 */
.query-form :deep(.el-form),
.query-form :deep(.el-form-item),
.query-form :deep(.el-form-item__content),
.query-form :deep(.el-form-item__label),
.query-form :deep(.el-input),
.query-form :deep(.el-input__wrapper),
.query-form :deep(.el-button) {
  height: 40px !important;
  max-height: 40px !important;
  min-height: 40px !important;
}

.query-form :deep(.el-input__inner),
.query-form :deep(.el-range-input) {
  height: 32px !important;
  max-height: 32px !important;
  line-height: 32px !important;
}

/* 强制覆盖inline-flex为flex */
.query-form :deep(.el-form--inline .el-form-item),
.query-form :deep(.el-form-item) {
  display: flex !important;
}

.query-form :deep(.el-date-editor) {
  height: 40px !important;
  max-height: 40px !important;
}

.date-picker {
  width: 100%;
  max-width: 260px;
  min-width: 240px;
  flex-shrink: 0;
}

@media (min-width: 1200px) {
  .date-picker {
    max-width: 300px;
  }
}

@media (min-width: 1400px) {
  .date-picker {
    max-width: 340px;
  }
}

.product-select {
  width: 100%;
  max-width: 220px;
  min-width: 200px;
  width: 220px !important;
  flex-shrink: 0;
  overflow: hidden;
  position: relative;
  display: block !important;
}

@media (min-width: 1200px) {
  .product-select {
    max-width: 260px;
    width: 260px !important;
  }
}

@media (min-width: 1400px) {
  .product-select {
    max-width: 300px;
    width: 300px !important;
  }
}

.product-select * {
  box-sizing: border-box;
  max-width: 100% !important;
}

.product-select :deep(*) {
  box-sizing: border-box;
  max-width: 100% !important;
}

.product-select :deep(.el-form-item__content) {
  width: 100% !important;
  max-width: 100% !important;
  overflow: hidden;
}

.product-select :deep(.el-select) {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 100% !important;
  display: block !important;
  overflow: hidden;
}

.product-select :deep(.el-input) {
  width: 100% !important;
  max-width: 100% !important;
  display: block !important;
  overflow: hidden;
}

.product-select :deep(.el-input__wrapper) {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 100% !important;
  display: block !important;
  overflow: hidden !important;
}

.product-select :deep(.el-input__inner) {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 100% !important;
  display: block !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

.product-select :deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(157, 180, 192, 0.3);
  box-shadow: none;
  transition: all 0.3s ease;
  border-radius: 8px;
  width: 100% !important;
  max-width: 100% !important;
  min-width: 100% !important;
  box-sizing: border-box;
  height: 40px !important;
  max-height: 40px !important;
  min-height: 40px !important;
  padding: 4px 10px;
  display: flex;
  align-items: center;
  overflow: hidden !important;
  line-height: 32px !important;
}

.product-select :deep(.el-input__wrapper):hover {
  border-color: #9DB4C0;
  box-shadow: 0 2px 8px rgba(157, 180, 192, 0.2);
}

.product-select :deep(.el-input__wrapper).is-focus {
  border-color: #9DB4C0;
  box-shadow: 0 0 0 3px rgba(157, 180, 192, 0.15);
  background: rgba(255, 255, 255, 1);
}

.product-select :deep(.el-select__tags) {
  flex-wrap: nowrap !important;
  overflow: hidden !important;
  max-height: 32px !important;
  height: 32px !important;
  min-height: 32px !important;
  width: calc(100% - 50px) !important;
  max-width: calc(100% - 50px) !important;
  align-items: center;
  display: flex !important;
  padding: 0 !important;
  margin: 0 !important;
  line-height: 32px !important;
  flex-shrink: 0;
}

.product-select :deep(.el-select__tags-text) {
  color: #333;
  font-size: 12px;
  max-width: 100% !important;
  width: auto !important;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 32px !important;
  flex-shrink: 0;
  height: 32px !important;
  display: flex;
  align-items: center;
}

.product-select :deep(.el-select__tags .el-select__tags-text) {
  height: 20px !important;
  line-height: 20px !important;
  display: inline-flex !important;
  align-items: center;
  background: #9DB4C0;
  color: white;
  border-radius: 3px;
  padding: 0 5px;
  margin: 0 0 0 2px;
  font-size: 11px;
  flex-shrink: 0;
  max-width: 60px !important;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-select :deep(.el-tag) {
  background-color: #9DB4C0;
  color: white;
  border: none;
  border-radius: 3px;
  margin: 0 1px 0 0;
  padding: 0 5px;
  height: 20px !important;
  line-height: 20px !important;
  font-size: 11px;
  max-width: 70px !important;
  width: auto !important;
  min-width: 0 !important;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 0;
  display: inline-flex !important;
  align-items: center;
  box-sizing: border-box;
}

.product-select :deep(.el-tag__close) {
  background-color: transparent;
  color: white;
  width: 12px;
  height: 12px;
  line-height: 12px;
  top: 3px;
  right: 0;
  position: relative;
  font-size: 12px;
  margin-left: 2px;
}

.product-select :deep(.el-tag__close:hover) {
  background-color: rgba(255, 255, 255, 0.3);
}

.product-select :deep(.el-select__tags .el-tag--info) {
  background-color: #9DB4C0;
  color: white;
}

.product-select :deep(.el-select__caret) {
  color: #909399;
  font-size: 14px;
  flex-shrink: 0;
}

.product-select :deep(.el-select__prefix) {
  display: flex;
  align-items: center;
  height: 100%;
}

.product-select :deep(*) {
  box-sizing: border-box;
}

.product-select :deep(.el-select) {
  position: relative;
  width: 100% !important;
  max-width: 100% !important;
  min-width: 100% !important;
  overflow: hidden;
}

.product-select :deep(.el-select .el-input) {
  height: 40px !important;
  width: 100% !important;
  max-width: 100% !important;
  min-width: 100% !important;
  overflow: hidden;
}

.product-select :deep(.el-select .el-input__wrapper) {
  height: 40px !important;
  max-height: 40px !important;
  min-height: 40px !important;
  overflow: hidden !important;
  width: 100% !important;
}

.product-select :deep(.el-select .el-input__inner) {
  height: 32px !important;
  max-height: 32px !important;
  min-height: 32px !important;
  overflow: hidden !important;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100% !important;
}

.product-select :deep(.el-select__content) {
  width: 100% !important;
  max-width: 100% !important;
  overflow: hidden;
}

.product-select :deep(.el-select__selected-center) {
  width: 100% !important;
  max-width: 100% !important;
  overflow: hidden;
}

.product-select :deep(.el-select__combobox) {
  width: 100% !important;
  max-width: 100% !important;
  overflow: hidden;
}

.product-select :deep(.el-input--suffix .el-input__inner) {
  padding-right: 50px !important;
}

.product-select :deep(.el-input__validateIcon) {
  display: none;
}

.product-select :deep(.el-select) .el-input__inner {
  width: 100% !important;
  max-width: 100% !important;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-select :deep(.el-select__close) {
  width: 16px !important;
  height: 16px !important;
  flex-shrink: 0;
  position: relative;
}

.product-select :deep(.el-select) {
  height: 40px !important;
  line-height: 40px !important;
  overflow: hidden !important;
}

.product-select :deep(.el-select .el-select__tags) {
  max-height: 32px !important;
  overflow: hidden !important;
}

.product-select :deep(.el-select__tags .el-tag) {
  max-height: 20px !important;
  overflow: hidden !important;
}

.product-select :deep(.el-select__tags .el-select__tags-text) {
  max-height: 20px !important;
  overflow: hidden !important;
}

.product-select :deep(.el-select .el-input__wrapper) {
  overflow: hidden !important;
}

.product-select :deep(.el-input__inner) {
  height: 32px !important;
  max-height: 32px !important;
  line-height: 32px !important;
  overflow: hidden;
  padding: 0;
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  flex: 1;
}

.product-select :deep(.el-select__input) {
  height: 32px !important;
  max-height: 32px !important;
  line-height: 32px !important;
  font-size: 13px;
  flex: 1;
  min-width: 0 !important;
  max-width: calc(100% - 50px) !important;
  padding: 0;
  margin: 0;
  width: auto !important;
}

.product-select :deep(.el-select__selected-item) {
  height: 32px !important;
  line-height: 32px !important;
  overflow: hidden;
  display: flex;
  align-items: center;
  max-width: 100% !important;
  width: auto !important;
}

.product-select :deep(.el-select) {
  display: flex;
  align-items: center;
  height: 40px !important;
  max-height: 40px !important;
  min-height: 40px !important;
  overflow: hidden;
}

.product-select :deep(.el-select__inner) {
  height: 40px !important;
  max-height: 40px !important;
  min-height: 40px !important;
  display: flex;
  align-items: center;
  overflow: hidden;
}

.product-select :deep(.el-select:hover .el-input__wrapper) {
  border-color: #9DB4C0;
}

.product-select :deep(.el-select__popper) {
  z-index: 9999;
}

.product-select :deep(.el-select__empty) {
  display: none;
}

.product-select :deep(.el-select__placeholder) {
  color: #c0c4cc;
  font-size: 13px;
  height: 32px !important;
  line-height: 32px !important;
  display: flex;
  align-items: center;
  overflow: hidden;
  white-space: nowrap;
  max-width: calc(100% - 50px) !important;
  width: auto !important;
}

.product-select :deep(.el-input__suffix) {
  height: 100%;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  width: 40px !important;
  min-width: 40px !important;
  max-width: 40px !important;
  position: relative;
}

.product-select :deep(.el-input__suffix-inner) {
  display: flex;
  align-items: center;
  height: 100%;
  width: 100% !important;
  justify-content: center;
  position: relative;
}

.product-select :deep(.el-select__icon) {
  height: 100%;
  display: flex;
  align-items: center;
  width: 20px !important;
  justify-content: center;
  flex-shrink: 0;
}

.product-select :deep(.el-input__prefix) {
  width: 0 !important;
  min-width: 0 !important;
  max-width: 0 !important;
  flex-shrink: 0;
  overflow: hidden;
}

.product-select :deep(.el-select) .el-input__count {
  height: 32px !important;
  line-height: 32px !important;
  display: flex;
  align-items: center;
}

.product-select :deep(.el-select__--small) {
  height: 40px !important;
}

.product-select :deep(.el-select__--small .el-input__inner) {
  height: 32px !important;
  line-height: 32px !important;
}

.product-select :deep(.el-select__--small .el-select__tags) {
  height: 32px !important;
  line-height: 32px !important;
}

.product-select :deep(.el-select-dropdown__item) {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-select :deep(.el-select-group__title) {
  font-size: 12px;
  color: #909399;
}

.date-picker {
  height: 40px !important;
}

.date-picker * {
  box-sizing: border-box;
}

/* 日期选择器顶层容器 */
.date-picker :deep(.el-date-picker) {
  height: 40px !important;
}

/* 日期编辑器 - 关键层级 */
.date-picker :deep(.el-date-editor) {
  width: 100% !important;
  height: 40px !important;
  max-height: 40px !important;
  display: flex !important;
  align-items: center !important;
}

/* 输入框容器 */
.date-picker :deep(.el-date-editor .el-input) {
  width: 100% !important;
  height: 40px !important;
  display: block;
}

/* 输入框包装器 - 最关键的一层 */
.date-picker :deep(.el-date-editor .el-input .el-input__wrapper) {
  background: rgba(255, 255, 255, 0.9) !important;
  border: 1px solid rgba(157, 180, 192, 0.3) !important;
  box-shadow: none !important;
  transition: all 0.3s ease !important;
  border-radius: 8px !important;
  width: 100% !important;
  height: 40px !important;
  max-height: 40px !important;
  min-height: 40px !important;
  padding: 4px 10px !important;
  display: flex !important;
  align-items: center !important;
  box-sizing: border-box !important;
}

.date-picker :deep(.el-date-editor .el-input .el-input__wrapper):hover {
  border-color: #9DB4C0 !important;
  box-shadow: 0 2px 8px rgba(157, 180, 192, 0.2) !important;
}

.date-picker :deep(.el-date-editor .el-input .el-input__wrapper).is-focus {
  border-color: #9DB4C0 !important;
  box-shadow: 0 0 0 3px rgba(157, 180, 192, 0.15) !important;
  background: rgba(255, 255, 255, 1) !important;
}

/* 内部输入框 */
.date-picker :deep(.el-date-editor .el-input .el-input__inner) {
  height: 32px !important;
  max-height: 32px !important;
  line-height: 32px !important;
  overflow: hidden !important;
  padding: 0 !important;
  border: none !important;
  background: transparent !important;
}

/* 范围分隔符 */
.date-picker :deep(.el-date-editor .el-input .el-range-separator) {
  height: 32px !important;
  line-height: 32px !important;
  font-size: 13px !important;
  color: #606266 !important;
  flex-shrink: 0 !important;
  display: flex !important;
  align-items: center !important;
  padding: 0 4px !important;
}

/* 范围输入框 */
.date-picker :deep(.el-date-editor .el-input .el-range-input) {
  height: 32px !important;
  max-height: 32px !important;
  line-height: 32px !important;
  font-size: 13px !important;
  flex: 1 !important;
  border: none !important;
  background: transparent !important;
  outline: none !important;
}

/* 范围图标 */
.date-picker :deep(.el-date-editor .el-input .el-range__icon) {
  height: 32px !important;
  line-height: 32px !important;
  flex-shrink: 0 !important;
  display: flex !important;
  align-items: center !important;
  margin-right: 4px !important;
}

/* 关闭图标 */
.date-picker :deep(.el-date-editor .el-input .el-range__close-icon) {
  height: 32px !important;
  line-height: 32px !important;
  flex-shrink: 0 !important;
  margin-left: 4px !important;
}

/* 前缀和后缀 */
.date-picker :deep(.el-date-editor .el-input .el-input__prefix) {
  height: 32px !important;
  line-height: 32px !important;
  display: flex !important;
  align-items: center !important;
}

.date-picker :deep(.el-date-editor .el-input .el-input__suffix) {
  height: 100% !important;
  display: flex !important;
  align-items: center !important;
}

/* 通用覆盖：确保所有日期相关元素高度一致 */
.date-picker :deep(*) {
  box-sizing: border-box !important;
}

.search-btn,
.reset-btn {
  height: 40px !important;
  padding: 0 20px;
  border-radius: 8px;
  transition: all 0.2s ease;
  font-weight: 500;
  white-space: nowrap;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.search-btn span,
.reset-btn span {
  display: flex;
  align-items: center;
  gap: 4px;
  line-height: 1;
}

.search-btn {
  margin-right: 10px;
  background: #4D6782;
  border: none;
  color: #FFFFFF;
  font-weight: 500;
}

.search-btn:hover {
  background: #3d5568;
  box-shadow: 0 1px 4px rgba(77, 103, 130, 0.15);
}

.reset-btn {
  background: #FFFFFF;
  border: 1px solid #b8a99a;
  color: #8b7b6f;
  font-weight: 500;
}

.reset-btn:hover {
  background: rgba(184, 169, 154, 0.1);
  border-color: #a89988;
  color: #7a6b5f;
}

.bills-table {
  margin-top: 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.bills-table :deep(.el-table) {
  background: transparent;
  color: #5A5A5A;
  min-width: 100%;
}

.bills-table :deep(.el-table__header) {
  background: rgba(245, 245, 245, 0.8);
  min-width: 100%;
}

.bills-table :deep(.el-table__header th) {
  background: rgba(245, 245, 245, 0.8);
  font-weight: 600;
  color: #6B6B6B;
  border-bottom: 1px solid rgba(157, 180, 192, 0.2);
  position: relative;
  white-space: nowrap;
}

.bills-table :deep(.el-table__header th::after) {
  content: '';
  position: absolute;
  right: 0;
  top: 25%;
  width: 1px;
  height: 50%;
  background: rgba(157, 180, 192, 0.1);
}

.bills-table :deep(.el-table__header th:last-child::after) {
  display: none;
}

.bills-table :deep(.el-table__body) {
  min-width: 100%;
}

.bills-table :deep(.el-table__body td) {
  white-space: nowrap;
}

.bills-table :deep(.el-table__body tr) {
  background: #FFFFFF;
  transition: all 0.2s ease;
}

.bills-table :deep(.el-table__body tr:hover > td) {
  background: rgba(157, 180, 192, 0.08) !important;
}

.bills-table :deep(.el-table__body td) {
  border-bottom: 1px solid #F0F0F0;
}

.number-cell {
  font-weight: 600;
  color: #9DB4C0;
}

.amount-cell {
  font-weight: 700;
  color: #A8C686;
}

.pagination-section {
  padding: 12px 20px 0 0;
  display: flex;
  justify-content: flex-end;
  width: 100%;
}

.custom-pagination :deep(.el-pager li) {
  background: #FFFFFF;
  border: 1px solid #D0D0D0;
  color: #6B6B6B;
  border-radius: 8px;
  margin: 0 4px;
  transition: all 0.2s ease;
  font-weight: 500;
}

.custom-pagination :deep(.el-pager li):hover {
  color: #9DB4C0;
  border-color: #9DB4C0;
}

.custom-pagination :deep(.el-pager li.is-active) {
  background: #9DB4C0;
  color: #FFFFFF;
  border-color: #9DB4C0;
  font-weight: 600;
}

/* 详情弹窗样式 */
.bill-detail {
  max-height: 70vh;
  overflow-y: auto;
  padding-right: 10px;
}

.bill-detail :deep(.el-descriptions__label) {
  font-weight: 600;
  color: #4D6782;
  background: rgba(77, 103, 130, 0.05);
  word-break: break-all;
}

.bill-detail :deep(.el-descriptions__content) {
  color: #5A5A5A;
  word-break: break-all;
}

.bill-detail .long-text {
  word-break: break-all;
  overflow-wrap: break-word;
  white-space: normal;
  display: inline-block;
  max-width: 100%;
  cursor: default;
}

.bill-detail :deep(.el-tooltip__popper) {
  max-width: 400px;
  word-break: break-all;
  white-space: normal;
}

/* 修复操作列透明问题 - 解决表头文字透过问题 */

/* 专门修复表头固定列的背景透明度 */
.bills-table :deep(.el-table__header) {
  background: #FFFFFF !important;
  background-color: #FFFFFF !important;
}

.bills-table :deep(.el-table__header-wrapper) {
  background: #FFFFFF !important;
  background-color: #FFFFFF !important;
}

.bills-table :deep(.el-table__header th) {
  background: #FFFFFF !important;
  background-color: #FFFFFF !important;
}

/* 专门修复表头右侧固定列（操作列） */
.bills-table :deep(.el-table__header .el-table__fixed-right) {
  background: #FFFFFF !important;
  background-color: #FFFFFF !important;
  backdrop-filter: none !important;
}

.bills-table :deep(.el-table__header .el-table__fixed-right .el-table__cell) {
  background: #FFFFFF !important;
  background-color: #FFFFFF !important;
}

/* 强制设置所有可能的固定列背景 */
.bills-table :deep(div[class*="el-table__fixed"]) {
  background: #FFFFFF !important;
  background-color: #FFFFFF !important;
}

/* 强制设置所有固定列单元格的背景 */
.bills-table :deep(div[class*="el-table__fixed"] .el-table__cell) {
  background: #FFFFFF !important;
  background-color: #FFFFFF !important;
}

/* 强制设置所有单元格背景 */
.bills-table :deep(.el-table__cell) {
  background: inherit;
}

/* 修复固定列单元格的hover状态 */
.bills-table :deep(.el-table__body tr:hover > td[class*="fixed"]) {
  background: #F5F7FA !important;
  background-color: #F5F7FA !important;
}

/* 如果有行选中状态，也要保持不透明 */
.bills-table :deep(.el-table__body tr.current-row > td[class*="fixed"]),
.bills-table :deep(.el-table__body tr.selected > td[class*="fixed"]) {
  background: #EBF8FF !important;
  background-color: #EBF8FF !important;
}

/* 账单编号文本点击样式 */
.bills-table :deep(.billing-no-text) {
  cursor: pointer;
  transition: color 0.2s ease;
  color: #409EFF;
}

.bills-table :deep(.billing-no-text:hover) {
  color: #66b1ff;
}
</style>
