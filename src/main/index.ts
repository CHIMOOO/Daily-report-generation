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
      sandbox: false,
      webSecurity: true,
      contextIsolation: true,
      webviewTag: false,
      nodeIntegration: false,
    }
  })

  // 配置CSP头
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "script-src 'self'; " +
          "style-src 'self' 'unsafe-inline'; " +
          "font-src 'self'; " +
          "img-src 'self' data:; " +
          "connect-src 'self' https://api.deepseek.com https://*.deepseek.com;"
        ]
      }
    })
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

  // 添加API测试连接处理程序
  ipcMain.handle('api:testConnection', async (event, args) => {
    try {
      const { apiKey, apiBaseUrl, model } = args
      
      // 使用Node.js的https模块发起请求
      const https = require('https')
      const url = require('url')
      
      const apiUrl = `${apiBaseUrl}/chat/completions`
      const parsedUrl = url.parse(apiUrl)
      
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        }
      }
      
      return new Promise((resolve) => {
        const req = https.request(options, (res) => {
          let data = ''
          
          res.on('data', (chunk) => {
            data += chunk
          })
          
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({ success: true })
            } else {
              try {
                const parsed = JSON.parse(data)
                resolve({ 
                  success: false, 
                  error: parsed.error?.message || `状态码: ${res.statusCode}` 
                })
              } catch (e: any) {
                resolve({ 
                  success: false, 
                  error: `请求失败，状态码: ${res.statusCode}` 
                })
              }
            }
          })
        })
        
        req.on('error', (error: Error) => {
          resolve({ success: false, error: error.message })
        })
        
        // 写入请求主体
        req.write(JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: '你好' }],
          max_tokens: 5,
        }))
        
        req.end()
      })
    } catch (error: any) {
      return { success: false, error: error.message || '未知错误' }
    }
  })

  // 添加生成日报的API请求处理程序
  ipcMain.handle('api:generateReport', async (event, args) => {
    try {
      const { apiKey, apiBaseUrl, requestBody } = args
      
      // 使用Node.js的https模块发起请求
      const https = require('https')
      const url = require('url')
      
      const apiUrl = `${apiBaseUrl}/chat/completions`
      const parsedUrl = url.parse(apiUrl)
      
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        }
      }
      
      return new Promise((resolve) => {
        const req = https.request(options, (res) => {
          let data = ''
          
          res.on('data', (chunk) => {
            data += chunk
          })
          
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              try {
                const parsedData = JSON.parse(data)
                resolve({ 
                  success: true,
                  content: parsedData.choices[0].message.content
                })
              } catch (e: any) {
                resolve({ 
                  success: false, 
                  error: `解析响应失败: ${e.message}` 
                })
              }
            } else {
              try {
                const parsed = JSON.parse(data)
                resolve({ 
                  success: false, 
                  error: parsed.error?.message || `状态码: ${res.statusCode}` 
                })
              } catch (e: any) {
                resolve({ 
                  success: false, 
                  error: `请求失败，状态码: ${res.statusCode}` 
                })
              }
            }
          })
        })
        
        req.on('error', (error: Error) => {
          resolve({ success: false, error: error.message })
        })
        
        // 写入请求主体
        req.write(JSON.stringify(requestBody))
        
        req.end()
      })
    } catch (error: any) {
      return { success: false, error: error.message || '未知错误' }
    }
  })

  // 添加设置保存处理程序
  ipcMain.handle('settings:save', async (event, settings) => {
    try {
      console.log('收到设置保存请求:', settings)
      
      // 获取用户数据目录
      const userDataPath = app.getPath('userData')
      const settingsPath = join(userDataPath, 'settings.json')
      
      console.log('保存设置到文件:', settingsPath)
      
      // 写入设置到文件
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8')
      
      console.log('设置保存成功')
      return { success: true }
    } catch (error: any) {
      console.error('保存设置失败:', error)
      return { success: false, error: error.message || '未知错误' }
    }
  })

  // 添加设置加载处理程序
  ipcMain.handle('settings:load', async (event) => {
    try {
      // 获取用户数据目录
      const userDataPath = app.getPath('userData')
      const settingsPath = join(userDataPath, 'settings.json')
      
      console.log('从文件加载设置:', settingsPath)
      
      // 检查设置文件是否存在
      if (!fs.existsSync(settingsPath)) {
        console.log('设置文件不存在，返回默认设置')
        return { 
          success: true, 
          settings: {
            DEEPSEEK_API_KEY: '',
            DEEPSEEK_API_BASE_URL: 'https://api.deepseek.com',
            DEEPSEEK_MODEL: 'deepseek-chat'
          } 
        }
      }
      
      // 读取设置文件
      const settingsData = fs.readFileSync(settingsPath, 'utf8')
      const settings = JSON.parse(settingsData)
      
      console.log('设置加载成功:', settings)
      return { success: true, settings }
    } catch (error: any) {
      console.error('加载设置失败:', error)
      return { success: false, error: error.message || '未知错误' }
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
