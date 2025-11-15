<template>
  <div class="hourly-echart">
    <div class="chart-header">
      <div class="chart-title">
        <el-icon class="chart-icon"><TrendCharts /></el-icon>
        <span>{{ title }}</span>
      </div>
    </div>
    <div class="chart-container">
      <v-chart
        v-if="option"
        class="chart"
        :option="option"
        :autoresize="true"
        @click="handleChartClick"
      />
      <div v-else class="chart-empty">
        <el-empty description="暂无数据" :image-size="80" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import VChart from 'vue-echarts'
import { TrendCharts } from '@element-plus/icons-vue'

const props = defineProps({
  data: {
    type: Object,
    default: () => ({
      labels: [],
      callCountData: [],
      tokenData: []
    })
  },
  title: {
    type: String,
    default: '每小时调用次数和 Token 数量'
  }
})

const emit = defineEmits(['chart-click'])

// 图表配置
const option = computed(() => {
  if (!props.data || !props.data.labels || props.data.labels.length === 0) {
    return null
  }

  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      textStyle: {
        color: '#FFFFFF'
      },
      axisPointer: {
        type: 'cross',
        crossStyle: {
          color: '#4D6782'
        }
      },
      formatter: function(params) {
        let result = `<div style="margin-bottom: 4px; font-weight: 600;">${params[0].axisValue}</div>`
        params.forEach(param => {
          const color = param.color
          const value = param.seriesName.includes('Token')
            ? formatTokenNumber(param.value)
            : formatCallNumber(param.value)
          result += `
            <div style="display: flex; align-items: center; margin: 4px 0;">
              <span style="display: inline-block; width: 8px; height: 8px; background-color: ${color}; border-radius: 50%; margin-right: 8px;"></span>
              <span style="flex: 1;">${param.seriesName}:</span>
              <span style="font-weight: 600; margin-left: 16px;">${value}</span>
            </div>
          `
        })
        return result
      }
    },
    legend: {
      data: ['调用次数', 'Token 数量'],
      top: 10,
      textStyle: {
        color: '#5A5A5A',
        fontSize: 12
      },
      itemWidth: 15,
      itemHeight: 10
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      top: '18%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: props.data.labels,
      axisLine: {
        lineStyle: {
          color: 'rgba(77, 103, 130, 0.2)'
        }
      },
      axisLabel: {
        color: '#8E8E8E',
        fontSize: 11
      }
    },
    yAxis: [
      {
        type: 'value',
        name: '调用次数',
        position: 'left',
        axisLine: {
          show: true,
          lineStyle: {
            color: 'rgba(77, 103, 130, 0.5)'
          }
        },
        axisLabel: {
          color: '#8E8E8E',
          fontSize: 11,
          formatter: function(value) {
            return formatCallNumber(value)
          }
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(77, 103, 130, 0.08)',
            type: 'dashed'
          }
        }
      },
      {
        type: 'value',
        name: 'Token 数量',
        position: 'right',
        axisLine: {
          show: true,
          lineStyle: {
            color: 'rgba(168, 198, 134, 0.5)'
          }
        },
        axisLabel: {
          color: '#8E8E8E',
          fontSize: 11,
          formatter: function(value) {
            return formatTokenNumber(value)
          }
        },
        splitLine: {
          show: false
        }
      }
    ],
    series: [
      {
        name: '调用次数',
        type: 'line',
        yAxisIndex: 0,
        data: props.data.callCountData || [],
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          width: 3,
          color: '#4D6782'
        },
        itemStyle: {
          color: '#4D6782',
          borderColor: '#FFFFFF',
          borderWidth: 2
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(77, 103, 130, 0.3)' },
              { offset: 1, color: 'rgba(77, 103, 130, 0.05)' }
            ]
          }
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(77, 103, 130, 0.5)'
          }
        }
      },
      {
        name: 'Token 数量',
        type: 'line',
        yAxisIndex: 1,
        data: props.data.tokenData || [],
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          width: 3,
          color: '#A8C686'
        },
        itemStyle: {
          color: '#A8C686',
          borderColor: '#FFFFFF',
          borderWidth: 2
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(168, 198, 134, 0.3)' },
              { offset: 1, color: 'rgba(168, 198, 134, 0.05)' }
            ]
          }
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(168, 198, 134, 0.5)'
          }
        }
      }
    ],
    dataZoom: [
      {
        type: 'slider',
        show: props.data.labels && props.data.labels.length > 10,
        height: 15,
        bottom: 5,
        brushSelect: false,
        fillerColor: 'rgba(77, 103, 130, 0.2)',
        borderColor: 'rgba(77, 103, 130, 0.3)',
        handleStyle: {
          color: '#4D6782'
        },
        textStyle: {
          color: '#8E8E8E'
        }
      }
    ]
  }
})

// 格式化调用次数
const formatCallNumber = (value) => {
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'k'
  }
  return value.toString()
}

// 格式化Token数量
const formatTokenNumber = (value) => {
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M'
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'k'
  }
  return value.toString()
}

// 处理图表点击事件
const handleChartClick = (params) => {
  emit('chart-click', params)
}
</script>

<style scoped>
.hourly-echart {
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
  position: relative;
}

.chart {
  height: 100%;
  min-height: 200px;
}

.chart-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
}
</style>
