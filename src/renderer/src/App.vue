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
})
</script>

<template>
  <a-config-provider :locale="zhCN">
    <div class="gemini-container">
      <!-- 顶部导航 -->
      <header class="gemini-header">
        <div class="logo">
          <svg width="32" height="32" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
            <path fill="#4285F4" d="M32 96c0-35.346 28.654-64 64-64 35.347 0 64 28.654 64 64 0 35.346-28.653 64-64 64-35.346 0-64-28.654-64-64"/>
            <path fill="#FFF" d="M69.822 68.191c5.502-5.502 14.277-5.502 19.78 0L152.883 132c-9.02 14.686-25.045 24.281-43.24 24.548C77.92 157.029 52 131.6 52 100c0-18.017 9.102-33.874 22.963-43.12l-5.14 11.311z"/>
            <path fill="#AECBFA" d="M140.209 141.209c-12.402 12.402-32.508 12.402-44.91 0-9.72-9.72-11.894-24.194-6.532-36.041l51.442 36.041z"/>
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
      <main class="gemini-main">
        <!-- 左侧边栏 -->
        <div class="sidebar">
          <div class="directory-section">
            <div class="section-title">
              <h3>代码库目录</h3>
              <a-button type="text" @click="openDirectoryDialog" size="small">
                <template #icon><FolderOpenOutlined /></template>
                选择
              </a-button>
            </div>
            <div v-if="directoryPath" class="selected-directory">
              <FolderOutlined class="mr-2" />
              <span class="directory-path">{{ directoryPath }}</span>
            </div>
            <div v-else class="no-directory">
              <a-empty description="未选择目录" class="mini-empty" />
            </div>
          </div>

          <div class="date-section">
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

          <div class="actions-section">
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
                <img
                  v-if="msg.role === 'assistant'"
                  src="https://branditechture.agency/brand-logos/wp-content/uploads/wpdm-cache/Google-Gemini-AI-900x0.png"
                  alt="AI"
                />
                <div v-else class="user-avatar">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
        class="gemini-modal"
      >
        <div class="mb-4">
          <h4 class="text-base font-medium mb-2">最近使用的目录</h4>
          <div v-if="recentDirectories.length > 0">
            <a-list bordered>
              <a-list-item
                v-for="dir in recentDirectories"
                :key="dir"
                @click="selectDirectory(dir)"
                class="cursor-pointer hover:bg-blue-50"
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
/* 谷歌Gemini风格 */
:root {
  --gemini-primary: #1a73e8;
  --gemini-primary-dark: #1967d2;
  --gemini-text: #202124;
  --gemini-text-secondary: #5f6368;
  --gemini-border: #dadce0;
  --gemini-background: #f8f9fa;
  --gemini-sidebar-width: 280px;
  --gemini-header-height: 64px;
  --gemini-message-spacing: 24px;
  --gemini-radius: 12px;
  --gemini-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
}

body {
  margin: 0;
  padding: 0;
  font-family: 'Google Sans', Arial, sans-serif;
  color: var(--gemini-text);
  background: #fff;
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

.gemini-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

/* 头部样式 */
.gemini-header {
  height: var(--gemini-header-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  border-bottom: 1px solid var(--gemini-border);
  background: white;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  z-index: 10;
}

.logo {
  display: flex;
  align-items: center;
}

.logo-text {
  font-size: 20px;
  font-weight: 500;
  margin-left: 12px;
  color: var(--gemini-text);
}

.settings-btn {
  border-radius: 20px;
}

/* 主内容区域 */
.gemini-main {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* 侧边栏 */
.sidebar {
  width: var(--gemini-sidebar-width);
  padding: 20px;
  border-right: 1px solid var(--gemini-border);
  background: var(--gemini-background);
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.section-title h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: var(--gemini-text);
}

.selected-directory {
  padding: 10px;
  background: white;
  border-radius: 8px;
  border: 1px solid var(--gemini-border);
  font-size: 14px;
  word-break: break-all;
}

.directory-path {
  color: var(--gemini-text-secondary);
}

.no-directory {
  padding: 10px;
  background: white;
  border-radius: 8px;
  border: 1px dashed var(--gemini-border);
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
}

.chat-messages {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--gemini-message-spacing);
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
  flex: 0 0 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 12px;
}

.message-user .message-avatar {
  margin-right: 0;
  margin-left: 12px;
}

.message-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-avatar {
  width: 100%;
  height: 100%;
  background: var(--gemini-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.message-content {
  background: var(--gemini-background);
  border-radius: var(--gemini-radius);
  padding: 12px 16px;
  position: relative;
}

.message-user .message-content {
  background: var(--gemini-primary);
  color: white;
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  font-size: 12px;
}

.message-sender {
  font-weight: 500;
}

.message-user .message-header {
  color: rgba(255, 255, 255, 0.9);
}

.message-time {
  color: var(--gemini-text-secondary);
  font-size: 11px;
}

.message-user .message-time {
  color: rgba(255, 255, 255, 0.8);
}

.message-body {
  white-space: pre-wrap;
}

/* 输入区域 */
.chat-input {
  padding: 16px 24px;
  border-top: 1px solid var(--gemini-border);
  display: flex;
  gap: 12px;
}

.input-field {
  border-radius: 24px;
  padding: 12px 16px;
  border-color: var(--gemini-border);
  background: var(--gemini-background);
}

.send-btn {
  border-radius: 50%;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
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

/* 模态框样式 */
.gemini-modal :deep(.ant-modal-content) {
  border-radius: var(--gemini-radius);
}

/* 适应Ant Design Vue 3的深度选择器 */
:deep(.ant-btn-primary) {
  background-color: var(--gemini-primary);
  border-color: var(--gemini-primary);
}

:deep(.ant-btn-primary:hover),
:deep(.ant-btn-primary:focus) {
  background-color: var(--gemini-primary-dark);
  border-color: var(--gemini-primary-dark);
}

:deep(.ant-input:focus),
:deep(.ant-input-affix-wrapper:focus),
:deep(.ant-input-affix-wrapper-focused) {
  border-color: var(--gemini-primary);
  box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.2);
}

:deep(.ant-picker-focused) {
  border-color: var(--gemini-primary);
  box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.2);
}
</style>
