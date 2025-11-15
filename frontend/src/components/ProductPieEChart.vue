<template>
  <div class="product-pie-echart">
    <div class="chart-header">
      <div class="chart-title">
        <el-icon class="chart-icon"><PieChart /></el-icon>
        <span>产品分布</span>
      </div>
    </div>
    <div class="chart-container">
      <div class="charts-wrapper" :class="{ 'single-chart': mode === 'pie-only' }">
        <div class="chart-item" v-if="mode === 'pie-only' || mode === 'both'">
          <div class="chart-subtitle">产品占比</div>
          <v-chart
            v-if="pieOption"
            class="chart"
            :option="pieOption"
            :autoresize="true"
            @click="handleChartClick"
          />
          <div v-else class="chart-empty">
            <el-empty description="暂无数据" :image-size="80" />
          </div>
        </div>

        <div class="chart-item" v-if="mode === 'both'">
          <div class="chart-subtitle">产品调用次数</div>
          <v-chart
            v-if="barOption"
            class="chart"
            :option="barOption"
            :autoresize="true"
            @click="handleChartClick"
          />
          <div v-else class="chart-empty">
            <el-empty description="暂无数据" :image-size="80" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import VChart from 'vue-echarts'
import { PieChart as PieChartIcon } from '@element-plus/icons-vue'

const props = defineProps({
  data: {
    type: Object,
    default: () => ({
      productNames: [],
      productValues: []
    })
  },
  mode: {
    type: String,
    default: 'both',  // 'both' - 显示饼图和柱状图, 'pie-only' - 只显示饼图
    validator: (value) => ['both', 'pie-only'].includes(value)
  }
})

const emit = defineEmits(['chart-click'])

// 截取产品名称显示
const getShortName = (name) => {
  return name.length > 9 ? name.substring(0, 9) + '...' : name
}

// 颜色主题
const colorPalette = [
  '#4D6782',  // 主色
  '#A8C686',  // 绿色
  '#B8A99A',  // 棕色
  '#9DB4C0',  // 浅蓝
  '#D4B5A0',  // 浅棕
  '#C4CED9',  // 浅灰
  '#8A9BA8',  // 灰蓝
  '#E6B8A2'   // 桃色
]

// 饼图配置
const pieOption = computed(() => {
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
        name: '产品分布',
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
            const percent = params.percent.toFixed(1)
            return `{name|${params.name}}\n{percent|${percent}%}`
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

// 柱状图配置
const barOption = computed(() => {
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
      formatter: function(params) {
        const param = params[0]
        const value = param.value.toLocaleString()
        const fullName = props.data.productNames[param.dataIndex]
        return `
          <div style="margin-bottom: 4px; font-weight: 600;">${fullName}</div>
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
      bottom: '3%',
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
        fontSize: 11,
        interval: 0,
        rotate: props.data.productNames.length > 4 ? 45 : 0
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
        name: '产品分布',
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
.product-pie-echart {
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

.charts-wrapper {
  display: flex;
  gap: 20px;
  height: 100%;
}

.charts-wrapper.single-chart {
  justify-content: center;
}

.chart-item {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.charts-wrapper.single-chart .chart-item {
  flex: 0 0 auto;
  width: 60%;
}

.chart-subtitle {
  font-size: 13px;
  font-weight: 600;
  color: #5A5A5A;
  margin-bottom: 8px;
  padding-left: 4px;
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
