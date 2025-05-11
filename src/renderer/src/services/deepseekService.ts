import { message } from 'ant-design-vue'

// 检查API密钥是否配置
export const isApiKeyConfigured = (): boolean => {
  // 尝试直接从localStorage获取
  let apiKey = localStorage.getItem('DEEPSEEK_API_KEY')
  console.log('直接从localStorage读取:', apiKey)
  
  // 如果失败，尝试从window.api.localStorage获取
  if (!apiKey && window.api?.localStorage) {
    apiKey = window.api.localStorage.getItem('DEEPSEEK_API_KEY')
    console.log('从window.api.localStorage读取:', apiKey)
  }
  
  console.log('所有localStorage内容:', { 
    '直接访问': { ...localStorage },
    'API访问': window.api?.localStorage ? window.api.localStorage.getAllItems() : '不可用'
  })
  
  const result = !!apiKey && apiKey.trim().length > 0
  console.log('isApiKeyConfigured最终结果:', result)
  return result
}

// 获取API密钥
export const getApiKey = (): string => {
  // 尝试直接从localStorage获取
  let key = localStorage.getItem('DEEPSEEK_API_KEY') || ''
  
  // 如果失败，尝试从window.api.localStorage获取
  if (!key && window.api?.localStorage) {
    key = window.api.localStorage.getItem('DEEPSEEK_API_KEY') || ''
  }
  
  return key
}

// 获取API基础URL
export const getApiBaseUrl = (): string => {
  // 尝试直接从localStorage获取
  let url = localStorage.getItem('DEEPSEEK_API_BASE_URL') || 'https://api.deepseek.com'
  
  // 如果失败，尝试从window.api.localStorage获取
  if (!url && window.api?.localStorage) {
    url = window.api.localStorage.getItem('DEEPSEEK_API_BASE_URL') || 'https://api.deepseek.com'
  }
  
  return url
}

// 获取所选模型
export const getSelectedModel = (): string => {
  // 尝试直接从localStorage获取
  let model = localStorage.getItem('DEEPSEEK_MODEL') || 'deepseek-chat'
  
  // 如果失败，尝试从window.api.localStorage获取
  if (!model && window.api?.localStorage) {
    model = window.api.localStorage.getItem('DEEPSEEK_MODEL') || 'deepseek-chat'
  }
  
  return model
}

// 获取默认提示词
export const getDefaultPrompt = (): string => {
  // 尝试直接从localStorage获取
  let prompt = localStorage.getItem('DEFAULT_PROMPT') || '请根据我的Git提交记录，详细总结今天的工作内容，包括完成的任务、解决的问题和取得的进展。格式要清晰，分点罗列，并加入技术要点。'
  
  // 如果失败，尝试从window.api.localStorage获取
  if (!prompt && window.api?.localStorage) {
    prompt = window.api.localStorage.getItem('DEFAULT_PROMPT') || '请根据我的Git提交记录，详细总结今天的工作内容，包括完成的任务、解决的问题和取得的进展。格式要清晰，分点罗列，并加入技术要点。'
  }
  
  return prompt
}

// 保存默认提示词
export const saveDefaultPrompt = (prompt: string): void => {
  // 保存到localStorage
  localStorage.setItem('DEFAULT_PROMPT', prompt)
  
  // 如果window.api.localStorage可用，也保存到那里
  if (window.api?.localStorage) {
    window.api.localStorage.setItem('DEFAULT_PROMPT', prompt)
  }
}

// 可用模型列表
export const AVAILABLE_MODELS = [
  {
    id: 'deepseek-chat',
    name: 'DeepSeek-V3',
    description: '通用对话模型'
  },
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek-R1',
    description: '推理能力增强的模型'
  },
  {
    id: 'deepseek-coder',
    name: 'DeepSeek-Coder',
    description: '代码生成和分析专用模型'
  }
]

/**
 * 生成日报
 */
export async function generateDayReport({ gitPath, date, customPrompt = '' }) {
  if (!isApiKeyConfigured()) {
    throw new Error('请先配置DeepSeek API密钥')
  }

  try {
    const apiKey = getApiKey()
    const apiBaseUrl = getApiBaseUrl()
    const model = getSelectedModel()
    const defaultPrompt = getDefaultPrompt()

    // 构建系统提示词
    const systemPrompt = `你是一个帮助生成日报的AI助手。请根据用户提供的Git代码仓库路径和日期，生成一份简洁的工作日报。
日期: ${date.toLocaleDateString('zh-CN')}
代码库路径: ${gitPath}`

    // 构建用户提示词
    let userPrompt = defaultPrompt
    if (customPrompt) {
      userPrompt += `\n其他信息：${customPrompt}`
    }

    // 请求参数
    const requestBody = {
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 1000,
      temperature: 0.7
    }

    // 判断是否在Electron环境中，使用IPC通道发送请求
    if (window.electron) {
      // 使用Electron IPC通道发送请求
      const result = await window.electron.ipcRenderer.invoke('api:generateReport', {
        apiKey,
        apiBaseUrl,
        requestBody
      })

      if (!result.success) {
        throw new Error(result.error || 'API请求失败')
      }

      return result.content
    } else {
      // 浏览器环境回退方案 - 仅用于开发
      try {
        // 请求API
        const response = await fetch(`${apiBaseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(requestBody)
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(`API请求失败: ${errorData.error?.message || response.statusText}`)
        }

        const data = await response.json()
        return data.choices[0].message.content
      } catch (error) {
        throw new Error('浏览器环境不支持直接API请求，请在Electron环境中运行')
      }
    }
  } catch (error: any) {
    console.error('生成日报时出错:', error)
    throw new Error(`生成日报失败: ${error.message || '未知错误'}`)
  }
} 