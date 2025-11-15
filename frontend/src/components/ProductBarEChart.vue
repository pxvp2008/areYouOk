<template>
  <div class="product-bar-echart">
    <div class="chart-header">
      <div class="chart-title">
        <el-icon class="chart-icon"><Histogram /></el-icon>
        <span>产品调用次数</span>
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
import { ref, computed } from 'vue'
import VChart from 'vue-echarts'
import { Histogram } from '@element-plus/icons-vue'

const props = defineProps({
  data: {
    type: Object,
    default: () => ({
      productNames: [],
      productValues: []
    })
  }
})

const emit = defineEmits(['chart-click'])

// 颜色主题
const colorPalette = [
  '#4D6782',
  '#A8C686',
  '#B8A99A',
  '#9DB4C0',
  '#D4B5A0',
  '#C4CED9',
  '#8A9BA8',
  '#E6B8A2'
]

// 截取产品名称显示
const getShortName = (name) => {
  return name.length > 9 ? name.substring(0, 9) + '...' : name
}

// 柱状图配置
const option = computed(() => {
  if (!props.data || !props.data.productNames || props.data.productNames.length === 0) {
    return null
  }

  const seriesData = props.data.productNames.map((name, index) => ({
    name: name,
    value: props.data.productValues[index],
    itemStyle: {
      color: colorPalette[index % colorPalette.length]
    }
  }))

  const shortNames = props.data.productNames.map(name => getShortName(name))

  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      textStyle: {
        color: '#FFFFFF'
      },
      axisPointer: {
        type: 'shadow'
      },
      appendTo: 'body',
      formatter: function(params) {
        const param = params[0]
        const value = param.value.toLocaleString()
        const fullName = props.data.productNames[param.dataIndex]
        return `
          <div style="margin-bottom: 6px; font-weight: 600; font-size: 13px; line-height: 1.4;">${fullName}</div>
          <div style="display: flex; align-items: center; margin: 4px 0;">
            <span style="display: inline-block; width: 8px; height: 8px; background-color: ${param.color}; border-radius: 50%; margin-right: 8px;"></span>
            <span style="flex: 1;">数量:</span>
            <span style="font-weight: 600; margin-left: 16px;">${value}</span>
          </div>
        `
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: shortNames,
      axisLine: {
        lineStyle: {
          color: 'rgba(77, 103, 130, 0.2)'
        }
      },
      axisLabel: {
        color: '#8E8E8E',
        fontSize: 10,
        interval: 0,
        rotate: 45,
        margin: 15
      }
    },
    yAxis: {
      type: 'value',
      axisLine: {
        show: true,
        lineStyle: {
          color: 'rgba(77, 103, 130, 0.2)'
        }
      },
      axisLabel: {
        color: '#8E8E8E',
        fontSize: 11,
        formatter: function(value) {
          if (value >= 1000) {
            return (value / 1000).toFixed(1) + 'k'
          }
          return value.toString()
        }
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(77, 103, 130, 0.08)',
          type: 'dashed'
        }
      }
    },
    series: [
      {
        name: '产品调用次数',
        type: 'bar',
        data: seriesData,
        barWidth: '50%',
        itemStyle: {
          borderRadius: [4, 4, 0, 0]
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.3)'
          }
        }
      }
    ]
  }
})

// 处理图表点击事件
const handleChartClick = (params) => {
  emit('chart-click', params)
}
</script>

<style scoped>
.product-bar-echart {
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
