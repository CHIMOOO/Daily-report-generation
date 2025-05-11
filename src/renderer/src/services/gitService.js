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
 * 获取指定日期的详细Git提交信息（包含文件变更详情）
 * 
 * @param {string} repoPath 仓库路径
 * @param {Date} date 日期对象
 * @returns {Promise<Array>} 包含详细信息的提交记录数组
 */
export const getDetailedCommitsForDate = async (repoPath, date) => {
    console.log(`[Git服务] 获取 ${repoPath} 在 ${date} 的详细提交记录`);
    
    try {
        // 检查路径是否存在
        if (!repoPath) {
            throw new Error('代码库路径不能为空');
        }
        
        // 检测是否在Windows环境
        const isWindows = navigator.platform.indexOf('Win') > -1;
        console.log(`[Git服务] 当前操作系统环境: ${isWindows ? 'Windows' : 'Non-Windows'}`);
        
        // 首先尝试直接使用window.api特定方法（优先）
        if (window.api && window.api.getDetailedGitCommits) {
            try {
                console.log('[Git服务] 尝试使用window.api.getDetailedGitCommits获取提交记录');
                const commits = await window.api.getDetailedGitCommits(repoPath, date);
                console.log(`[Git服务] 成功获取 ${commits.length} 条详细提交记录`);
                return commits;
            } catch (apiError) {
                console.error('[Git服务] API调用失败，尝试ipcRenderer:', apiError);
                // API调用失败，尝试直接使用ipcRenderer
                if (!window.electron) {
                    throw apiError;
                }
            }
        }
        
        // 其次尝试使用Electron的ipcRenderer
        if (window.electron) {
            try {
                console.log('[Git服务] 尝试使用window.electron.ipcRenderer获取提交记录');
                
                // 格式化日期为ISO字符串
                const isoDate = typeof date.toISOString === 'function' ? 
                    date.toISOString() : new Date(date).toISOString();
                
                console.log(`[Git服务] 发送请求参数: { repoPath: "${repoPath}", date: "${isoDate}" }`);
                
                const commits = await window.electron.ipcRenderer.invoke('git:getDetailedCommits', {
                    repoPath,
                    date: isoDate
                });
                
                console.log(`[Git服务] 成功获取 ${commits.length} 条详细提交记录`);
                return commits;
            } catch (ipcError) {
                console.error('[Git服务] IPC调用失败:', ipcError);
                
                // 尝试重新启动应用程序的建议
                console.error('[Git服务] 建议：请尝试重新启动应用程序，以应用最新的代码修改');
                
                // 不再回退到模拟数据，而是直接抛出错误
                throw new Error(`获取Git详细提交记录失败: ${ipcError.message || '未知错误'}`);
            }
        } else {
            // 在非Electron环境中抛出错误
            throw new Error('当前环境不支持获取Git提交记录，请在Electron环境中运行');
        }
    } catch (error) {
        console.error('[Git服务] 获取详细Git提交记录失败:', error);
        throw new Error(`无法获取详细Git提交记录: ${error.message || '未知错误'}`);
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
 * 获取模拟的详细Git提交数据
 * @param {string} repoPath 仓库路径
 * @param {Date} date 日期对象
 * @returns {Promise<Array>} 详细提交信息数组
 */
const getMockDetailedCommits = async (repoPath, date) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const formattedDate = date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

            const mockDetailedCommits = [{
                    hash: 'a1b2c3d4e5f6g7h8i9j0',
                    author: '张三',
                    date: formattedDate,
                    message: 'feat: 实现用户登录功能',
                    files: ['src/components/Login.vue', 'src/services/auth.js'],
                    diffStat: `src/components/Login.vue | 35 +++++++++++++++++++++++++++++------
src/services/auth.js   | 28 ++++++++++++++++++++++++++++
2 files changed, 57 insertions(+), 6 deletions(-)`,
                    fileChanges: [
                        {
                            file: 'src/components/Login.vue',
                            changes: `+import { ref, reactive } from 'vue';
+import { useAuth } from '../services/auth';
-import { useState } from 'react';
+const { login, isAuthenticated } = useAuth();
+const credentials = reactive({
+  username: '',
+  password: ''
+});`
                        },
                        {
                            file: 'src/services/auth.js',
                            changes: `+export const useAuth = () => {
+  const isAuthenticated = ref(false);
+  
+  const login = async (credentials) => {
+    // 用户认证逻辑
+    isAuthenticated.value = true;
+    return true;
+  };
+  
+  return { login, isAuthenticated };
+};`
                        }
                    ]
                },
                {
                    hash: 'b2c3d4e5f6g7h8i9j0k1',
                    author: '张三',
                    date: formattedDate,
                    message: 'fix: 修复表单验证问题',
                    files: ['src/utils/validators.js'],
                    diffStat: `src/utils/validators.js | 12 ++++++------
1 file changed, 6 insertions(+), 6 deletions(-)`,
                    fileChanges: [
                        {
                            file: 'src/utils/validators.js',
                            changes: `-export const validateEmail = (email) => /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email);
+export const validateEmail = (email) => {
+  if (!email) return false;
+  return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email.trim());
+};`
                        }
                    ]
                }
            ];

            resolve(mockDetailedCommits);
        }, 800);
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