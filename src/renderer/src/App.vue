<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { generateDayReport, isApiKeyConfigured } from './services/deepseekService'
import { getCommitsForDate } from './services/gitService'
import SettingsModal from './components/SettingsModal.vue'
import { SettingOutlined, FolderOpenOutlined, FolderOutlined, SendOutlined } from '@ant-design/icons-vue'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import dayjs, { type Dayjs } from 'dayjs'

// 初始化消息数组
const messages = reactive([
  {
    id: 'welcome',
    role: 'assistant',
    content: '欢迎使用日报生成助手，请选择代码库目录并配置API密钥以生成日报。',
    time: new Date().toISOString()
  }
])

// 用户输入
const userInput = ref('')
// 代码库路径
const directoryPath = ref('')
// 日期选择
const selectedDate = ref<Dayjs>(dayjs())
// 加载状态
const loading = ref(false)
// 设置对话框可见性
const settingsVisible = ref(false)
// 文件选择对话框可见性
const directoryDialogVisible = ref(false)
// 最近使用的目录列表
const recentDirectories = ref<string[]>([])

// 检查API密钥是否配置
const checkApiKey = () => {
  // 直接检查localStorage
  const apiKey = localStorage.getItem('DEEPSEEK_API_KEY')
  console.log("直接检查localStorage:", {
    'DEEPSEEK_API_KEY': apiKey,
    'isApiKeyConfigured()': isApiKeyConfigured()
  })
  
  // 尝试手动设置一个测试值
  if (!apiKey) {
    console.log("尝试向localStorage手动设置一个测试值")
    localStorage.setItem('TEST_KEY', 'test_value')
    console.log("测试值设置后:", localStorage.getItem('TEST_KEY'))
  }

  if (!isApiKeyConfigured()) {
    message.warning('请先配置DeepSeek API密钥')
    settingsVisible.value = true
    return false
  }
  return true
}

// 检查是否选择了目录
const checkDirectory = () => {
  if (!directoryPath.value) {
    message.error('请先选择代码库目录')
    directoryDialogVisible.value = true
    return false
  }
  return true
}

// 生成日报
const generateReport = async () => {
  if (!checkApiKey() || !checkDirectory()) {
    return
  }

  loading.value = true

  try {
    // 添加用户消息
    const promptMessage = `请生成${selectedDate.value.toDate().toLocaleDateString('zh-CN')}的日报`
    addMessage('user', promptMessage)

    // 获取Git提交记录
    const commits = await getCommitsForDate(directoryPath.value, selectedDate.value.toDate())
    console.log('获取到提交记录:', commits)

    // 生成日报内容
    const reportContent = await generateDayReport({
      gitPath: directoryPath.value,
      date: selectedDate.value.toDate(),
      customPrompt: '',
    })

    // 添加AI回复
    addMessage('assistant', reportContent)
  } catch (error: any) {
    console.error('生成日报时出错:', error)
    message.error(`生成日报失败: ${error.message}`)
    addMessage('assistant', `生成失败: ${error.message}`)
  } finally {
    loading.value = false
  }
}

// 处理用户输入
const handleUserInput = async () => {
  if (!userInput.value.trim()) {
    return
  }

  if (!checkApiKey() || !checkDirectory()) {
    return
  }

  const content = userInput.value
  userInput.value = ''
  addMessage('user', content)
  loading.value = true

  try {
    // 生成日报内容，添加用户自定义提示
    const reportContent = await generateDayReport({
      gitPath: directoryPath.value,
      date: selectedDate.value.toDate(),
      customPrompt: content,
    })

    // 添加AI回复
    addMessage('assistant', reportContent)
  } catch (error: any) {
    console.error('处理用户输入时出错:', error)
    message.error(`处理失败: ${error.message}`)
    addMessage('assistant', `处理失败: ${error.message}`)
  } finally {
    loading.value = false
  }
}

// 添加消息
const addMessage = (role, content) => {
  messages.push({
    id: Date.now().toString(),
    role,
    content,
    time: new Date().toISOString()
  })
  // 滚动到底部
  setTimeout(() => {
    const chatContainer = document.querySelector('.chat-messages')
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight
    }
  }, 100)
}

// 打开文件选择对话框
const openDirectoryDialog = () => {
  if (window.electron) {
    window.electron.ipcRenderer.invoke('dialog:openDirectory').then(result => {
      if (result && !result.canceled && result.filePaths.length > 0) {
        directoryPath.value = result.filePaths[0]
        addToRecentDirectories(directoryPath.value)
      }
    })
  } else {
    directoryDialogVisible.value = true
  }
}

// 添加到最近使用的目录列表
const addToRecentDirectories = (dir: string) => {
  // 移除已存在的相同目录
  const index = recentDirectories.value.indexOf(dir)
  if (index !== -1) {
    recentDirectories.value.splice(index, 1)
  }

  // 添加到列表开头
  recentDirectories.value.unshift(dir)

  // 保持最多5个目录
  if (recentDirectories.value.length > 5) {
    recentDirectories.value.pop()
  }

  // 保存到localStorage
  localStorage.setItem('recent_directories', JSON.stringify(recentDirectories.value))
}

// 选择目录
const selectDirectory = (dir) => {
  directoryPath.value = dir
  directoryDialogVisible.value = false
  addToRecentDirectories(dir)
}

// 自定义目录
const customDirectory = ref('')
const addCustomDirectory = () => {
  if (customDirectory.value.trim()) {
    directoryPath.value = customDirectory.value
    directoryDialogVisible.value = false
    addToRecentDirectories(directoryPath.value)
    customDirectory.value = ''
  } else {
    message.error('请输入有效的目录路径')
  }
}

// 组件挂载时加载数据
onMounted(() => {
  // 从localStorage加载最近使用的目录
  const savedDirectories = localStorage.getItem('recent_directories')
  if (savedDirectories) {
    try {
      recentDirectories.value = JSON.parse(savedDirectories)
    } catch (e) {
      console.error('加载最近目录失败:', e)
    }
  }

  // 判断是否在Electron环境中
  if (window.electron) {
    // 绑定message的方法
    window.message = message
  }
  
  // 检查API密钥配置
  setTimeout(() => {
    checkApiKey()
  }, 500)
})
</script>

<template>
  <a-config-provider :locale="zhCN">
    <div class="mosaic-container">
      <!-- 顶部导航 -->
      <header class="mosaic-header">
        <div class="logo">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="8" fill="#5661F1" />
            <path d="M22 12H10C9.44772 12 9 12.4477 9 13V19C9 19.5523 9.44772 20 10 20H22C22.5523 20 23 19.5523 23 19V13C23 12.4477 22.5523 12 22 12Z" fill="white" />
          </svg>
          <span class="logo-text">日报生成助手</span>
        </div>
        <div class="actions">
          <a-button type="primary" @click="settingsVisible = true" class="settings-btn">
            <template #icon><SettingOutlined /></template>
            设置
          </a-button>
        </div>
      </header>

      <!-- 主内容区 -->
      <main class="mosaic-main">
        <!-- 左侧边栏 -->
        <div class="sidebar">
          <div class="sidebar-card">
            <div class="section-title">
              <h3>代码库目录</h3>
              <a-button type="text" @click="openDirectoryDialog" size="small" class="btn-icon">
                <template #icon><FolderOpenOutlined /></template>
              </a-button>
            </div>
            <div v-if="directoryPath" class="selected-directory">
              <FolderOutlined class="directory-icon" />
              <span class="directory-path">{{ directoryPath }}</span>
            </div>
            <div v-else class="no-directory">
              <a-empty description="未选择目录" class="mini-empty" />
            </div>
          </div>

          <div class="sidebar-card">
            <div class="section-title">
              <h3>日期选择</h3>
            </div>
            <a-date-picker
              class="date-picker"
              v-model:value="selectedDate"
              format="YYYY-MM-DD"
              :allowClear="false"
            />
          </div>

          <div class="sidebar-card actions-section">
            <a-button
              type="primary"
              block
              @click="generateReport"
              :loading="loading"
              :disabled="!directoryPath || loading"
            >
              生成日报
            </a-button>
          </div>
        </div>

        <!-- 聊天区域 -->
        <div class="chat-area">
          <div class="chat-messages">
            <!-- 消息列表 -->
            <div
              v-for="msg in messages"
              :key="msg.id"
              :class="['message', `message-${msg.role}`]"
            >
              <div class="message-avatar">
                <div v-if="msg.role === 'assistant'" class="assistant-avatar">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5ZM12 19.2C9.5 19.2 7.29 17.92 6 15.98C6.03 13.99 10 12.9 12 12.9C13.99 12.9 17.97 13.99 18 15.98C16.71 17.92 14.5 19.2 12 19.2Z" fill="#5661F1"/>
                  </svg>
                </div>
                <div v-else class="user-avatar">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z" fill="#fff"/>
                    <path d="M12 14C8.13401 14 5 17.134 5 21H19C19 17.134 15.866 14 12 14Z" fill="#fff"/>
                  </svg>
                </div>
              </div>
              <div class="message-content">
                <div class="message-header">
                  <span class="message-sender">{{ msg.role === 'assistant' ? '日报助手' : '我' }}</span>
                  <span class="message-time">{{ new Date(msg.time).toLocaleTimeString() }}</span>
                </div>
                <div class="message-body">
                  {{ msg.content }}
                </div>
              </div>
            </div>
          </div>

          <!-- 输入区域 -->
          <div class="chat-input">
            <a-input
              v-model:value="userInput"
              placeholder="输入提示信息，例如'添加今天参加了团队会议'..."
              :disabled="loading"
              @pressEnter="handleUserInput"
              class="input-field"
            />
            <a-button
              type="primary"
              @click="handleUserInput"
              :loading="loading"
              :disabled="!userInput.trim() || loading"
              class="send-btn"
            >
              <template #icon><SendOutlined /></template>
            </a-button>
          </div>
        </div>
      </main>

      <!-- 设置对话框 -->
      <SettingsModal
        v-model:visible="settingsVisible"
        @saved="checkApiKey"
      />

      <!-- 目录选择对话框 (浏览器环境下的模拟) -->
      <a-modal
        title="选择代码库目录"
        :visible="directoryDialogVisible"
        @cancel="directoryDialogVisible = false"
        :footer="null"
        class="mosaic-modal"
      >
        <div class="mb-4">
          <h4 class="text-base font-medium mb-2">最近使用的目录</h4>
          <div v-if="recentDirectories.length > 0">
            <a-list bordered>
              <a-list-item
                v-for="dir in recentDirectories"
                :key="dir"
                @click="selectDirectory(dir)"
                class="directory-list-item"
              >
                <FolderOutlined class="mr-2 text-blue-500" />
                {{ dir }}
              </a-list-item>
            </a-list>
          </div>
          <div v-else class="text-gray-500 text-sm">
            没有最近使用的目录
          </div>
        </div>

        <div class="mb-4">
          <h4 class="text-base font-medium mb-2">手动输入目录</h4>
          <div class="flex">
            <a-input
              v-model:value="customDirectory"
              placeholder="输入目录路径，例如 D:/my-project"
              class="flex-grow"
            />
            <a-button
              type="primary"
              @click="addCustomDirectory"
              class="ml-2"
            >
              添加
            </a-button>
          </div>
        </div>

        <div class="mt-4 flex justify-end">
          <a-button @click="directoryDialogVisible = false">
            取消
          </a-button>
        </div>
      </a-modal>
    </div>
  </a-config-provider>
</template>

<style>
/* Cruip Mosaic 风格 */
:root {
  --mosaic-primary: #5661F1;
  --mosaic-primary-hover: #4752e3;
  --mosaic-text: #1e293b;
  --mosaic-text-secondary: #64748b;
  --mosaic-border: #e2e8f0;
  --mosaic-background: #f8fafc;
  --mosaic-sidebar-width: 280px;
  --mosaic-header-height: 64px;
  --mosaic-message-spacing: 16px;
  --mosaic-radius: 12px;
  --mosaic-radius-lg: 16px;
  --mosaic-shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.05);
  --mosaic-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  --mosaic-shadow-md: 0 8px 20px rgba(0, 0, 0, 0.12);
}

body {
  margin: 0;
  padding: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: var(--mosaic-text);
  background: var(--mosaic-background);
  line-height: 1.5;
  height: 100vh;
  overflow: hidden;
}

#app {
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
}

.mosaic-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background-color: var(--mosaic-background);
}

/* 头部样式 */
.mosaic-header {
  height: var(--mosaic-header-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: white;
  box-shadow: var(--mosaic-shadow-sm);
  z-index: 10;
}

.logo {
  display: flex;
  align-items: center;
}

.logo-text {
  font-size: 18px;
  font-weight: 600;
  margin-left: 12px;
  color: var(--mosaic-text);
  white-space: nowrap;
}

.settings-btn {
  border-radius: var(--mosaic-radius);
}

/* 主内容区域 */
.mosaic-main {
  display: flex;
  flex: 1;
  overflow: hidden;
  padding: 24px;
  gap: 24px;
}

/* 侧边栏 */
.sidebar {
  width: var(--mosaic-sidebar-width);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sidebar-card {
  background: white;
  border-radius: var(--mosaic-radius-lg);
  box-shadow: var(--mosaic-shadow);
  padding: 20px;
  overflow: hidden;
  transition: all 0.2s ease;
}

.sidebar-card:hover {
  box-shadow: var(--mosaic-shadow-md);
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--mosaic-text);
}

.btn-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border-radius: var(--mosaic-radius);
}

.selected-directory {
  padding: 10px;
  background: var(--mosaic-background);
  border-radius: var(--mosaic-radius);
  font-size: 14px;
  word-break: break-all;
  display: flex;
  align-items: flex-start;
}

.directory-icon {
  flex-shrink: 0;
  margin-right: 8px;
  margin-top: 3px;
  color: var(--mosaic-primary);
}

.directory-path {
  color: var(--mosaic-text-secondary);
  word-break: break-all;
  line-height: 1.5;
}

.no-directory {
  padding: 10px;
  background: var(--mosaic-background);
  border-radius: var(--mosaic-radius);
  text-align: center;
}

.date-picker {
  width: 100%;
}

.actions-section {
  margin-top: auto;
}

/* 聊天区域 */
.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: var(--mosaic-radius-lg);
  box-shadow: var(--mosaic-shadow);
  overflow: hidden;
  transition: all 0.2s ease;
}

.chat-area:hover {
  box-shadow: var(--mosaic-shadow-md);
}

.chat-messages {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--mosaic-message-spacing);
}

.message {
  display: flex;
  max-width: 85%;
}

.message-assistant {
  align-self: flex-start;
}

.message-user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message-avatar {
  flex: 0 0 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.message-user .message-avatar {
  margin-right: 0;
  margin-left: 12px;
}

.assistant-avatar {
  background: #eef0ff;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-avatar {
  width: 100%;
  height: 100%;
  background: var(--mosaic-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.message-content {
  background: var(--mosaic-background);
  border-radius: var(--mosaic-radius-lg);
  padding: 16px 20px;
  position: relative;
  box-shadow: var(--mosaic-shadow-sm);
  transition: all 0.2s ease;
}

.message-content:hover {
  box-shadow: var(--mosaic-shadow);
}

.message-user .message-content {
  background: var(--mosaic-primary);
  color: white;
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  font-size: 12px;
}

.message-sender {
  font-weight: 600;
}

.message-time {
  color: var(--mosaic-text-secondary);
  font-size: 11px;
}

.message-body {
  white-space: pre-wrap;
  line-height: 1.6;
  word-break: break-all;
}

/* 输入区域 */
.chat-input {
  padding: 20px;
  border-top: 1px solid var(--mosaic-border);
  display: flex;
  gap: 12px;
  background: white;
}

.input-field {
  border-radius: var(--mosaic-radius-lg);
  box-shadow: var(--mosaic-shadow-sm);
  transition: all 0.2s ease;
}

.input-field:hover, .input-field:focus {
  box-shadow: var(--mosaic-shadow);
}

.send-btn {
  border-radius: var(--mosaic-radius);
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  box-shadow: var(--mosaic-shadow-sm);
  transition: all 0.2s ease;
}

.send-btn:hover {
  box-shadow: var(--mosaic-shadow);
  transform: translateY(-1px);
}

/* Mini Empty 样式 */
.mini-empty {
  margin: 8px 0;
}

.mini-empty :deep(.ant-empty-image) {
  height: 40px;
}

.mini-empty :deep(.ant-empty-description) {
  font-size: 12px;
}

/* 目录列表项 */
.directory-list-item {
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: var(--mosaic-radius);
  overflow: hidden;
  word-break: break-all;
}

.directory-list-item:hover {
  background-color: var(--mosaic-background);
}

/* 模态框样式 */
.mosaic-modal :deep(.ant-modal-content) {
  border-radius: var(--mosaic-radius-lg);
  box-shadow: var(--mosaic-shadow-md);
}

/* 自定义 Ant Design Vue 样式 */
:deep(.ant-btn-primary) {
  background-color: var(--mosaic-primary);
  border-color: var(--mosaic-primary);
}

:deep(.ant-btn-primary:hover),
:deep(.ant-btn-primary:focus) {
  background-color: var(--mosaic-primary-hover);
  border-color: var(--mosaic-primary-hover);
}

:deep(.ant-input:focus),
:deep(.ant-input-affix-wrapper:focus),
:deep(.ant-input-affix-wrapper-focused) {
  border-color: var(--mosaic-primary);
  box-shadow: 0 0 0 2px rgba(86, 97, 241, 0.2);
}

:deep(.ant-picker-focused) {
  border-color: var(--mosaic-primary);
  box-shadow: 0 0 0 2px rgba(86, 97, 241, 0.2);
}

:deep(.ant-list-item) {
  border-radius: var(--mosaic-radius);
  transition: all 0.2s;
}

:deep(.ant-list-bordered) {
  border-radius: var(--mosaic-radius);
  border: 1px solid var(--mosaic-border);
}
</style>
