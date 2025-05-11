import { ElectronAPI } from '@electron-toolkit/preload'

interface API {
  send: (channel: string, data?: any) => void
  invoke: (channel: string, data?: any) => Promise<any>
  on: (channel: string, callback: Function) => () => void
  openDirectoryDialog: () => Promise<Electron.OpenDialogReturnValue>
  getGitCommits: (repoPath: string, date: Date) => Promise<any[]>
  getRecentCommits: (repoPath: string, days?: number) => Promise<any[]>
  localStorage: {
    getItem: (key: string) => string | null
    setItem: (key: string, value: string) => void
    removeItem: (key: string) => void
    clear: () => void
    getAllItems: () => Record<string, string>
  }
}

declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        send(channel: string, ...args: any[]): void
        on(channel: string, func: (...args: any[]) => void): (() => void) | undefined
        invoke(channel: string, ...args: any[]): Promise<any>
      }
    }
    api: API
    message?: any
  }
}

export interface IpcRendererAPI {
  send: (channel: string, ...args: any[]) => void
  on: (channel: string, listener: (...args: any[]) => void) => void
  invoke: (channel: string, ...args: any[]) => Promise<any>
}

export interface ElectronWindow {
  electron: {
    ipcRenderer: IpcRendererAPI
  }
}
