<script setup>
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="app-container">
    <RouterView />
  </div>
</template>

<style>
html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  background-color: #f5f7fb;
  color: #1e293b;
  font-family:
    'Inter',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    Oxygen,
    Ubuntu,
    Cantarell,
    'Open Sans',
    'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.app-container {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  position: relative;
}

/* Ant Design组件全局样式 */
.ant-btn {
  border-radius: 4px;
  font-weight: 500;
  box-shadow: none;
  line-height: 1.5;
}

.ant-btn-primary {
  background-color: #3b82f6;
  border-color: #3b82f6;
}

.ant-btn-primary:hover,
.ant-btn-primary:focus {
  background-color: #2563eb;
  border-color: #2563eb;
}

.ant-input,
.ant-input-password {
  border-radius: 4px;
  border-color: #e2e8f0;
  background-color: #fff;
  padding: 6px 12px;
  box-shadow: none;
}

.ant-input:hover,
.ant-input:focus,
.ant-input-password:hover,
.ant-input-password:focus {
  border-color: #3b82f6;
  box-shadow: none;
}

.ant-form-item-label > label {
  font-weight: 500;
  color: #475569;
}

.ant-select:not(.ant-select-customize-input) .ant-select-selector {
  border-radius: 4px;
  border-color: #e2e8f0;
  box-shadow: none;
}

.ant-select-focused:not(.ant-select-disabled).ant-select:not(.ant-select-customize-input)
  .ant-select-selector {
  border-color: #3b82f6;
  box-shadow: none;
}

.ant-modal-content {
  border-radius: 8px;
  overflow: hidden;
  box-shadow:
    0 10px 25px -5px rgba(0, 0, 0, 0.1),
    0 8px 10px -6px rgba(0, 0, 0, 0.05);
}

.ant-modal-header {
  border-bottom: 1px solid #f1f5f9;
  padding: 16px 24px;
}

.ant-modal-title {
  font-weight: 600;
  color: #1e293b;
}

.ant-modal-body {
  padding: 24px;
}

.ant-modal-footer {
  border-top: 1px solid #f1f5f9;
  padding: 16px 24px;
}

.ant-message-notice-content {
  border-radius: 4px;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  padding: 12px 16px;
}
</style>
