import {
    defineConfig,
    externalizeDepsPlugin
} from 'electron-vite'
import {
    resolve
} from 'path'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
    main: {
        // 配置主进程
        plugins: [externalizeDepsPlugin()],
        build: {
            rollupOptions: {
                input: {
                    index: resolve(__dirname, 'electron/main/index.js')
                }
            },
            format: 'es'
        }
    },
    preload: {
        // 配置预加载脚本
        plugins: [externalizeDepsPlugin()],
        build: {
            rollupOptions: {
                input: {
                    index: resolve(__dirname, 'electron/preload/index.js')
                }
            },
            format: 'es'
        }
    },
    renderer: {
        // 配置渲染进程
        root: resolve(__dirname, ''),
        plugins: [vue()],
        build: {
            rollupOptions: {
                input: {
                    index: resolve(__dirname, 'index.html')
                }
            }
        }
    }
})