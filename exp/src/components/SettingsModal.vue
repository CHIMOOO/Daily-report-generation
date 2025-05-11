<script setup>
import { ref, onMounted } from 'vue'
import { Modal, Form, Input, Button, message, Select } from 'ant-design-vue'
import {
  saveApiKey,
  isApiKeyConfigured,
  AVAILABLE_MODELS,
  getSelectedModel,
  saveSelectedModel,
} from '../services/deepseekService'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:visible', 'saved'])

const apiKey = ref('')
const selectedModel = ref('')
const isApiConfigured = ref(isApiKeyConfigured())
const loading = ref(false)

// 组件加载时检查缓存中是否有API Key和选定的模型
onMounted(() => {
  // 检查localStorage中是否有密钥
  const savedKey = localStorage.getItem('deepseek_api_key')
  if (savedKey) {
    // 为了安全起见，不直接显示完整的API密钥
    apiKey.value = maskApiKey(savedKey)
    isApiConfigured.value = true
  }

  // 获取已保存的模型选择
  selectedModel.value = getSelectedModel()
})

// 掩盖API密钥，只显示前4位和后4位
const maskApiKey = (key) => {
  if (!key || key.length < 8) return key
  const prefix = key.substring(0, 4)
  const suffix = key.substring(key.length - 4)
  return `${prefix}${'*'.repeat(key.length - 8)}${suffix}`
}

const showModal = () => {
  emit('update:visible', true)
}

const handleCancel = () => {
  emit('update:visible', false)
}

// 处理模型选择改变
const handleModelChange = (value) => {
  selectedModel.value = value
}

const handleSave = () => {
  if (!apiKey.value.trim()) {
    message.error('请输入有效的API密钥')
    return
  }

  loading.value = true

  try {
    // 保存API密钥到localStorage
    // 判断是否为掩码形式，如果是则不覆盖原有密钥
    if (!apiKey.value.includes('*')) {
      saveApiKey(apiKey.value.trim())
      message.success('API密钥已保存')
    }

    // 保存选定的模型
    saveSelectedModel(selectedModel.value)
    message.success('设置已保存')

    isApiConfigured.value = true
    loading.value = false
    emit('saved')
    handleCancel()
  } catch (error) {
    console.error('保存设置时出错:', error)
    message.error('保存失败，请重试')
    loading.value = false
  }
}

// 测试API连接
const testConnection = async () => {
  if (!apiKey.value.trim()) {
    message.error('请先输入API密钥')
    return
  }

  loading.value = true
  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.value.includes('*') ? localStorage.getItem('deepseek_api_key') : apiKey.value}`,
      },
      body: JSON.stringify({
        model: selectedModel.value,
        messages: [{ role: 'user', content: '你好' }],
        max_tokens: 5,
      }),
    })

    const data = await response.json()

    if (response.ok) {
      message.success('连接成功！API密钥有效')
    } else {
      message.error(`连接失败: ${data.error?.message || '未知错误'}`)
    }
  } catch (error) {
    message.error(`连接测试失败: ${error.message}`)
  } finally {
    loading.value = false
  }
}

// 暴露方法供父组件调用
defineExpose({
  showModal,
})
</script>

<template>
  <Modal
    title="设置"
    :visible="props.visible"
    :footer="null"
    @cancel="handleCancel"
    :bodyStyle="{
      background: 'white',
      color: '#1e293b',
      borderRadius: '12px',
      padding: '24px',
    }"
    :maskStyle="{
      backdropFilter: 'blur(5px)',
      background: 'rgba(0,0,0,0.2)',
    }"
    class="tech-modal"
  >
    <div class="tech-header mb-4">
      <div class="tech-icon">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M12 22C6.5 22 2 17.5 2 12S6.5 2 12 2s10 4.5 10 10-4.5 10-10 10z"></path>
          <path d="M12 18c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6z"></path>
          <path d="M12 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"></path>
        </svg>
      </div>
      <div class="tech-title">API密钥配置</div>
    </div>

    <Form layout="vertical">
      <Form.Item
        label="DeepSeek API密钥"
        required
        :labelCol="{
          style: { color: '#475569', marginBottom: '8px', fontSize: '14px', fontWeight: '500' },
        }"
      >
        <Input.Password
          v-model:value="apiKey"
          placeholder="请输入DeepSeek API密钥"
          class="tech-input"
        />
        <div class="mt-2 text-gray-500 text-sm flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="mr-2"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          获取API密钥请访问:
          <a
            href="https://platform.deepseek.com"
            target="_blank"
            class="text-blue-600 hover:text-blue-700 ml-1"
            >DeepSeek平台</a
          >
        </div>
      </Form.Item>

      <Form.Item
        label="选择模型"
        :labelCol="{
          style: { color: '#475569', marginBottom: '8px', fontSize: '14px', fontWeight: '500' },
        }"
      >
        <Select
          v-model:value="selectedModel"
          placeholder="请选择模型"
          class="tech-select w-full"
          @change="handleModelChange"
        >
          <Select.Option v-for="model in AVAILABLE_MODELS" :key="model.id" :value="model.id">
            <div class="flex flex-col">
              <span class="font-medium">{{ model.name }}</span>
              <span class="text-xs text-gray-500">{{ model.description }}</span>
            </div>
          </Select.Option>
        </Select>
      </Form.Item>

      <div class="security-note mt-4 text-sm">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="mr-1 inline-block"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
        安全提示：API密钥将安全存储在本地浏览器中，不会上传到任何服务器
      </div>

      <div class="flex flex-wrap justify-between gap-3 mt-6">
        <Button @click="testConnection" class="tech-test-btn" :loading="loading">
          <span v-if="!loading" class="mr-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </span>
          测试连接
        </Button>

        <div class="flex gap-3">
          <Button @click="handleCancel" class="tech-cancel-btn">取消</Button>
          <Button type="primary" :loading="loading" @click="handleSave" class="tech-submit-btn">
            <span v-if="!loading" class="mr-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
              </svg>
            </span>
            保存
          </Button>
        </div>
      </div>
    </Form>
  </Modal>
</template>

<style scoped>
.tech-modal :deep(.ant-modal-content) {
  background: white;
  border-radius: 12px;
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  /* 防止遮罩层叠加 */
  backdrop-filter: none;
}

.tech-modal :deep(.ant-modal-header) {
  background: white;
  border-bottom: 1px solid #f1f5f9;
  padding: 20px 24px;
}

.tech-modal :deep(.ant-modal-title) {
  color: #1e293b;
  font-weight: 600;
  font-size: 18px;
}

.tech-modal :deep(.ant-modal-close) {
  color: #64748b;
  transition:
    color 0.2s,
    transform 0.2s;
}

.tech-modal :deep(.ant-modal-close):hover {
  color: #334155;
  transform: rotate(90deg);
}

.tech-modal :deep(.ant-modal-body) {
  padding: 24px;
}

.tech-header {
  display: flex;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f1f5f9;
}

.tech-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #f1f5f9;
  margin-right: 16px;
  color: #3b82f6;
}

.tech-title {
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
}

.tech-input,
.tech-select {
  border-radius: 8px;
  border-color: #e2e8f0;
  padding: 10px 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  height: auto;
}

.tech-input:focus,
.tech-input:hover,
.tech-select:focus,
.tech-select:hover {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.tech-select :deep(.ant-select-selector) {
  padding: 0 !important;
  height: auto !important;
  min-height: 40px !important;
  box-shadow: none !important;
}

.tech-select :deep(.ant-select-selection-item) {
  padding: 4px 8px !important;
  line-height: 1.5 !important;
}

.tech-submit-btn {
  background-color: #3b82f6;
  border-color: #3b82f6;
  border-radius: 8px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 20px;
  font-weight: 500;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.2s;
}

.tech-submit-btn:hover {
  background-color: #2563eb;
  border-color: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.tech-cancel-btn {
  background: white;
  border: 1px solid #e2e8f0;
  color: #64748b;
  border-radius: 8px;
  height: 40px;
  padding: 0 20px;
  font-weight: 500;
  transition: all 0.2s;
}

.tech-cancel-btn:hover {
  border-color: #d1d5db;
  color: #475569;
  background: #f8fafc;
  transform: translateY(-1px);
}

.tech-test-btn {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  color: #475569;
  border-radius: 8px;
  height: 40px;
  padding: 0 20px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.tech-test-btn:hover {
  background: #e2e8f0;
  color: #334155;
  transform: translateY(-1px);
}

.security-note {
  display: flex;
  align-items: center;
  background: #f0f9ff;
  padding: 12px 16px;
  border-radius: 8px;
  border-left: 3px solid #3b82f6;
  color: #0369a1;
  font-size: 13px;
  margin-top: 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.security-note svg {
  color: #3b82f6;
}

/* 表单项间距优化 */
.tech-modal :deep(.ant-form-item) {
  margin-bottom: 24px;
}

/* 确保表单控件没有重复阴影 */
.tech-modal :deep(.ant-input),
.tech-modal :deep(.ant-input-password),
.tech-modal :deep(.ant-select-selector),
.tech-modal :deep(.ant-input-affix-wrapper) {
  box-shadow: none !important;
}

/* 修复模态框中输入框hover/focus状态 */
.tech-modal :deep(.ant-input:hover),
.tech-modal :deep(.ant-input:focus),
.tech-modal :deep(.ant-input-password:hover),
.tech-modal :deep(.ant-input-password:focus),
.tech-modal :deep(.ant-input-affix-wrapper:hover),
.tech-modal :deep(.ant-input-affix-wrapper:focus) {
  box-shadow: none !important;
  border-color: #3b82f6;
}

/* 表单标签样式优化 */
.tech-modal :deep(.ant-form-item-label > label) {
  font-weight: 500;
  font-size: 14px;
  color: #475569;
  margin-bottom: 6px;
}

/* 按钮组样式 */
.tech-modal .flex {
  gap: 0.75rem;
}
</style>
