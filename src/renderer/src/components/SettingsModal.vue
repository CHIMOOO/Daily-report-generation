<script setup lang="ts">
import { ref, reactive, defineProps, defineEmits, watch, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import {
  isApiKeyConfigured,
  AVAILABLE_MODELS,
  getSelectedModel,
  getDefaultPrompt,
  saveDefaultPrompt
} from '../services/deepseekService'
import { InfoCircleOutlined, LockOutlined, FolderOutlined } from '@ant-design/icons-vue'

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
  model: 'deepseek-chat',
  defaultPrompt: '',
  defaultDirectory: ''
})

const saving = ref(false)
const testing = ref(false)

const apiKey = ref('')
const selectedModel = ref('')
const isApiConfigured = ref(isApiKeyConfigured())
const loading = ref(false)

// 组件挂载时加载设置
onMounted(async () => {
  // 先从localStorage加载
  loadSettings()
  
  // 再尝试从文件系统加载（优先级更高）
  try {
    if (window.electron && window.electron.ipcRenderer) {
      const result = await window.electron.ipcRenderer.invoke('settings:load')
      console.log('从文件系统加载设置结果:', result)
      
      if (result.success && result.settings) {
        // 使用从文件加载的设置更新表单状态
        if (result.settings.DEEPSEEK_API_KEY) {
          formState.apiKey = result.settings.DEEPSEEK_API_KEY
        }
        
        if (result.settings.DEEPSEEK_API_BASE_URL) {
          formState.apiBaseUrl = result.settings.DEEPSEEK_API_BASE_URL
        }
        
        if (result.settings.DEEPSEEK_MODEL) {
          formState.model = result.settings.DEEPSEEK_MODEL
        }
        
        if (result.settings.DEFAULT_PROMPT) {
          formState.defaultPrompt = result.settings.DEFAULT_PROMPT
        }
        
        if (result.settings.DEFAULT_DIRECTORY) {
          formState.defaultDirectory = result.settings.DEFAULT_DIRECTORY
        }
        
        // 同时更新localStorage
        localStorage.setItem('DEEPSEEK_API_KEY', formState.apiKey)
        localStorage.setItem('DEEPSEEK_API_BASE_URL', formState.apiBaseUrl)
        localStorage.setItem('DEEPSEEK_MODEL', formState.model)
        localStorage.setItem('DEFAULT_PROMPT', formState.defaultPrompt)
        localStorage.setItem('last_directory', formState.defaultDirectory)
        
        console.log('已从文件系统更新设置')
      }
    }
  } catch (e) {
    console.error('尝试从文件系统加载设置失败:', e)
  }
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

// 选择默认目录
const selectDefaultDirectory = async () => {
  if (window.electron) {
    try {
      const result = await window.electron.ipcRenderer.invoke('dialog:openDirectory')
      if (result && !result.canceled && result.filePaths.length > 0) {
        formState.defaultDirectory = result.filePaths[0]
      }
    } catch (error) {
      console.error('选择目录失败:', error)
      message.error('选择目录失败')
    }
  } else {
    message.warning('当前环境不支持目录选择，请直接输入目录路径')
  }
}

const handleSave = async () => {
  saving.value = true

  try {
    // 打印当前localStorage状态
    console.log('保存前, localStorage中的值:', {
      '直接访问': {
        'DEEPSEEK_API_KEY': localStorage.getItem('DEEPSEEK_API_KEY'),
        'DEEPSEEK_API_BASE_URL': localStorage.getItem('DEEPSEEK_API_BASE_URL'),
        'DEEPSEEK_MODEL': localStorage.getItem('DEEPSEEK_MODEL'),
        'DEFAULT_PROMPT': localStorage.getItem('DEFAULT_PROMPT'),
        'DEFAULT_DIRECTORY': localStorage.getItem('last_directory')
      },
      'API访问': window.api?.localStorage ? {
        'DEEPSEEK_API_KEY': window.api.localStorage.getItem('DEEPSEEK_API_KEY'),
        'DEEPSEEK_API_BASE_URL': window.api.localStorage.getItem('DEEPSEEK_API_BASE_URL'),
        'DEEPSEEK_MODEL': window.api.localStorage.getItem('DEEPSEEK_MODEL'),
        'DEFAULT_PROMPT': window.api.localStorage.getItem('DEFAULT_PROMPT'),
        'DEFAULT_DIRECTORY': window.api.localStorage.getItem('last_directory')
      } : '不可用'
    })
    
    console.log('准备保存的值:', {
      apiKey: formState.apiKey,
      apiBaseUrl: formState.apiBaseUrl,
      model: formState.model,
      defaultPrompt: formState.defaultPrompt,
      defaultDirectory: formState.defaultDirectory
    })

    // 尝试通过常规方式保存到localStorage
    localStorage.setItem('DEEPSEEK_API_KEY', formState.apiKey)
    localStorage.setItem('DEEPSEEK_API_BASE_URL', formState.apiBaseUrl)
    localStorage.setItem('DEEPSEEK_MODEL', formState.model)
    localStorage.setItem('DEFAULT_PROMPT', formState.defaultPrompt)
    localStorage.setItem('last_directory', formState.defaultDirectory)
    
    // 如果window.api.localStorage可用，也通过API保存
    if (window.api?.localStorage) {
      window.api.localStorage.setItem('DEEPSEEK_API_KEY', formState.apiKey)
      window.api.localStorage.setItem('DEEPSEEK_API_BASE_URL', formState.apiBaseUrl)
      window.api.localStorage.setItem('DEEPSEEK_MODEL', formState.model)
      window.api.localStorage.setItem('DEFAULT_PROMPT', formState.defaultPrompt)
      window.api.localStorage.setItem('last_directory', formState.defaultDirectory)
    }

    // 验证保存是否成功
    console.log('保存后, localStorage中的值:', {
      '直接访问': {
        'DEEPSEEK_API_KEY': localStorage.getItem('DEEPSEEK_API_KEY'),
        'DEEPSEEK_API_BASE_URL': localStorage.getItem('DEEPSEEK_API_BASE_URL'),
        'DEEPSEEK_MODEL': localStorage.getItem('DEEPSEEK_MODEL'),
        'DEFAULT_PROMPT': localStorage.getItem('DEFAULT_PROMPT'),
        'DEFAULT_DIRECTORY': localStorage.getItem('last_directory')
      },
      'API访问': window.api?.localStorage ? {
        'DEEPSEEK_API_KEY': window.api.localStorage.getItem('DEEPSEEK_API_KEY'),
        'DEEPSEEK_API_BASE_URL': window.api.localStorage.getItem('DEEPSEEK_API_BASE_URL'),
        'DEEPSEEK_MODEL': window.api.localStorage.getItem('DEEPSEEK_MODEL'),
        'DEFAULT_PROMPT': window.api.localStorage.getItem('DEFAULT_PROMPT'),
        'DEFAULT_DIRECTORY': window.api.localStorage.getItem('last_directory')
      } : '不可用'
    })

    // 尝试直接使用window.electron写入配置文件
    try {
      if (window.electron && window.electron.ipcRenderer) {
        await window.electron.ipcRenderer.invoke('settings:save', {
          DEEPSEEK_API_KEY: formState.apiKey,
          DEEPSEEK_API_BASE_URL: formState.apiBaseUrl,
          DEEPSEEK_MODEL: formState.model,
          DEFAULT_PROMPT: formState.defaultPrompt,
          DEFAULT_DIRECTORY: formState.defaultDirectory
        })
        console.log('通过IPC保存设置成功')
      }
    } catch (e) {
      console.error('通过IPC保存设置失败:', e)
    }

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
    // 使用Electron IPC调用进行API请求以绕过CSP限制
    if (window.electron) {
      const result = await window.electron.ipcRenderer.invoke('api:testConnection', {
        apiKey: formState.apiKey,
        apiBaseUrl: formState.apiBaseUrl,
        model: formState.model
      })
      
      if (result.success) {
        message.success('连接成功！API密钥有效')
      } else {
        message.error(`连接失败: ${result.error || '未知错误'}`)
      }
    } else {
      // 浏览器环境回退方案 - 仅用于开发测试
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
        message.error(`浏览器环境不支持直接API请求，请在Electron环境中测试`)
      }
    }
  } catch (error: any) {
    console.error('测试连接失败:', error)
    message.error(`连接测试失败: ${error.message || '未知错误'}`)
  } finally {
    testing.value = false
  }
}

// 加载当前设置
const loadSettings = () => {
  // 从localStorage获取设置
  formState.apiKey = localStorage.getItem('DEEPSEEK_API_KEY') || ''
  formState.apiBaseUrl = localStorage.getItem('DEEPSEEK_API_BASE_URL') || 'https://api.deepseek.com'
  formState.model = localStorage.getItem('DEEPSEEK_MODEL') || 'deepseek-chat'
  formState.defaultPrompt = localStorage.getItem('DEFAULT_PROMPT') || '请根据我的Git提交记录，详细总结今天的工作内容，包括完成的任务、解决的问题和取得的进展。格式要清晰，分点罗列，并加入技术要点。'
  formState.defaultDirectory = localStorage.getItem('last_directory') || ''
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
    width="600px"
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
          
          <a-form-item label="默认提示词" name="defaultPrompt">
            <a-textarea
              v-model:value="formState.defaultPrompt"
              placeholder="输入默认提示词，用于生成更详细的日报内容"
              :auto-size="{ minRows: 3, maxRows: 6 }"
            />
            <div class="form-item-help">
              配置默认提示词，指导AI如何详细生成日报内容
            </div>
          </a-form-item>
          
          <a-form-item label="默认代码库目录" name="defaultDirectory">
            <div class="directory-input-group">
              <a-input
                v-model:value="formState.defaultDirectory"
                placeholder="输入默认代码库目录"
                allowClear
              />
              <a-button type="primary" @click="selectDefaultDirectory">
                <template #icon><FolderOutlined /></template>
                浏览
              </a-button>
            </div>
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

.prompt-area {
  margin-bottom: 16px;
}

.api-key-wrapper {
  position: relative;
}

.model-select {
  width: 100%;
}

.test-connection {
  margin: 16px 0;
  display: flex;
  justify-content: flex-end;
}

.security-tip {
  color: #999;
  font-size: 12px;
  margin-top: 8px;
}

.directory-input-group {
  display: flex;
  gap: 8px;
}

.directory-input-group .ant-input {
  flex: 1;
}
</style> 