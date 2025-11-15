<template>
  <div class="hourly-chart">
    <div class="chart-header">
      <div class="chart-title">
        <el-icon class="chart-icon"><TrendCharts /></el-icon>
        <span>每小时调用次数和 Token 数量</span>
      </div>
    </div>
    <div class="chart-container">
      <Line
        v-if="chartData && chartData.labels.length > 0"
        :data="chartData"
        :options="chartOptions"
        :height="200"
      />
      <div v-else class="chart-empty">
        <el-empty description="暂无数据" :image-size="80" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  CategoryScale,
  Filler
} from 'chart.js'
import { TrendCharts } from '@element-plus/icons-vue'

// 注册Chart.js组件
ChartJS.register(
  Title,
  Tooltip,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  CategoryScale,
  Filler
)

const props = defineProps({
  data: {
    type: Object,
    default: () => ({
      labels: [],
      callCountData: [],
      tokenData: []
    })
  }
})

// 图表数据
const chartData = computed(() => {
  if (!props.data || !props.data.labels || props.data.labels.length === 0) {
    return null
  }

  return {
    labels: props.data.labels,
    datasets: [
      {
        label: '调用次数',
        data: props.data.callCountData || [],
        borderColor: '#4D6782',
        backgroundColor: 'rgba(77, 103, 130, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#4D6782',
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 2
      },
      {
        label: 'Token 数量',
        data: props.data.tokenData || [],
        borderColor: '#A8C686',
        backgroundColor: 'rgba(168, 198, 134, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#A8C686',
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 2,
        yAxisID: 'y1'
      }
    ]
  }
})

// 图表配置
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false
  },
  plugins: {
    legend: {
      position: 'top',
      labels: {
        font: {
          size: 12,
          family: 'system-ui, -apple-system, sans-serif'
        },
        padding: 15,
        usePointStyle: true,
        pointStyle: 'circle'
      }
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: 12,
      titleFont: {
        size: 13
      },
      bodyFont: {
        size: 12
      },
      callbacks: {
        label: function(context) {
          let label = context.dataset.label || ''
          if (label) {
            label += ': '
          }
          const value = context.parsed.y
          if (context.datasetIndex === 1) {
            // Token数据
            if (value >= 1000000) {
              label += (value / 1000000).toFixed(2) + 'M'
            } else if (value >= 1000) {
              label += (value / 1000).toFixed(1) + 'k'
            } else {
              label += value
            }
          } else {
            label += value.toLocaleString()
          }
          return label
        }
      }
    }
  },
  scales: {
    x: {
      grid: {
        display: false
      },
      ticks: {
        font: {
          size: 11
        }
      }
    },
    y: {
      type: 'linear',
      display: true,
      position: 'left',
      title: {
        display: true,
        text: '调用次数',
        font: {
          size: 11
        }
      },
      grid: {
        color: 'rgba(0, 0, 0, 0.05)'
      },
      ticks: {
        font: {
          size: 11
        },
        callback: function(value) {
          return value.toLocaleString()
        }
      }
    },
    y1: {
      type: 'linear',
      display: true,
      position: 'right',
      title: {
        display: true,
        text: 'Token 数量',
        font: {
          size: 11
        }
      },
      grid: {
        drawOnChartArea: false
      },
      ticks: {
        font: {
          size: 11
        },
        callback: function(value) {
          if (value >= 1000000) {
            return (value / 1000000).toFixed(1) + 'M'
          } else if (value >= 1000) {
            return (value / 1000).toFixed(1) + 'k'
          }
          return value
        }
      }
    }
  }
}
</script>

<style scoped>
.hourly-chart {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chart-header {
  padding: 16px 20px 8px;
  border-bottom: 1px solid rgba(77, 103, 130, 0.08);
}

.chart-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #4D6782;
}

.chart-icon {
  font-size: 16px;
}

.chart-container {
  flex: 1;
  padding: 20px;
  min-height: 200px;
}

.chart-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
}
</style>
