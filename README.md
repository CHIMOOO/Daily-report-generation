# 日报助手

基于Vue 3和Ant Design X Vue的日报生成工具，通过DeepSeek API自动生成日报内容。

## 主要功能

- 🗓️ 基于Git提交记录生成日报
- 📅 支持自定义日期生成历史日报
- 🤖 支持通过DeepSeek API生成智能内容
- 🔧 简洁直观的用户界面

## 技术栈

- Vue 3 + Composition API (使用setup语法)
- Ant Design Vue 4 - UI组件库
- Ant Design X Vue - AI组件库
- Tailwind CSS 4 - 样式系统
- Vite - 开发和构建工具

## 快速开始

### 安装依赖

```sh
pnpm install
```

### 开发环境运行

```sh
pnpm dev
```

### 构建生产版本

```sh
pnpm build
```

## 使用指南

1. 首次使用需在设置中配置DeepSeek API密钥
2. 选择包含Git仓库的代码目录
3. 选择是使用当天日期还是自定义日期
4. 点击"生成日报"按钮
5. 生成的日报将显示在对话区域
6. 可以在输入框中添加自定义指令，如"添加我今天参加了团队会议"

## 注意事项

- 本应用当前是前端应用，无法直接读取本地Git仓库
- 实际部署时，需要添加后端服务或使用Electron等技术读取本地Git仓库
- 确保DeepSeek API密钥配置正确

## 许可证

MIT
