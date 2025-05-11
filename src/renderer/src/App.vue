<script setup lang="ts">
// 这里可以添加你的组件逻辑
</script>

<template>
  <div class="container mx-auto p-4">
    <h1 class="text-3xl font-bold text-center text-blue-600 mb-8">日报生成系统</h1>
    
    <div class="flex justify-center gap-4 mb-8">
      <a-button type="primary">主要按钮</a-button>
      <a-button>默认按钮</a-button>
      <a-button type="dashed">虚线按钮</a-button>
    </div>

    <div class="bg-white shadow-md rounded-lg p-6 max-w-lg mx-auto">
      <a-form layout="vertical">
        <a-form-item label="日期">
          <a-date-picker class="w-full" />
        </a-form-item>
        <a-form-item label="标题">
          <a-input placeholder="请输入日报标题" />
        </a-form-item>
        <a-form-item label="内容">
          <a-textarea placeholder="请输入日报内容" :rows="4" />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" block>提交</a-button>
        </a-form-item>
      </a-form>
    </div>
  </div>
</template>

<style>
/* 全局样式可以放在这里 */
</style>
