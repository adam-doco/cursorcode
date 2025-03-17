const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'build')));

// OpenAI API 调用函数 (备选方案)
async function callOpenAIAPI(originalText, jobTitle) {
  const apiUrl = 'https://api.openai.com/v1/chat/completions';
  const apiKey = process.env.OPENAI_API_KEY || 'demo'; // 如果需要使用，请在.env中设置OPENAI_API_KEY
  
  // 在生产环境中需要确保API KEY已配置
  if (apiKey === 'demo') {
    console.warn('OpenAI API密钥未配置，使用演示模式');
    // 返回演示数据以便前端展示
    return [
      "我是一名拥有5年软件开发经验的全栈工程师，专注于Web应用开发。精通React和Node.js，参与过多个大型企业级应用的设计与实现，显著提升了30%的用户体验满意度。具备出色的问题解决能力，曾成功将系统响应时间减少40%。追求代码质量和性能优化，热衷于学习新技术和最佳实践。",
      "作为一名经验丰富的全栈开发者，我在Web应用构建领域积累了5年专业经验。技术栈覆盖React、Node.js等前沿框架，曾主导多个企业级项目从构思到上线的全流程，实现用户满意度提升30%的显著成果。以系统性思维解决复杂技术难题，成功优化系统性能并将响应时间缩短40%。注重编写高质量、可维护的代码，并持续追踪行业发展趋势，保持技术竞争力。",
      "技术驱动的全栈工程师，拥有5年Web开发专业经验，精通React与Node.js生态系统。在企业级应用开发中展现出色领导力，成功交付多个高质量项目并提升用户满意度30%。以数据驱动的方法优化应用性能，实现系统响应时间降低40%的关键指标。坚持编码最佳实践，确保产品质量与可扩展性，同时保持持续学习以掌握前沿技术发展。"
    ];
  }
  
  let prompt = `你是一位专业的简历优化顾问，专注于帮助求职者改进他们的个人简介部分。请为以下个人简介创建 3 个优化版本，确保每个版本都：
  1. 使用更专业、流畅且吸引人的表述
  2. 增强行业关键术语，提高 ATS 系统通过率
  3. 尽可能量化成就（例如，增加百分比或具体数字）
  4. 保持原文的基本信息和事实
  
  原始个人简介:
  "${originalText}"
  `;
  
  if (jobTitle) {
    prompt += `\n目标岗位: "${jobTitle}"
    请确保优化版本与该目标岗位相匹配，使用相关领域的术语和强调与该职位相关的技能与经验。`;
  }
  
  prompt += `\n请直接提供 3 个优化版本，不要添加任何额外解释。每个版本之间用 "===版本分隔===" 分隔。`;
  
  try {
    const response = await axios({
      method: 'post',
      url: apiUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey.trim()
      },
      data: {
        model: "gpt-3.5-turbo",
        messages: [
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      }
    });
    
    const content = response.data.choices[0].message.content;
    const versions = content.split('===版本分隔===')
      .map(v => v.trim())
      .filter(v => v.length > 0);
      
    return versions;
  } catch (error) {
    console.error('OpenAI API 调用错误:', error.response?.data || error.message);
    throw new Error('AI 优化服务暂时不可用，请稍后再试');
  }
}

// Deepseek API 调用函数
async function callDeepseekAPI(originalText, jobTitle) {
  const apiUrl = 'https://api.deepseek.com/v1/chat/completions';
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    throw new Error('Deepseek API 密钥未配置');
  }
  
  // 清理API密钥，确保它是安全的
  const cleanApiKey = apiKey.toString().trim();
  
  let prompt = `你是一位专业的简历优化顾问，专注于帮助求职者改进他们的个人简介部分。请为以下个人简介创建 3 个优化版本，确保每个版本都：
  1. 使用更专业、流畅且吸引人的表述
  2. 增强行业关键术语，提高 ATS 系统通过率
  3. 尽可能量化成就（例如，增加百分比或具体数字）
  4. 保持原文的基本信息和事实
  
  原始个人简介:
  "${originalText}"
  `;
  
  if (jobTitle) {
    prompt += `\n目标岗位: "${jobTitle}"
    请确保优化版本与该目标岗位相匹配，使用相关领域的术语和强调与该职位相关的技能与经验。`;
  }
  
  prompt += `\n请直接提供 3 个优化版本，不要添加任何额外解释。每个版本之间用 "===版本分隔===" 分隔。`;
  
  try {
    // 使用更保守的方式设置请求体和请求头
    const requestOptions = {
      method: 'post',
      url: apiUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        model: "deepseek-chat",
        messages: [
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      }
    };
    
    // 手动添加 Authorization 头
    requestOptions.headers.Authorization = 'Bearer ' + cleanApiKey;
    
    const response = await axios(requestOptions);
    
    const content = response.data.choices[0].message.content;
    const versions = content.split('===版本分隔===')
      .map(v => v.trim())
      .filter(v => v.length > 0);
      
    return versions;
  } catch (error) {
    console.error('Deepseek API 调用错误:', error.response?.data || error.message);
    // 当Deepseek API失败时，尝试使用OpenAI API
    console.log('尝试使用备选API...');
    return await callOpenAIAPI(originalText, jobTitle);
  }
}

// API 路由
app.post('/api/optimize', async (req, res) => {
  try {
    const { originalText, jobTitle } = req.body;
    
    if (!originalText || originalText.length > 1000) {
      return res.status(400).json({ error: '个人简介不能为空且不能超过1000字' });
    }
    
    const optimizedVersions = await callDeepseekAPI(originalText, jobTitle);
    
    res.json({ optimizedVersions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 确保所有路由都返回 React 应用
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
}); 