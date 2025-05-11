import './assets/main.css'
import './assets/tailwind.css'

import { createApp } from 'vue'
import App from './App.vue'

import Antd from 'ant-design-vue'
import { message } from 'ant-design-vue'
import 'ant-design-vue/dist/antd.css'

// 导入dayjs并配置中文
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
dayjs.locale('zh-cn')

// 导入所有图标组件
import * as Icons from '@ant-design/icons-vue'

const app = createApp(App)

app.use(Antd)

// 注册所有图标组件
for (const i in Icons) {
  app.component(i, Icons[i])
}

// 全局挂载message
app.config.globalProperties.$message = message

app.mount('#app')
