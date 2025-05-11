/**
 * DeepSeek API服务
 * 用于与DeepSeek API进行交互，获取AI生成的日报内容
 */

// 可用的模型列表
export const AVAILABLE_MODELS = [{
        id: 'deepseek-chat',
        name: 'DeepSeek-V3',
        description: 'DeepSeek的通用对话模型，适合日常对话和内容生成',
        defaultTemp: 0.7
    },
    {
        id: 'deepseek-reasoner',
        name: 'DeepSeek-R1',
        description: '专注于推理能力的模型，适合复杂问题解决和分析',
        defaultTemp: 0.3
    }
];

// API基础URL
const API_BASE_URL = 'https://api.deepseek.com';

// 从本地存储获取API密钥
const getApiKey = () => {
    return localStorage.getItem('deepseek_api_key') || '';
};

// 从本地存储获取选定的模型ID
export const getSelectedModel = () => {
    return localStorage.getItem('deepseek_selected_model') || AVAILABLE_MODELS[0].id;
};

/**
 * 保存选定的模型ID
 * @param {string} modelId 模型ID
 */
export const saveSelectedModel = (modelId) => {
    localStorage.setItem('deepseek_selected_model', modelId);
};

/**
 * 生成日报内容
 * @param {Object} options 选项
 * @param {string} options.gitPath Git仓库路径
 * @param {Date} options.date 日期
 * @param {string} options.customPrompt 自定义提示
 * @param {string} options.modelId 模型ID，默认使用已保存的模型
 * @param {number} options.temperature 温度参数，控制创造性，默认使用模型推荐值
 * @returns {Promise<string>} 生成的日报内容
 */
export const generateDayReport = async ({
    gitPath,
    date,
    customPrompt = '',
    modelId = null,
    temperature = null
}) => {
    const apiKey = getApiKey();

    if (!apiKey) {
        throw new Error('缺少API密钥，请在设置中配置DeepSeek API密钥');
    }

    // 使用指定的模型ID或从存储中获取
    const selectedModelId = modelId || getSelectedModel();

    // 查找模型配置
    const modelConfig = AVAILABLE_MODELS.find(model => model.id === selectedModelId) || AVAILABLE_MODELS[0];

    // 使用指定的温度参数或模型默认值
    const modelTemperature = temperature !== null ? temperature : modelConfig.defaultTemp;

    const formattedDate = date ?
        date.toLocaleDateString('zh-CN') :
        new Date().toLocaleDateString('zh-CN');

    // 构建提示信息
    let prompt = `请根据以下Git仓库的提交记录为我生成${formattedDate}的工作日报。`;

    if (customPrompt) {
        prompt += ` ${customPrompt}`;
    }

    try {
        console.log('调用DeepSeek API，模型:', selectedModelId);

        // 调用DeepSeek API
        const response = await fetch(`${API_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: selectedModelId,
                messages: [{
                        role: 'system',
                        content: '你是一位专业的技术日报生成助手，能够根据Git提交记录生成工作日报。请以结构化的方式呈现内容，包括工作摘要、主要完成工作、进行中工作和遇到的问题等。'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: modelTemperature,
                max_tokens: 1500
            })
        });

        const data = await response.json();
        console.log('API响应:', data);

        if (!response.ok) {
            throw new Error(`API错误: ${data.error?.message || '未知错误'}`);
        }

        return data.choices[0]?.message?.content || '无法生成日报内容';
    } catch (error) {
        console.error('DeepSeek API调用失败:', error);
        throw new Error(`日报生成失败: ${error.message}`);
    }
};

/**
 * 直接与DeepSeek API对话（通用接口）
 * @param {Object} options 选项
 * @param {string} options.prompt 用户输入的提示
 * @param {string} options.systemPrompt 系统提示，定义助手行为
 * @param {string} options.modelId 模型ID，默认使用已保存的模型
 * @param {number} options.temperature 温度参数，默认使用模型推荐值
 * @param {boolean} options.stream 是否使用流式输出
 * @returns {Promise<Object>} 响应内容
 */
export const chatWithDeepSeek = async ({
    prompt,
    systemPrompt = '你是一位有用的AI助手。',
    modelId = null,
    temperature = null,
    stream = false
}) => {
    const apiKey = getApiKey();

    if (!apiKey) {
        throw new Error('缺少API密钥，请在设置中配置DeepSeek API密钥');
    }

    // 使用指定的模型ID或从存储中获取
    const selectedModelId = modelId || getSelectedModel();

    // 查找模型配置
    const modelConfig = AVAILABLE_MODELS.find(model => model.id === selectedModelId) || AVAILABLE_MODELS[0];

    // 使用指定的温度参数或模型默认值
    const modelTemperature = temperature !== null ? temperature : modelConfig.defaultTemp;

    const requestBody = {
        model: selectedModelId,
        messages: [{
                role: 'system',
                content: systemPrompt
            },
            {
                role: 'user',
                content: prompt
            }
        ],
        temperature: modelTemperature,
        max_tokens: 2000,
        stream
    };

    try {
        // 调用DeepSeek API
        const response = await fetch(`${API_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        if (stream) {
            // 返回原始响应对象，供调用者处理流
            return response;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(`API错误: ${data.error?.message || '未知错误'}`);
        }

        return {
            content: data.choices[0]?.message?.content || '',
            usage: data.usage,
            model: data.model
        };
    } catch (error) {
        console.error('DeepSeek API调用失败:', error);
        throw new Error(`对话失败: ${error.message}`);
    }
};

/**
 * 保存API密钥
 * @param {string} apiKey API密钥
 */
export const saveApiKey = (apiKey) => {
    localStorage.setItem('deepseek_api_key', apiKey);
};

/**
 * 检查是否已配置API密钥
 * @returns {boolean} 是否已配置
 */
export const isApiKeyConfigured = () => {
    return !!getApiKey();
};