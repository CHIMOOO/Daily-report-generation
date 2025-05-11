import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'

// 使用promisify将回调API转换为Promise API
const execAsync = promisify(exec)
const fsAccess = promisify(fs.access)

function createWindow(): void {
  // 创建浏览器窗口.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon: join(__dirname, '../../build/icon.png') } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // 打开开发者工具
  if (is.dev) {
    mainWindow.webContents.openDevTools()
  }
}

// 当Electron完成初始化并准备创建浏览器窗口时，将调用此方法
app.whenReady().then(() => {
  // 设置应用名称为"日报生成助手"
  app.setName('日报生成助手')

  // 为Windows设置应用ID
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.daily.report.generator')
  }

  // 默认设置
  electronApp.setAppUserModelId('com.electron')

  // 添加IPC处理程序
  registerIpcHandlers()

  // 创建窗口
  createWindow()

  app.on('activate', function () {
    // 在macOS上，当单击dock图标并且没有其他窗口打开时，通常会在应用程序中重新创建一个窗口
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// 在所有窗口关闭时退出，macOS除外
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

/**
 * 注册所有IPC处理程序
 */
function registerIpcHandlers(): void {
  // 打开目录选择对话框
  ipcMain.handle('dialog:openDirectory', async () => {
    return dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: '选择代码库目录'
    })
  })

  // 获取指定日期的Git提交
  ipcMain.handle('git:getCommits', async (_, args) => {
    const { repoPath, date } = args
    
    try {
      // 检查目录是否存在
      await fsAccess(repoPath, fs.constants.R_OK)
      
      // 解析日期
      const targetDate = new Date(date)
      const formattedDate = targetDate.toISOString().split('T')[0]
      
      // 构建Git命令，获取指定日期的提交
      const cmd = `cd "${repoPath}" && git log --after="${formattedDate} 00:00:00" --before="${formattedDate} 23:59:59" --pretty=format:"%H|%an|%ad|%s" --name-only`
      
      const { stdout } = await execAsync(cmd)
      
      // 解析Git提交记录
      return parseGitCommits(stdout)
    } catch (error) {
      console.error('获取Git提交记录失败:', error)
      throw new Error(`无法获取Git提交记录: ${error.message}`)
    }
  })
  
  // 获取最近几天的Git提交
  ipcMain.handle('git:getRecentCommits', async (_, args) => {
    const { repoPath, days = 7 } = args
    
    try {
      // 检查目录是否存在
      await fsAccess(repoPath, fs.constants.R_OK)
      
      // 构建Git命令，获取最近几天的提交
      const cmd = `cd "${repoPath}" && git log --since="${days} days ago" --pretty=format:"%H|%an|%ad|%s" --name-only`
      
      const { stdout } = await execAsync(cmd)
      
      // 解析Git提交记录
      return parseGitCommits(stdout)
    } catch (error) {
      console.error('获取最近Git提交记录失败:', error)
      throw new Error(`无法获取最近Git提交记录: ${error.message}`)
    }
  })
}

/**
 * 解析Git提交记录
 * @param stdout Git命令输出
 * @returns 解析后的提交记录数组
 */
function parseGitCommits(stdout: string): any[] {
  const commits: any[] = []
  
  if (!stdout.trim()) {
    return commits
  }
  
  // 按提交分割
  const commitBlocks = stdout.split('\n\n')
  
  for (const block of commitBlocks) {
    const lines = block.split('\n')
    
    if (lines.length === 0) continue
    
    // 第一行包含提交信息
    const [hash, author, date, message] = lines[0].split('|')
    
    // 剩余行为文件列表
    const files = lines.slice(1).filter(line => line.trim() !== '')
    
    commits.push({
      hash,
      author,
      date,
      message,
      files
    })
  }
  
  return commits
}
