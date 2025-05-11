/**
 * DeepSeek API服务
 * 用于与DeepSeek API进行交互，获取AI生成的日报内容
 */

// 从本地存储或环境变量获取API密钥
const getApiKey = () => {
    return localStorage.getItem('deepseek_api_key') || '';
};

/**
 * 生成日报内容
 * @param {Object} options 选项
 * @param {string} options.gitPath Git仓库路径
 * @param {Date} options.date 日期
 * @param {string} options.customPrompt 自定义提示
 * @returns {Promise<string>} 生成的日报内容
 */
export const generateDayReport = async ({
    gitPath,
    date,
    customPrompt = ''
}) => {
    const apiKey = getApiKey();

    if (!apiKey) {
        throw new Error('缺少API密钥，请在设置中配置DeepSeek API密钥');
    }

    const formattedDate = date ?
        date.toLocaleDateString('zh-CN') :
        new Date().toLocaleDateString('zh-CN');

    // 构建提示信息
    let prompt = `请根据以下Git仓库的提交记录为我生成${formattedDate}的工作日报。`;

    if (customPrompt) {
        prompt += ` ${customPrompt}`;
    }

    try {
        // 调用DeepSeek API
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [{
                        role: 'system',
                        content: '你是一位专业的技术日报生成助手，能够根据Git提交记录生成工作日报。'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 1000
            })
        });

        const data = await response.json();

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