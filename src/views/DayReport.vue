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
      <div class="flex flex-col h-screen">
        <header class="bg-blue-600 text-white p-4 flex justify-between items-center">
          <h1 class="text-2xl font-bold">日报助手</h1>
          <Button type="primary" ghost @click="openSettings"> 设置 </Button>
        </header>

        <main class="flex-1 overflow-hidden flex flex-col">
          <div class="settings-panel p-4 bg-gray-100">
            <div class="flex flex-wrap gap-4 items-center">
              <div>
                <Button @click="handleSelectDirectory" type="primary"> 选择代码目录 </Button>
                <span v-if="directoryPath" class="ml-2">{{ directoryPath }}</span>
              </div>

              <div class="flex items-center gap-2">
                <Button @click="toggleDateMode">
                  {{ isCustomDate ? '使用今天' : '自定义日期' }}
                </Button>

                <div v-if="isCustomDate" class="flex items-center">
                  <input
                    type="date"
                    :value="dateValue.toISOString().split('T')[0]"
                    @change="(e) => handleDateChange(new Date(e.target.value))"
                    class="px-2 py-1 border rounded"
                  />
                </div>
              </div>

              <Button @click="handleSubmit" type="primary" :loading="loading" danger>
                {{ loading ? '生成中...' : '生成日报' }}
              </Button>
            </div>
          </div>

          <div class="conversation-area flex-1 overflow-y-auto p-4">
            <div class="flex flex-col gap-4">
              <!-- 简单地遍历消息并使用Bubble组件显示 -->
              <template v-for="msg in messages" :key="msg.id">
                <Bubble :role="msg.role" :content="msg.content" :showTime="true" />
              </template>

              <!-- 加载提示 -->
              <div v-if="loading" class="self-center py-2">
                <div class="animate-pulse text-gray-400">正在生成回复...</div>
              </div>
            </div>
          </div>

          <div class="input-area border-t p-4">
            <Sender
              placeholder="输入自定义指令，例如: 添加我今天处理了XX任务"
              :loading="loading"
              @send="handleUserInput"
            />
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
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.conversation-area {
  background-color: #f9f9f9;
}
</style>
