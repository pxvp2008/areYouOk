<template>
  <div class="stat-card-vertical">
    <!-- 第一行：图标 + 提示文字 -->
    <div class="stat-row-1">
      <div class="stat-icon-cell">
        <el-icon class="stat-icon-vertical">
          <component :is="iconComponent" />
        </el-icon>
      </div>
      <div class="stat-label-cell">
        <div class="stat-label">{{ label }}</div>
      </div>
    </div>

    <!-- 第二行：数据（居中显示） -->
    <div class="stat-row-2">
      <div class="stat-value-cell">
        <span class="stat-value-vertical">{{ value }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  Message,
  Coin,
  Money,
  Histogram
} from '@element-plus/icons-vue'

const props = defineProps({
  label: {
    type: String,
    required: true
  },
  value: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    required: true,
    validator: (value) => ['Message', 'Coin', 'Money', 'Histogram'].includes(value)
  }
})

const iconMap = {
  Message,
  Coin,
  Money,
  Histogram
}

const iconComponent = computed(() => {
  return iconMap[props.icon] || Message
})
</script>

<style scoped>
.stat-card-vertical {
  background: rgba(77, 103, 130, 0.02);
  border: 1px solid rgba(77, 103, 130, 0.08);
  border-radius: 10px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
  /* 扁平化设计：移除所有动画和过渡效果 */
}

/* 扁平化设计：移除渐变遮罩层，简化视觉层次 */

.stat-card-vertical:hover {
  /* 扁平化设计：移除hover动画效果 */
  /* 仅保留边框颜色变化作为交互反馈 */
  border-color: rgba(77, 103, 130, 0.15);
}

.stat-row-1 {
  display: grid;
  grid-template-columns: 1fr 3fr;
  gap: 8px;
  padding: 14px 16px 8px;
  align-items: center;
  position: relative;
  z-index: 1;
}

.stat-icon-cell {
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon-vertical {
  font-size: 12px;
  color: #4D6782;
  opacity: 0.85;
  /* 扁平化设计：移除所有过渡动画 */
}

.stat-card-vertical:hover .stat-icon-vertical {
  /* 扁平化设计：移除缩放和颜色动画 */
  opacity: 1;
  color: #4D6782; /* 保持原色，避免视觉跳动 */
}

.stat-label-cell {
  display: flex;
  align-items: center;
}

.stat-label {
  font-size: 12px;
  opacity: 0.75;
  color: #6B7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-row-2 {
  display: grid;
  grid-template-columns: 1fr;
  padding: 8px 16px 14px;
  position: relative;
  z-index: 1;
}

.stat-value-cell {
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-value-vertical {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
  color: #4D6782;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  /* 扁平化设计：移除所有动画效果 */
}

.stat-card-vertical:hover .stat-value-vertical {
  /* 扁平化设计：移除hover缩放动画 */
}
</style>
