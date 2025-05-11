<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed, PropType } from 'vue';
import { message } from 'ant-design-vue';
import { UserOutlined, RobotOutlined, SendOutlined, LoadingOutlined, DeleteOutlined } from '@ant-design/icons-vue';
import { generateDayReport } from '../services/deepseekService';

// 定义可能的日期类型
type DateLike = Date | { toDate: () => Date } | string | number;

const props = defineProps({
  directoryPath: {
    type: String,
    required: true
  },
  selectedDate: {
    type: [Object, Date, String, Number] as PropType<DateLike>,
    required: true
  },
  defaultPrompt: {
    type: String,
    default: ''
  },
  loading: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:loading', 'message-sent', 'message-received']);

// 用户输入
const userInput = ref('');
// 消息列表
const messages = reactive([
  {
    id: 'welcome',
    role: 'assistant',
    content: '欢迎使用日报生成助手，请选择代码库目录并输入提示词以生成日报。',
    time: new Date().toISOString(),
    thinking: false,
    streaming: false
  }
]);

// 正在输出的消息内容
const streamingContent = ref('');
// 当前是否在思考/生成中
const thinking = ref(false);
// 当前是否在流式输出中
const streaming = ref(false);

// 消息容器ref
const chatMessagesRef = ref<HTMLElement | null>(null);

// 转换日期为标准Date对象
const getStandardDate = () => {
  // 检查是否有toDate方法（dayjs对象）
  const date = props.selectedDate as any;
  if (date && typeof date.toDate === 'function') {
    return date.toDate();
  }
  // 如果是Date对象
  if (date instanceof Date) {
    return date;
  }
  // 尝试转换字符串或时间戳
  return new Date(date);
};

// 获取格式化的日期字符串
const getFormattedDate = () => {
  const date = getStandardDate();
  return date.toLocaleDateString('zh-CN');
};

// 发送用户消息
const sendMessage = async () => {
  if (!userInput.value.trim()) return;
  
  // 检查目录是否选择
  if (!props.directoryPath) {
    message.error('请先选择代码库目录');
    return;
  }
  
  const content = userInput.value.trim();
  userInput.value = '';
  
  // 添加用户消息
  const userMessageId = Date.now().toString();
  addMessage('user', content, userMessageId);
  
  emit('message-sent', content);
  
  // 添加AI思考消息
  const aiMessageId = (Date.now() + 1).toString();
  thinking.value = true;
  addMessage('assistant', '思考中...', aiMessageId, true, false);
  
  // 更新加载状态
  emit('update:loading', true);
  
  try {
    // 启动流式输出
    streaming.value = true;
    
    // 生成日报内容，添加用户自定义提示
    const reportContent = await generateDayReport({
      gitPath: props.directoryPath,
      date: getStandardDate(),
      customPrompt: content,
    });
    
    // 模拟流式输出
    await simulateStreamOutput(reportContent, aiMessageId);
    
    // 更新消息为完成状态
    const messageIndex = findMessageIndexById(aiMessageId);
    if (messageIndex !== -1) {
      messages[messageIndex].thinking = false;
      messages[messageIndex].streaming = false;
    }
    
    emit('message-received', reportContent);
  } catch (error: any) {
    console.error('处理用户输入时出错:', error);
    message.error(`处理失败: ${error.message}`);
    
    // 更新失败消息
    const messageIndex = findMessageIndexById(aiMessageId);
    if (messageIndex !== -1) {
      messages[messageIndex].content = `处理失败: ${error.message}`;
      messages[messageIndex].thinking = false;
      messages[messageIndex].streaming = false;
    }
  } finally {
    // 重置状态
    thinking.value = false;
    streaming.value = false;
    emit('update:loading', false);
  }
};

// 生成默认日报
const generateDefaultReport = async () => {
  if (!props.directoryPath) {
    message.error('请先选择代码库目录');
    return;
  }
  
  // 添加系统消息
  const systemMessageId = Date.now().toString();
  const promptMessage = `请生成${getFormattedDate()}的日报`;
  addMessage('system', promptMessage, systemMessageId);
  
  // 获取Git提交记录
  try {
    const { getDetailedCommitsForDate } = await import('../services/gitService');
    const commits = await getDetailedCommitsForDate(props.directoryPath, getStandardDate());
    
    // 如果有提交记录，显示一下详情
    if (commits && commits.length > 0) {
      const commitsPreviewId = Date.now().toString() + "-preview";
      
      // 格式化预览信息
      let previewContent = `找到 ${commits.length} 条提交记录:\n\n`;
      commits.forEach((commit, index) => {
        previewContent += `${index + 1}. ${commit.hash.substring(0, 7)} - ${commit.message} (${commit.author})\n`;
        previewContent += `   修改了 ${commit.files.length} 个文件\n`;
      });
      
      // 添加预览消息
      addMessage('system', previewContent, commitsPreviewId);
    } else {
      addMessage('system', `${getFormattedDate()}没有找到Git提交记录。`, Date.now().toString() + "-no-commits");
    }
  } catch (error: any) {
    console.error('获取Git提交记录失败:', error);
    const errorMessageId = Date.now().toString() + "-error";
    addMessage('system', `获取Git提交记录失败: ${error.message}`, errorMessageId);
    // 尽管无法获取Git记录，仍然继续尝试生成日报
  }
  
  // 添加AI思考消息
  const aiMessageId = (Date.now() + 1).toString();
  thinking.value = true;
  addMessage('assistant', '思考中...', aiMessageId, true, false);
  
  // 更新加载状态
  emit('update:loading', true);
  
  try {
    // 启动流式输出
    streaming.value = true;
    
    // 生成日报内容
    const reportContent = await generateDayReport({
      gitPath: props.directoryPath,
      date: getStandardDate(),
      customPrompt: '',
    });
    
    // 模拟流式输出
    await simulateStreamOutput(reportContent, aiMessageId);
    
    // 更新消息为完成状态
    const messageIndex = findMessageIndexById(aiMessageId);
    if (messageIndex !== -1) {
      messages[messageIndex].thinking = false;
      messages[messageIndex].streaming = false;
    }
    
    emit('message-received', reportContent);
  } catch (error: any) {
    console.error('生成日报时出错:', error);
    message.error(`生成日报失败: ${error.message}`);
    
    // 更新失败消息
    const messageIndex = findMessageIndexById(aiMessageId);
    if (messageIndex !== -1) {
      messages[messageIndex].content = `生成失败: ${error.message}`;
      messages[messageIndex].thinking = false;
      messages[messageIndex].streaming = false;
    }
  } finally {
    // 重置状态
    thinking.value = false;
    streaming.value = false;
    emit('update:loading', false);
  }
};

// 显示Git提交详情
const showGitDetails = async () => {
  if (!props.directoryPath) {
    message.error('请先选择代码库目录');
    return;
  }
  
  // 添加加载消息
  const loadingMessageId = Date.now().toString();
  addMessage('system', '正在获取Git提交详情...', loadingMessageId);
  
  try {
    // 显示诊断信息
    const diagnosticInfo = `
## 诊断信息
- 操作系统: ${navigator.platform}
- 当前日期: ${getFormattedDate()}
- 目录路径: ${props.directoryPath}
- 应用类型: ${window.electron ? 'Electron' : '浏览器'}
`;
    
    // 更新加载消息以显示诊断信息
    const diagMessageId = loadingMessageId + "-diag";
    addMessage('system', diagnosticInfo, diagMessageId);
    
    // 正常获取Git提交记录
    const { getDetailedCommitsForDate } = await import('../services/gitService');
    const commits = await getDetailedCommitsForDate(props.directoryPath, getStandardDate());
    
    // 更新加载消息
    const messageIndex = findMessageIndexById(loadingMessageId);
    
    if (commits && commits.length > 0) {
      // 格式化详细信息
      let detailContent = `## ${getFormattedDate()} 的 Git 提交详情\n\n`;
      
      commits.forEach((commit, index) => {
        detailContent += `### 提交 ${index + 1}: ${commit.hash.substring(0, 7)}\n`;
        detailContent += `- 作者: ${commit.author}\n`;
        detailContent += `- 信息: ${commit.message}\n`;
        detailContent += `- 修改文件统计:\n\`\`\`\n${commit.diffStat}\n\`\`\`\n\n`;
        
        // 添加文件修改内容摘要
        if (commit.fileChanges && commit.fileChanges.length > 0) {
          detailContent += `#### 主要修改内容:\n`;
          commit.fileChanges.forEach(fileChange => {
            detailContent += `##### 文件: ${fileChange.file}\n\`\`\`diff\n${fileChange.changes}\n\`\`\`\n\n`;
          });
        }
        
        detailContent += `---\n\n`;
      });
      
      // 更新消息内容
      if (messageIndex !== -1) {
        messages[messageIndex].content = detailContent;
      }
    } else {
      // 更新消息内容
      if (messageIndex !== -1) {
        messages[messageIndex].content = `${getFormattedDate()} 没有Git提交记录。`;
      }
    }
  } catch (error: any) {
    console.error('获取Git提交详情失败:', error);
    
    // 显示详细错误信息
    const messageIndex = findMessageIndexById(loadingMessageId);
    if (messageIndex !== -1) {
      messages[messageIndex].content = `获取Git提交详情失败: ${error.message}`;
    }
    
    // 同时显示错误提示
    message.error(`获取Git提交详情失败: ${error.message}`);
  }
};

// 模拟流式输出
const simulateStreamOutput = async (content: string, messageId: string) => {
  const messageIndex = findMessageIndexById(messageId);
  if (messageIndex === -1) return;
  
  // 更新消息状态
  messages[messageIndex].thinking = false;
  messages[messageIndex].streaming = true;
  messages[messageIndex].content = '';
  
  // 定义输出速度（字符/毫秒）
  const minSpeed = 10; // 最小速度，每10ms输出一个字符
  const maxSpeed = 30; // 最大速度，每30ms输出一个字符
  
  // 模拟打字效果
  for (let i = 0; i < content.length; i++) {
    // 随机速度，使输出更自然
    const speed = Math.floor(Math.random() * (maxSpeed - minSpeed + 1)) + minSpeed;
    
    await new Promise(resolve => setTimeout(resolve, speed));
    
    // 更新消息内容
    messages[messageIndex].content += content[i];
    
    // 滚动到底部
    scrollToBottom();
  }
};

// 添加消息
const addMessage = (role, content, id = Date.now().toString(), isThinking = false, isStreaming = false) => {
  messages.push({
    id,
    role,
    content,
    time: new Date().toISOString(),
    thinking: isThinking,
    streaming: isStreaming
  });
  
  // 滚动到底部
  scrollToBottom();
};

// 清空消息
const clearMessages = () => {
  // 只保留欢迎消息
  messages.splice(1);
};

// 查找消息索引
const findMessageIndexById = (id: string) => {
  return messages.findIndex(msg => msg.id === id);
};

// 滚动到底部
const scrollToBottom = () => {
  setTimeout(() => {
    if (chatMessagesRef.value) {
      chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight;
    }
  }, 50);
};

// 处理按键事件
const handleKeyDown = (e: KeyboardEvent) => {
  // 如果按下Ctrl+Enter，发送消息
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    sendMessage();
  }
  // 如果仅按下Enter，但设置了回车键发送，则发送消息
  else if (e.key === 'Enter' && !e.shiftKey) {
    // 此处可以添加根据设置决定是否发送的逻辑
    // e.preventDefault();
    // sendMessage();
  }
};

// 监听目录和日期变化，可能需要清空聊天
watch(() => props.directoryPath, (newPath, oldPath) => {
  if (newPath !== oldPath && oldPath) {
    // 目录变化，清空聊天
    clearMessages();
  }
});

// 自动滚动到底部
onMounted(() => {
  scrollToBottom();
});
</script>

<template>
  <div class="chat-container">
    <!-- 聊天消息区域 -->
    <div class="chat-messages" ref="chatMessagesRef">
      <div
        v-for="msg in messages"
        :key="msg.id"
        :class="['message-item', `message-${msg.role}`]"
      >
        <div class="message-avatar">
          <a-avatar
            :style="{ backgroundColor: msg.role === 'assistant' ? '#5661F1' : (msg.role === 'system' ? '#999999' : '#87d068') }"
          >
            <template #icon>
              <robot-outlined v-if="msg.role === 'assistant'" />
              <user-outlined v-else-if="msg.role === 'user'" />
              <robot-outlined v-else />
            </template>
          </a-avatar>
        </div>
        <div class="message-content">
          <div class="message-header">
            <span class="message-sender">
              {{ msg.role === 'assistant' ? '日报助手' : (msg.role === 'system' ? '系统' : '我') }}
            </span>
            <span class="message-time">{{ new Date(msg.time).toLocaleTimeString() }}</span>
          </div>
          <div class="message-body" :class="{ 'thinking': msg.thinking, 'streaming': msg.streaming }">
            <div v-if="msg.thinking" class="thinking-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div v-else>
              {{ msg.content }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="chat-input-container">
      <div class="input-wrapper">
        <a-textarea 
          v-model:value="userInput"
          placeholder="输入提示信息，例如'添加今天参加了团队会议'..."
          :disabled="loading"
          auto-size="{ minRows: 1, maxRows: 4 }"
          @keydown="handleKeyDown"
          class="chat-input"
        />
        <div class="input-buttons">
          <a-button
            type="text"
            @click="clearMessages"
            :disabled="messages.length <= 1"
            class="clear-button"
          >
            <template #icon><delete-outlined /></template>
          </a-button>
          <a-button
            type="primary"
            @click="sendMessage"
            :loading="loading"
            :disabled="loading || !userInput.trim()"
            class="send-button"
          >
            <template #icon>
              <loading-outlined v-if="loading" />
              <send-outlined v-else />
            </template>
            发送
          </a-button>
        </div>
      </div>
      <div class="input-tips">
        <span>Ctrl + Enter 发送</span>
        <div class="action-buttons">
          <a-button
            type="link"
            @click="showGitDetails"
            :disabled="loading || !props.directoryPath"
          >
            查看Git详情
          </a-button>
          <a-button
            type="link"
            @click="generateDefaultReport"
            :disabled="loading || !props.directoryPath"
          >
            生成默认日报
          </a-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #f9f9f9;
  border-radius: 12px;
  overflow: hidden;
  width: 100%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  scroll-behavior: smooth;
}

.message-item {
  display: flex;
  margin-bottom: 16px;
  max-width: 95%;
}

.message-assistant {
  align-self: flex-start;
}

.message-user {
  align-self: flex-end;
  flex-direction: row-reverse;
  margin-left: auto;
}

.message-system {
  align-self: center;
  justify-content: center;
  margin: 10px auto;
  color: #666;
  background-color: #f0f0f0;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
}

.message-avatar {
  margin: 0 12px;
  align-self: flex-start;
}

.message-content {
  background-color: #fff;
  padding: 12px 16px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  max-width: calc(100% - 80px);
}

.message-user .message-content {
  background-color: #5661F1;
  color: #fff;
  text-align: right;
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.message-user .message-header {
  flex-direction: row-reverse;
  color: rgba(255, 255, 255, 0.75);
}

.message-sender {
  font-weight: 600;
}

.message-time {
  font-size: 11px;
  margin-left: 8px;
}

.message-body {
  font-size: 14px;
  line-height: 1.6;
  overflow-wrap: break-word;
  word-break: break-word;
  white-space: pre-wrap;
}

.thinking {
  min-height: 20px;
}

.thinking-dots {
  display: flex;
  align-items: center;
  height: 20px;
  gap: 4px;
}

.thinking-dots span {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #5661F1;
  animation: thinking 1.4s infinite ease-in-out both;
}

.thinking-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.thinking-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes thinking {
  0%, 80%, 100% { 
    transform: scale(0);
  } 40% { 
    transform: scale(1.0);
  }
}

.streaming {
  position: relative;
}

.streaming::after {
  content: '|';
  display: inline-block;
  color: #5661F1;
  animation: cursor 0.8s infinite;
  font-weight: bold;
}

@keyframes cursor {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.chat-input-container {
  padding: 16px;
  background-color: #fff;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.chat-input {
  flex: 1;
  border-radius: 20px;
  resize: none;
  font-size: 14px;
  padding: 10px 16px;
  border-color: #d9d9d9;
  transition: all 0.3s;
}

.chat-input:focus,
.chat-input:hover {
  border-color: #5661F1;
  box-shadow: 0 0 0 2px rgba(86, 97, 241, 0.1);
}

.input-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}

.send-button {
  border-radius: 20px;
  height: 40px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #5661F1;
  border-color: #5661F1;
}

.clear-button {
  height: 40px;
  color: #999;
  transition: all 0.3s;
}

.clear-button:hover {
  color: #ff4d4f;
}

.input-tips {
  margin-top: 6px;
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.action-buttons {
  display: flex;
  gap: 8px;
}
</style> 