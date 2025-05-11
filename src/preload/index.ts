import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// 自定义API，根据实际需求补充
const api = {
  // 发送消息到主进程
  send: (channel: string, data?: any) => {
    ipcRenderer.send(channel, data)
  },
  
  // 调用主进程方法并获取结果（Promise）
  invoke: (channel: string, data?: any) => {
    return ipcRenderer.invoke(channel, data)
  },
  
  // 接收来自主进程的消息
  on: (channel: string, callback: Function) => {
    ipcRenderer.on(channel, (_, data) => callback(data))
    return () => {
      ipcRenderer.removeAllListeners(channel)
    }
  },
  
  // 打开目录选择对话框
  openDirectoryDialog: () => {
    return ipcRenderer.invoke('dialog:openDirectory')
  },
  
  // 获取指定日期的Git提交记录
  getGitCommits: (repoPath: string, date: Date) => {
    return ipcRenderer.invoke('git:getCommits', { repoPath, date: date.toISOString() })
  },
  
  // 获取最近几天的Git提交记录
  getRecentCommits: (repoPath: string, days: number = 7) => {
    return ipcRenderer.invoke('git:getRecentCommits', { repoPath, days })
  },
  
  // 获取指定日期的详细Git提交记录（包含文件变更内容）
  getDetailedGitCommits: (repoPath: string, date: Date) => {
    return ipcRenderer.invoke('git:getDetailedCommits', { repoPath, date: date.toISOString() })
  },
  
  // 直接操作localStorage的方法，确保在Electron中正确工作
  localStorage: {
    getItem: (key: string) => {
      return localStorage.getItem(key)
    },
    setItem: (key: string, value: string) => {
      localStorage.setItem(key, value)
    },
    removeItem: (key: string) => {
      localStorage.removeItem(key)
    },
    clear: () => {
      localStorage.clear()
    },
    getAllItems: () => {
      const items: Record<string, string> = {}
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) {
          items[key] = localStorage.getItem(key) || ''
        }
      }
      return items
    }
  }
}

// 使用contextBridge将自定义API暴露给渲染进程
if (process.contextIsolated) {
  try {
    // 暴露Electron的API给渲染进程
    contextBridge.exposeInMainWorld('electron', {
      ...electronAPI, // 包含基础Electron API
      ipcRenderer: {
        send(channel: string, ...args: unknown[]) {
          const validChannels = ['open-win', 'app:exit', 'app:minimize', 'app:maximize', 'app:quit']
          if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, ...args)
          }
        },
        on(channel: string, func: (...args: unknown[]) => void) {
          const validChannels = ['main-process-message']
          if (validChannels.includes(channel)) {
            // 去除IPC事件监听器以避免内存泄漏
            const subscription = (_event: Electron.IpcRendererEvent, ...args: unknown[]) =>
              func(...args)
            ipcRenderer.on(channel, subscription)

            return () => {
              ipcRenderer.removeListener(channel, subscription)
            }
          }

          return undefined
        },
        invoke(channel: string, ...args: unknown[]) {
          // 扩充允许的渠道列表
          const validChannels = [
            'dialog:openDirectory', 
            'api:testConnection',
            'api:generateReport',
            'settings:save',
            'settings:load',
            'git:getCommits',
            'git:getRecentCommits',
            'git:getDetailedCommits'
          ]
          if (validChannels.includes(channel)) {
            return ipcRenderer.invoke(channel, ...args)
          }
          
          return Promise.reject(new Error(`不支持的IPC通道: ${channel}`))
        }
      }
    })

    // 暴露自定义API
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (在dts文件中定义)
  window.electron = electronAPI
  // @ts-ignore (在dts文件中定义)
  window.api = api
}
