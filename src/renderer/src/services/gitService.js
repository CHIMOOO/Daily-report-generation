/**
 * Git服务
 * 用于读取Git仓库提交信息
 */

/**
 * 获取指定日期的Git提交信息
 * 注意：在浏览器环境中无法直接读取本地Git仓库，此处需要后端服务支持
 * 这里提供了一个模拟实现，实际应用中需要通过后端API或Electron等实现
 * 
 * @param {string} repoPath 仓库路径
 * @param {Date} date 日期对象
 * @returns {Promise<Array>} 提交信息数组
 */
export const getCommitsForDate = async (repoPath, date) => {
    // 在实际应用中，这里应该通过Electron的ipcRenderer调用主进程方法读取Git仓库
    // 模拟与主进程通信
    console.log(`[Git服务] 获取 ${repoPath} 在 ${date} 的提交记录`);
    
    try {
        // 首先尝试直接使用window.api特定方法（优先）
        if (window.api && window.api.getGitCommits) {
            return await window.api.getGitCommits(repoPath, date);
        }
        
        // 其次尝试使用Electron的ipcRenderer
        if (window.electron) {
            try {
                return await window.electron.ipcRenderer.invoke('git:getCommits', {
                    repoPath,
                    date: date.toISOString()
                });
            } catch (ipcError) {
                console.warn('IPC调用失败，使用模拟数据:', ipcError);
                // IPC调用失败，回退到模拟数据
                return await getMockCommits(repoPath, date);
            }
        }
        
        // 否则使用模拟数据
        return await getMockCommits(repoPath, date);
    } catch (error) {
        console.error('获取Git提交记录失败:', error);
        throw new Error(`无法获取Git提交记录: ${error.message}`);
    }
};

/**
 * 获取模拟的Git提交数据
 * @param {string} repoPath 仓库路径
 * @param {Date} date 日期对象
 * @returns {Promise<Array>} 提交信息数组
 */
const getMockCommits = async (repoPath, date) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const formattedDate = date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

            const mockCommits = [{
                    hash: 'a1b2c3d4e5f6g7h8i9j0',
                    author: '张三',
                    date: formattedDate,
                    message: 'feat: 实现用户登录功能',
                    files: ['src/components/Login.vue', 'src/services/auth.js']
                },
                {
                    hash: 'b2c3d4e5f6g7h8i9j0k1',
                    author: '张三',
                    date: formattedDate,
                    message: 'fix: 修复表单验证问题',
                    files: ['src/utils/validators.js']
                },
                {
                    hash: 'c3d4e5f6g7h8i9j0k1l2',
                    author: '李四',
                    date: formattedDate,
                    message: 'perf: 优化图片加载性能',
                    files: ['src/components/ImageLoader.vue']
                }
            ];

            resolve(mockCommits);
        }, 500);
    });
};

/**
 * 获取最近几天的Git提交信息
 * @param {string} repoPath 仓库路径
 * @param {number} days 天数
 * @returns {Promise<Array>} 提交信息数组
 */
export const getRecentCommits = async (repoPath, days = 7) => {
    // 首先尝试直接使用window.api特定方法（优先）
    if (window.api && window.api.getRecentCommits) {
        try {
            return await window.api.getRecentCommits(repoPath, days);
        } catch (error) {
            console.warn('API调用失败，尝试其他方法:', error);
        }
    }
  
    // 检查是否在Electron环境中
    if (window.electron) {
        try {
            return await window.electron.ipcRenderer.invoke('git:getRecentCommits', {
                repoPath,
                days
            });
        } catch (error) {
            console.error('获取最近Git提交记录失败:', error);
            // 失败后使用模拟数据
        }
    }
    
    // 模拟数据
    return new Promise((resolve) => {
        setTimeout(() => {
            const mockCommits = [];
            const today = new Date();

            for (let i = 0; i < days; i++) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                const formattedDate = date.toISOString().split('T')[0];

                // 生成随机数量的提交
                const commitCount = Math.floor(Math.random() * 5) + 1;

                for (let j = 0; j < commitCount; j++) {
                    mockCommits.push({
                        hash: Math.random().toString(36).substring(2, 15),
                        author: Math.random() > 0.5 ? '张三' : '李四',
                        date: formattedDate,
                        message: [
                            'feat: 添加新功能',
                            'fix: 修复bug',
                            'docs: 更新文档',
                            'style: 格式调整',
                            'refactor: 代码重构',
                            'perf: 性能优化',
                            'test: 添加测试'
                        ][Math.floor(Math.random() * 7)],
                        files: [
                            'src/components/App.vue',
                            'src/services/api.js',
                            'src/utils/helpers.js',
                            'src/views/Home.vue'
                        ].slice(0, Math.floor(Math.random() * 3) + 1)
                    });
                }
            }

            resolve(mockCommits);
        }, 800);
    });
}; 