<script setup>
import { ref, onMounted } from 'vue'
import {
  saveApiKey,
  isApiKeyConfigured,
  AVAILABLE_MODELS,
  getSelectedModel,
  saveSelectedModel,
} from '../services/deepseekService'
import { InfoCircleOutlined, LockOutlined } from '@ant-design/icons-vue'

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
    window.message.error('请输入有效的API密钥')
    return
  }

  loading.value = true

  try {
    // 保存API密钥到localStorage
    // 判断是否为掩码形式，如果是则不覆盖原有密钥
    if (!apiKey.value.includes('*')) {
      saveApiKey(apiKey.value.trim())
      window.message.success('API密钥已保存')
    }

    // 保存选定的模型
    saveSelectedModel(selectedModel.value)
    window.message.success('设置已保存')

    isApiConfigured.value = true
    loading.value = false
    emit('saved')
    handleCancel()
  } catch (error) {
    console.error('保存设置时出错:', error)
    window.message.error('保存失败，请重试')
    loading.value = false
  }
}

// 测试API连接
const testConnection = async () => {
  if (!apiKey.value.trim()) {
    window.message.error('请先输入API密钥')
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
      window.message.success('连接成功！API密钥有效')
    } else {
      window.message.error(`连接失败: ${data.error?.message || '未知错误'}`)
    }
  } catch (error) {
    window.message.error(`连接测试失败: ${error.message}`)
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
  <a-modal
    title="设置"
    :visible="props.visible"
    :footer="null"
    @cancel="handleCancel"
    :bodyStyle="{
      background: 'white',
      borderRadius: '12px',
      padding: '24px',
    }"
    class="gemini-modal"
  >
    <div class="mb-4">
      <h3 class="text-lg font-medium mb-2">API密钥配置</h3>
      <p class="text-gray-600 text-sm mb-4">
        请配置DeepSeek API密钥以启用日报生成功能
      </p>
    </div>

    <a-form layout="vertical">
      <a-form-item label="DeepSeek API密钥" required>
        <a-input-password
          v-model:value="apiKey"
          placeholder="请输入DeepSeek API密钥"
          class="rounded-lg"
        />
        <div class="mt-2 text-gray-500 text-sm flex items-center">
          <InfoCircleOutlined class="mr-2" />
          获取API密钥请访问:
          <a
            href="https://platform.deepseek.com"
            target="_blank"
            class="text-blue-600 hover:text-blue-700 ml-1"
            >DeepSeek平台</a
          >
        </div>
      </a-form-item>

      <a-form-item label="选择模型">
        <a-select
          v-model:value="selectedModel"
          placeholder="请选择模型"
          class="w-full rounded-lg"
          @change="handleModelChange"
        >
          <a-select-option v-for="model in AVAILABLE_MODELS" :key="model.id" :value="model.id">
            <div class="flex flex-col">
              <span class="font-medium">{{ model.name }}</span>
              <span class="text-xs text-gray-500">{{ model.description }}</span>
            </div>
          </a-select-option>
        </a-select>
      </a-form-item>

      <div class="security-note mt-4 text-sm text-gray-500 mb-6 border-l-4 border-blue-200 pl-3 py-2 bg-blue-50 rounded">
        <LockOutlined class="mr-1" />
        安全提示：API密钥将安全存储在本地浏览器中，不会上传到任何服务器
      </div>

      <div class="flex justify-between mt-6">
        <a-button @click="testConnection" :loading="loading">
          测试连接
        </a-button>
        <div>
          <a-button class="mr-2" @click="handleCancel">
            取消
          </a-button>
          <a-button type="primary" @click="handleSave" :loading="loading">
            保存
          </a-button>
        </div>
      </div>
    </a-form>
  </a-modal>
</template>

<style scoped>
.gemini-modal :deep(.ant-modal-content) {
  border-radius: 16px;
  overflow: hidden;
}

.gemini-modal :deep(.ant-modal-header) {
  background-color: #f9fafb;
  padding: 16px 24px;
  border-bottom: 1px solid #f3f4f6;
}

.gemini-modal :deep(.ant-modal-title) {
  font-weight: 600;
  font-size: 18px;
  color: #1f2937;
}

.gemini-modal :deep(.ant-input),
.gemini-modal :deep(.ant-input-password) {
  border-radius: 8px;
  padding: 10px 12px;
  border-color: #e5e7eb;
}

.gemini-modal :deep(.ant-select-selector) {
  border-radius: 8px !important;
  padding: 6px 12px !important;
  height: auto !important;
  min-height: 42px;
}

.gemini-modal :deep(.ant-btn) {
  border-radius: 8px;
  padding: 6px 16px;
  height: auto;
  min-height: 38px;
}

.gemini-modal :deep(.ant-btn-primary) {
  background-color: #1a73e8;
  border-color: #1a73e8;
}

.gemini-modal :deep(.ant-btn-primary:hover) {
  background-color: #1967d2;
  border-color: #1967d2;
}
</style> 