import { ElectronAPI } from '@electron-toolkit/preload'

interface API {
  send: (channel: string, data?: any) => void
  invoke: (channel: string, data?: any) => Promise<any>
  on: (channel: string, callback: Function) => () => void
  openDirectoryDialog: () => Promise<Electron.OpenDialogReturnValue>
  getGitCommits: (repoPath: string, date: Date) => Promise<any[]>
  getRecentCommits: (repoPath: string, days?: number) => Promise<any[]>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
    ipcRenderer: Electron.IpcRenderer
    message: any
  }
}
