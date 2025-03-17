# AI 简历个人简介优化

## 项目介绍
这是一个使用 AI 技术优化简历个人简介的工具。它可以帮助求职者提升简历的吸引力，使其更符合招聘方需求。

## 功能特点
- 用户可输入个人简介（最多1000字）
- 可选择目标岗位进行针对性优化
- AI 自动增强行业关键术语，提高 ATS 通过率
- 自动建议量化成就表达
- 生成多个优化版本供选择

## 技术栈
- 前端：React
- 后端：Node.js + Express
- AI API：Deepseek API

## 安装与使用

### 环境要求
- Node.js 14.x 或更高版本
- npm 或 yarn

### 安装步骤
1. 克隆代码库
   ```
   git clone https://github.com/yourusername/resume-optimizer.git
   cd resume-optimizer
   ```

2. 安装依赖
   ```
   npm install
   ```

3. 配置环境变量
   - 在项目根目录创建 `.env` 文件
   - 添加 Deepseek API 密钥:
     ```
     DEEPSEEK_API_KEY=your_deepseek_api_key_here
     PORT=3000
     ```

4. 构建 React 应用
   ```
   npm run build
   ```

5. 启动服务器
   ```
   npm start
   ```

6. 访问应用
   在浏览器中访问 http://localhost:3000

### 开发模式
同时运行前端和后端服务器：
```
npm run dev
```

## 使用方法
1. 在输入框中粘贴您的简历个人简介
2. 可选择输入目标岗位名称（如：Web3开发、产品经理等）
3. 点击"优化个人简介"按钮
4. 查看生成的多个优化版本，并选择最合适的一个
5. 点击"复制此版本"按钮复制到剪贴板 