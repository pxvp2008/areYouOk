<template>
  <div class="product-pie-chart">
    <div class="chart-header">
      <div class="chart-title">
        <el-icon class="chart-icon"><PieChart /></el-icon>
        <span>产品占比</span>
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
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { PieChart } from '@element-plus/icons-vue'

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

// 截取产品名称显示
const getShortName = (name) => {
  return name.length > 9 ? name.substring(0, 9) + '...' : name
}

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

// 饼图配置
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

  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      textStyle: {
        color: '#FFFFFF'
      },
      appendTo: 'body',
      formatter: function(params) {
        const percent = params.percent.toFixed(1)
        const value = params.value.toLocaleString()
        const fullName = props.data.productNames[params.dataIndex]
        return `
          <div style="margin-bottom: 6px; font-weight: 600; font-size: 13px; line-height: 1.4;">${fullName}</div>
          <div style="display: flex; align-items: center; margin: 4px 0;">
            <span style="display: inline-block; width: 8px; height: 8px; background-color: ${params.color}; border-radius: 50%; margin-right: 8px;"></span>
            <span style="flex: 1;">占比:</span>
            <span style="font-weight: 600; margin-left: 16px;">${percent}%</span>
          </div>
          <div style="display: flex; align-items: center; margin: 4px 0;">
            <span style="flex: 1;">数量:</span>
            <span style="font-weight: 600; margin-left: 16px;">${value}</span>
          </div>
        `
      }
    },
    legend: {
      type: 'scroll',
      orient: 'vertical',
      right: 5,
      top: '15%',
      bottom: 10,
      width: 100,
      formatter: function(name) {
        return getShortName(name)
      },
      textStyle: {
        color: '#5A5A5A',
        fontSize: 11,
        lineHeight: 16
      },
      itemWidth: 15,
      itemHeight: 10,
      pageIconColor: '#4D6782',
      pageIconInactiveColor: '#D0D0D0',
      pageTextStyle: {
        color: '#8E8E8E'
      }
    },
    series: [
      {
        name: '产品占比',
        type: 'pie',
        radius: ['40%', '60%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: true,
        padAngle: 2,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#FFFFFF',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center',
          formatter: function(params) {
            return `{name|${params.name}}\n{percent|${params.percent}%}`
          },
          rich: {
            name: {
              fontSize: 16,
              fontWeight: 600,
              color: '#4D6782',
              lineHeight: 24
            },
            percent: {
              fontSize: 24,
              fontWeight: 700,
              color: '#4D6782',
              lineHeight: 30
            }
          }
        },
        emphasis: {
          scale: true,
          scaleSize: 8,
          label: {
            show: true
          },
          itemStyle: {
            shadowBlur: 15,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.3)'
          }
        },
        labelLine: {
          show: false
        },
        data: seriesData
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
.product-pie-chart {
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
