<script setup lang="ts">
import { ref, reactive, defineProps, defineEmits, watch, onMounted } from 'vue'
import { message } from 'ant-design-vue'
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
    required: true
  }
})

const emit = defineEmits(['update:visible', 'saved'])

const formState = reactive({
  apiKey: '',
  apiBaseUrl: 'https://api.deepseek.com',
  model: 'deepseek-chat'
})

const saving = ref(false)
const testing = ref(false)

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

  loadSettings()
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
  loadSettings() // 重置为原始值
  emit('update:visible', false)
}

// 处理模型选择改变
const handleModelChange = (value) => {
  selectedModel.value = value
}

const handleSave = async () => {
  saving.value = true

  try {
    // 保存到localStorage
    localStorage.setItem('DEEPSEEK_API_KEY', formState.apiKey)
    localStorage.setItem('DEEPSEEK_API_BASE_URL', formState.apiBaseUrl)
    localStorage.setItem('DEEPSEEK_MODEL', formState.model)

    message.success('设置已保存')
    emit('update:visible', false)
    emit('saved')
  } catch (error: any) {
    console.error('保存设置失败:', error)
    message.error('保存设置失败')
  } finally {
    saving.value = false
  }
}

// 测试API连接
const testConnection = async () => {
  if (!formState.apiKey) {
    message.error('请先输入API密钥')
    return
  }

  testing.value = true
  try {
    const response = await fetch(`${formState.apiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${formState.apiKey}`,
      },
      body: JSON.stringify({
        model: formState.model,
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
  } catch (error: any) {
    message.error(`连接测试失败: ${error.message || '未知错误'}`)
  } finally {
    testing.value = false
  }
}

// 加载当前设置
const loadSettings = () => {
  // 从localStorage获取设置
  const apiKey = localStorage.getItem('DEEPSEEK_API_KEY') || ''
  const apiBaseUrl = localStorage.getItem('DEEPSEEK_API_BASE_URL') || 'https://api.deepseek.com'
  const model = localStorage.getItem('DEEPSEEK_MODEL') || 'deepseek-chat'

  formState.apiKey = apiKey
  formState.apiBaseUrl = apiBaseUrl
  formState.model = model
}

// 监听visible变化
watch(() => props.visible, (newVal) => {
  if (newVal) {
    loadSettings()
  }
})

// 暴露方法供父组件调用
defineExpose({
  showModal,
})
</script>

<template>
  <a-modal
    title="设置"
    :visible="visible"
    @cancel="handleCancel"
    :footer="null"
    width="500px"
    class="mosaic-modal"
    :mask-closable="false"
    :bodyStyle="{ padding: '20px' }"
  >
    <div class="settings-container">
      <div class="settings-section">
        <h3 class="section-title">DeepSeek API配置</h3>
        <a-form :model="formState" layout="vertical">
          <a-form-item label="API密钥" name="apiKey" required>
            <a-input-password
              v-model:value="formState.apiKey"
              placeholder="请输入DeepSeek API密钥"
              allowClear
            />
            <div class="form-item-help">
              获取API密钥请访问 <a href="https://platform.deepseek.com/api_keys" target="_blank">DeepSeek平台</a>
            </div>
          </a-form-item>
          
          <a-form-item label="API Base URL" name="apiBaseUrl">
            <a-input
              v-model:value="formState.apiBaseUrl"
              placeholder="默认: https://api.deepseek.com"
              allowClear
            />
          </a-form-item>
          
          <a-form-item label="模型" name="model">
            <a-select v-model:value="formState.model">
              <a-select-option value="deepseek-chat">DeepSeek-V3 (deepseek-chat)</a-select-option>
              <a-select-option value="deepseek-reasoner">DeepSeek-R1 (deepseek-reasoner)</a-select-option>
              <a-select-option value="deepseek-coder">DeepSeek-Coder</a-select-option>
            </a-select>
          </a-form-item>
          
          <div class="test-connection">
            <a-button @click="testConnection" :loading="testing" type="default" block>
              测试连接
            </a-button>
          </div>
        </a-form>
      </div>

      <div class="footer-actions">
        <a-button 
          @click="handleCancel"
          class="cancel-button"
        >
          取消
        </a-button>
        <a-button 
          type="primary" 
          @click="handleSave"
          :loading="saving"
        >
          保存
        </a-button>
      </div>
    </div>
  </a-modal>
</template>

<style scoped>
.settings-container {
  padding: 0;
}

.settings-section {
  margin-bottom: 24px;
  background-color: var(--mosaic-background);
  padding: 20px;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 20px;
  color: var(--mosaic-text);
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.form-item-help {
  font-size: 12px;
  color: var(--mosaic-text-secondary);
  margin-top: 4px;
}

.form-item-help a {
  color: var(--mosaic-primary);
  text-decoration: none;
}

.test-connection {
  margin-top: 12px;
  margin-bottom: 16px;
}

.footer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.cancel-button {
  margin-right: 8px;
}

:deep(.ant-form-item-label) {
  font-weight: 500;
}

:deep(.ant-form-item) {
  margin-bottom: 20px;
}

:deep(.ant-input),
:deep(.ant-input-password),
:deep(.ant-select:not(.ant-select-customize-input) .ant-select-selector) {
  border-radius: 12px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.03);
  border-color: var(--mosaic-border);
  padding: 8px 16px;
  height: auto;
}

:deep(.ant-input-affix-wrapper) {
  padding: 0 16px;
  border-radius: 12px;
}

:deep(.ant-input-affix-wrapper input) {
  height: 38px;
}

:deep(.ant-select-selector) {
  height: 38px !important;
  padding: 0 16px !important;
}

:deep(.ant-select-selection-item) {
  line-height: 38px !important;
}

:deep(.ant-input:focus),
:deep(.ant-input-password:focus),
:deep(.ant-input-focused),
:deep(.ant-input-affix-wrapper-focused),
:deep(.ant-select-focused:not(.ant-select-disabled).ant-select:not(.ant-select-customize-input) .ant-select-selector) {
  border-color: var(--mosaic-primary);
  box-shadow: 0 0 0 2px rgba(86, 97, 241, 0.15);
}

:deep(.ant-btn) {
  border-radius: 12px;
  height: 40px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.03);
  font-weight: 500;
}

:deep(.ant-btn-primary) {
  box-shadow: 0 4px 10px rgba(86, 97, 241, 0.2);
}

:deep(.ant-modal-content) {
  border-radius: 18px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

:deep(.ant-modal-header) {
  padding: 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

:deep(.ant-modal-title) {
  font-size: 18px;
  font-weight: 600;
}

:deep(.ant-modal-close) {
  top: 20px;
  right: 20px;
}

:deep(.ant-modal-close-x) {
  width: 40px;
  height: 40px;
  line-height: 40px;
}

:deep(.ant-modal-body) {
  padding: 24px;
}
</style> 