import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// 自定义API注入到渲染进程
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
  }
}

// 使用contextBridge将自定义API暴露给渲染进程
contextBridge.exposeInMainWorld('electron', electronAPI)
contextBridge.exposeInMainWorld('api', api)

// 也可以直接暴露ipcRenderer给渲染进程
contextBridge.exposeInMainWorld('ipcRenderer', ipcRenderer)
