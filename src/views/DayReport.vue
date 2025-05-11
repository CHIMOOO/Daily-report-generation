<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Bubble, Conversations, Sender, XProvider } from 'ant-design-x-vue'
import { message, Button } from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import { generateDayReport, isApiKeyConfigured } from '../services/deepseekService'
import { getCommitsForDate } from '../services/gitService'
import SettingsModal from '../components/SettingsModal.vue'

const directoryPath = ref('')
const dateValue = ref(new Date())
const loading = ref(false)
const messages = reactive([
  {
    id: 'init',
    content: '正在加载日报助手...',
    role: 'system',
    createdAt: new Date().toISOString(),
    status: 'success',
  },
])
const isCustomDate = ref(false)
const settingsVisible = ref(false)
const settingsModalRef = ref(null)

// 格式化消息，确保符合ant-design-x-vue要求
const formatMessage = (content, role) => ({
  id: Date.now().toString(),
  content,
  role,
  createdAt: new Date().toISOString(),
  status: 'success',
})

const checkApiKey = () => {
  if (!isApiKeyConfigured()) {
    message.warning('请先配置DeepSeek API密钥')
    settingsVisible.value = true
    return false
  }
  return true
}

const handleSubmit = async () => {
  if (!directoryPath.value) {
    message.error('请选择代码目录')
    return
  }

  if (!checkApiKey()) {
    return
  }

  loading.value = true

  try {
    // 添加用户消息
    const userPrompt = isCustomDate.value
      ? `请生成${dateValue.value.toLocaleDateString('zh-CN')}的日报`
      : '请生成今日日报'

    messages.push(formatMessage(userPrompt, 'user'))

    // 获取Git提交记录
    const commits = await getCommitsForDate(directoryPath.value, dateValue.value)

    // 生成日报内容
    const reportContent = await generateDayReport({
      gitPath: directoryPath.value,
      date: dateValue.value,
      customPrompt: '',
    })

    // 添加AI回复
    messages.push(formatMessage(reportContent, 'assistant'))
  } catch (error) {
    console.error('生成日报时出错:', error)
    message.error(`生成日报失败: ${error.message}`)

    // 添加错误消息
    messages.push(formatMessage(`生成失败: ${error.message}`, 'assistant'))
  } finally {
    loading.value = false
  }
}

const handleSelectDirectory = () => {
  // 在实际应用中，这里应该使用文件选择器
  // 由于浏览器安全限制，模拟选择目录
  directoryPath.value = 'D:/my-project'
  message.success('已选择目录: ' + directoryPath.value)
}

// 日期变更处理
const handleDateChange = (date) => {
  dateValue.value = date
}

// 切换日期选择模式
const toggleDateMode = () => {
  isCustomDate.value = !isCustomDate.value
}

// 处理用户输入
const handleUserInput = async (content) => {
  if (!content.trim()) return

  messages.push(formatMessage(content, 'user'))

  loading.value = true

  try {
    // 生成日报内容，添加用户自定义提示
    const reportContent = await generateDayReport({
      gitPath: directoryPath.value,
      date: dateValue.value,
      customPrompt: content,
    })

    // 添加AI回复
    messages.push(formatMessage(reportContent, 'assistant'))
  } catch (error) {
    console.error('处理用户输入时出错:', error)
    message.error(`处理失败: ${error.message}`)

    messages.push(formatMessage(`处理失败: ${error.message}`, 'assistant'))
  } finally {
    loading.value = false
  }
}

// 打开设置对话框
const openSettings = () => {
  settingsVisible.value = true
}

// 处理设置保存
const handleSettingsSaved = () => {
  message.success('设置已保存')
}

// 添加调试信息帮助诊断
const debug = (info) => {
  console.log('[日报助手调试]', info)
}

// 组件挂载时清除初始消息并添加欢迎消息
onMounted(() => {
  debug('组件挂载，重置消息')
  // 清空初始化消息
  messages.length = 0

  // 添加欢迎消息
  messages.push(
    formatMessage(
      `# 欢迎使用日报助手

请按照以下步骤使用：
1. 点击右上角设置按钮，配置DeepSeek API密钥
2. 选择代码目录
3. 点击"生成日报"按钮

您还可以：
- 切换到"自定义日期"模式，生成特定日期的日报
- 在下方输入框中添加自定义指令，如"添加我今天参加了团队会议"
`,
      'assistant',
    ),
  )

  debug('欢迎消息已添加')
})
</script>

<template>
  <div class="day-report-container">
    <XProvider defaultModel="deepseek" :allowAttachments="false">
      <div class="flex flex-col h-screen bg-white text-gray-800">
        <header class="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <div class="flex items-center">
            <div class="text-blue-500 mr-2">
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
                <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path>
                <line x1="16" y1="8" x2="2" y2="22"></line>
                <line x1="17.5" y1="15" x2="9" y2="15"></line>
              </svg>
            </div>
            <h1 class="text-2xl font-semibold text-gray-800">日报助手</h1>
          </div>
          <Button type="primary" ghost @click="openSettings">
            <span class="mr-1">
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
              >
                <circle cx="12" cy="12" r="3"></circle>
                <path
                  d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
                ></path>
              </svg>
            </span>
            设置
          </Button>
        </header>

        <main class="flex-1 overflow-hidden flex flex-col">
          <div class="settings-panel p-4 bg-gray-50 border-b border-gray-200">
            <div class="flex flex-wrap gap-4 items-center">
              <div>
                <Button @click="handleSelectDirectory" type="primary">
                  <span class="mr-1">
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
                    >
                      <path
                        d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
                      ></path>
                    </svg>
                  </span>
                  选择代码目录
                </Button>
                <span v-if="directoryPath" class="ml-2 text-gray-600">{{ directoryPath }}</span>
              </div>

              <div class="flex items-center gap-2">
                <Button @click="toggleDateMode">
                  <span class="mr-1">
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
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </span>
                  {{ isCustomDate ? '使用今天' : '自定义日期' }}
                </Button>

                <div
                  v-if="isCustomDate"
                  class="flex items-center bg-white rounded border border-gray-300 overflow-hidden"
                >
                  <input
                    type="date"
                    :value="dateValue.toISOString().split('T')[0]"
                    @change="(e) => handleDateChange(new Date(e.target.value))"
                    class="px-2 py-1 focus:outline-none"
                  />
                </div>
              </div>

              <Button @click="handleSubmit" type="primary" :loading="loading" class="generate-btn">
                <span v-if="!loading" class="mr-1">
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
                  >
                    <path
                      d="M12 22C6.5 22 2 17.5 2 12S6.5 2 12 2s10 4.5 10 10-4.5 10-10 10z"
                    ></path>
                    <polyline points="12 16 16 12 12 8"></polyline>
                    <line x1="8" y1="12" x2="16" y2="12"></line>
                  </svg>
                </span>
                {{ loading ? '生成中...' : '生成日报' }}
              </Button>
            </div>
          </div>

          <div class="conversation-area flex-1 overflow-y-auto p-4 scrollbar">
            <div class="flex flex-col gap-4">
              <template v-for="msg in messages" :key="msg.id">
                <div :class="['message-bubble', msg.role === 'user' ? 'user-bubble' : 'ai-bubble']">
                  <Bubble :role="msg.role" :content="msg.content" :showTime="true" />
                </div>
              </template>

              <div v-if="loading" class="self-center py-2">
                <div class="pulse-loader">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          </div>

          <div class="input-area border-t border-gray-200 p-4 bg-white">
            <div class="relative">
              <Sender
                placeholder="输入自定义指令，例如: 添加我今天参加了团队会议"
                :loading="loading"
                @send="handleUserInput"
                class="sender-input"
              />
            </div>
          </div>
        </main>
      </div>
    </XProvider>

    <SettingsModal
      v-model:visible="settingsVisible"
      @saved="handleSettingsSaved"
      ref="settingsModalRef"
    />
  </div>
</template>

<style scoped>
.day-report-container {
  height: 100%;
  width: 100%;
  overflow: hidden;
  position: relative;
}

/* 消息气泡样式 */
.message-bubble {
  max-width: 85%;
  border-radius: 10px;
  overflow: hidden;
  transition: all 0.2s ease;
  animation: fadeIn 0.3s;
  margin-bottom: 0.75rem;
}

.user-bubble {
  align-self: flex-end;
  background: #f0f9ff;
  border: 1px solid #e0f2fe;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.ai-bubble {
  align-self: flex-start;
  background: #f9fafb;
  border: 1px solid #f1f5f9;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

/* 加载动画 */
.pulse-loader {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 1rem 0;
}

.pulse-loader span {
  width: 8px;
  height: 8px;
  background-color: #3b82f6;
  border-radius: 50%;
  animation: pulse 1.5s infinite ease-in-out;
}

.pulse-loader span:nth-child(2) {
  animation-delay: 0.2s;
}

.pulse-loader span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(0.5);
    opacity: 0.5;
  }
  50% {
    transform: scale(1);
    opacity: 1;
  }
}

/* 响应式设计 */
@media (max-width: 640px) {
  .message-bubble {
    max-width: 95%;
  }

  .settings-panel .flex {
    flex-direction: column;
    align-items: flex-start;
  }

  .settings-panel .flex > div {
    margin-bottom: 8px;
    width: 100%;
  }

  .settings-panel button {
    width: 100%;
  }
}

/* 滚动条样式 */
.scrollbar::-webkit-scrollbar {
  width: 6px;
}

.scrollbar::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* 淡入动画 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Mosaic风格按钮和表单元素 */
.generate-btn {
  background-color: #3b82f6;
  border-color: #3b82f6;
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: all 0.2s;
}

.generate-btn:hover {
  background-color: #2563eb;
  border-color: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1);
}

.sender-input {
  border-radius: 6px;
  border-color: #e2e8f0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.sender-input:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

/* 聊天区域样式增强 */
.conversation-area {
  padding: 1rem;
  background-color: #fcfcfc;
}

/* 头部和设置面板样式增强 */
header {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  z-index: 10;
}

.settings-panel {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  z-index: 5;
}

/* 输入区域样式增强 */
.input-area {
  box-shadow: 0 -1px 3px rgba(0, 0, 0, 0.03);
  padding: 1rem;
}
</style>
