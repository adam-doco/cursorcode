const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');
const multer = require('multer');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const fs = require('fs').promises;
const PDFParser = require('pdf2json');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + encodeURIComponent(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'));
    }
  }
});

// 中间件
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'build')));
app.use('/uploads', express.static('uploads'));

// 确保上传目录存在
const uploadDir = path.join(__dirname, 'uploads');
fs.mkdir(uploadDir, { recursive: true }).catch(console.error);

// OpenAI API 调用函数 (备选方案)
async function callOpenAIAPI(originalText, jobTitle) {
  const apiUrl = 'https://api.openai.com/v1/chat/completions';
  const apiKey = process.env.OPENAI_API_KEY || 'demo';
  
  // 构建 prompt
  let prompt = '';
  if (jobTitle && jobTitle.trim().length > 0) {
    prompt = `作为一位专业的人力资源专家和求职顾问，请优化以下简历个人简介，使其更适合申请${jobTitle}岗位。请给出3个不同风格的优化版本。每个版本控制在300字以内，并确保：
    1. 突出与${jobTitle}岗位相关的关键能力和经验
    2. 使用更专业的表达和行业术语
    3. 增加量化成果
    4. 提高表达的精准性和可信度
    
    请直接给出3个优化后的版本，每个版本之间用"===版本分隔==="隔开。
    
    原始个人简介：
    "${originalText}"
    `;
  } else {
    prompt = `作为一位专业的人力资源专家和求职顾问，请优化以下简历个人简介，使其更专业、更有吸引力。请给出3个不同风格的优化版本。每个版本控制在300字以内，并确保：
    1. 突出关键能力和经验
    2. 使用更专业的表达和行业术语
    3. 增加量化成果
    4. 提高表达的精准性和可信度
    
    请直接给出3个优化后的版本，每个版本之间用"===版本分隔==="隔开。
    
    原始个人简介：
    "${originalText}"
    `;
  }
  
  try {
    const response = await axios({
      method: 'post',
      url: apiUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      data: {
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
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
    console.error('OpenAI API 调用错误:', error.message);
    throw new Error('AI 服务暂时不可用，请稍后再试');
  }
}

// 使用 Deepseek API 调用函数
async function callDeepseekAPI(originalText, jobTitle) {
  const apiUrl = 'https://api.deepseek.com/v1/chat/completions';
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey || apiKey.trim().length === 0) {
    console.error('Deepseek API 密钥未配置');
    throw new Error('服务配置错误，请联系管理员');
  }
  
  // 清理 API 密钥，确保没有引号、空格或特殊字符
  const cleanApiKey = apiKey.toString().trim().replace(/['"]/g, '');
  
  // 构建 prompt
  let prompt = '';
  if (jobTitle && jobTitle.trim().length > 0) {
    prompt = `作为一位专业的人力资源专家和求职顾问，请优化以下简历个人简介，使其更适合申请${jobTitle}岗位。请给出3个不同风格的优化版本。每个版本控制在300字以内，并确保：
    1. 突出与${jobTitle}岗位相关的关键能力和经验
    2. 使用更专业的表达和行业术语
    3. 增加量化成果
    4. 提高表达的精准性和可信度
    
    请直接给出3个优化后的版本，每个版本之间用"===版本分隔==="隔开。
    
    原始个人简介：
    "${originalText}"
    `;
  } else {
    prompt = `作为一位专业的人力资源专家和求职顾问，请优化以下简历个人简介，使其更专业、更有吸引力。请给出3个不同风格的优化版本。每个版本控制在300字以内，并确保：
    1. 突出关键能力和经验
    2. 使用更专业的表达和行业术语
    3. 增加量化成果
    4. 提高表达的精准性和可信度
    
    请直接给出3个优化后的版本，每个版本之间用"===版本分隔==="隔开。
    
    原始个人简介：
    "${originalText}"
    `;
  }
  
  try {
    console.log('准备发送请求到 Deepseek API...');
    const response = await axios({
      method: 'post',
      url: apiUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cleanApiKey}`
      },
      data: {
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 2000
      }
    });
    
    console.log('Deepseek API 响应成功');
    const content = response.data.choices[0].message.content;
    const versions = content.split('===版本分隔===')
      .map(v => v.trim())
      .filter(v => v.length > 0);
      
    return versions;
  } catch (error) {
    console.error('Deepseek API 调用错误:', error.response?.data?.error?.message || error.message);
    // 当Deepseek API失败时，尝试使用OpenAI API
    console.log('尝试使用备选API...');
    return await callOpenAIAPI(originalText, jobTitle);
  }
}

// 使用 pdf2json 解析 PDF
function parsePDFWithPDF2JSON(filePath) {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();
    
    pdfParser.on('pdfParser_dataReady', (pdfData) => {
      try {
        let text = '';
        pdfData.Pages.forEach(page => {
          page.Texts.forEach(textObj => {
            text += decodeURIComponent(textObj.R[0].T) + ' ';
          });
          text += '\n';
        });
        resolve(text.trim());
      } catch (error) {
        reject(error);
      }
    });

    pdfParser.on('pdfParser_dataError', (error) => {
      reject(error);
    });

    fs.readFile(filePath)
      .then(data => {
        pdfParser.parseBuffer(data);
      })
      .catch(error => {
        reject(error);
      });
  });
}

// 使用 Deepseek 多模态API进行PDF文字识别
async function extractTextWithDeepseekOCR(filePath) {
  try {
    console.log('开始处理文件进行文字识别...');
    
    // 检查文件是否存在和大小
    const fileStats = await fs.stat(filePath);
    console.log('文件大小:', fileStats.size, '字节');
    
    // 检查文件类型
    if (filePath.endsWith('.pdf')) {
      // PDF文件处理
      try {
        // 首先尝试常规方式提取文本
        const dataBuffer = await fs.readFile(filePath);
        
        // 只读取前1MB的内容，避免处理过大的文件
        const maxSize = 1024 * 1024; // 1MB
        const bufferToProcess = dataBuffer.length > maxSize ? 
                               dataBuffer.slice(0, maxSize) : 
                               dataBuffer;
        
        try {
          const data = await pdf(bufferToProcess);
          if (data.text && data.text.length > 30) {
            console.log('成功从PDF直接提取文本，文本长度:', data.text.length);
            return data.text;
          }
        } catch (err) {
          console.log('PDF直接提取失败:', err.message);
        }
        
        // 如果直接提取失败，使用纯文本API发送建议
        console.log('使用纯文本API发送建议...');
        const apiUrl = 'https://api.deepseek.com/v1/chat/completions';
        const apiKey = process.env.DEEPSEEK_API_KEY;
        
        if (!apiKey) {
          console.error('API密钥未配置');
          return "系统配置错误，请使用文本输入方式";
        }
        
        // 清理API密钥，特别是移除所有引号
        const cleanApiKey = apiKey.toString().trim().replace(/['"]/g, '');
        
        // 发送纯文本请求
        const response = await axios({
          method: 'post',
          url: apiUrl,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cleanApiKey}`
          },
          data: {
            model: "deepseek-chat",
            messages: [
              {
                role: "user", 
                content: "无法读取PDF内容，请告诉用户使用文本输入方式直接粘贴简历内容，这是最可靠的方法。"
              }
            ],
            max_tokens: 1000
          }
        });
        
        const assistantMessage = response.data.choices[0].message.content;
        return "系统无法自动解析您的PDF文件，请使用\"直接输入文本\"功能手动粘贴简历内容。这是最可靠的方式，特别是对中文简历。\n\n" + assistantMessage;
      } catch (error) {
        console.error('PDF处理出错:', error);
        if (error.response) {
          console.error('错误状态码:', error.response.status);
          console.error('错误详情:', error.response.data);
        }
        return "PDF文件无法处理，请使用\"直接输入文本\"功能手动粘贴简历内容。";
      }
    } 
    // 处理图片文件
    else if (filePath.endsWith('.png') || filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      try {
        const imageBuffer = await fs.readFile(filePath);
        
        // 限制图片大小
        if (imageBuffer.length > 500 * 1024) { // 500KB限制
          console.log('图片文件太大，建议直接使用文本输入');
          return "图片文件太大，无法自动识别。请使用\"直接输入文本\"功能手动粘贴简历内容。";
        }
        
        const base64Image = imageBuffer.toString('base64');
        const mimeType = filePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
        
        // 使用Deepseek Vision API处理图片
        const apiUrl = 'https://api.deepseek.com/v1/chat/completions';
        const apiKey = process.env.DEEPSEEK_API_KEY;
        
        if (!apiKey) {
          return "API密钥未配置，请使用文本输入方式";
        }
        
        // 清理API密钥，特别是移除所有引号
        const cleanApiKey = apiKey.toString().trim().replace(/['"]/g, '');
        
        // 准备Vision API请求
        const response = await axios({
          method: 'post',
          url: apiUrl,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cleanApiKey}`
          },
          data: {
            model: "deepseek-vision",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: "提取这张图片中的所有文字内容" },
                  { 
                    type: "image_url", 
                    image_url: { url: `data:${mimeType};base64,${base64Image}` } 
                  }
                ]
              }
            ],
            max_tokens: 1000
          }
        });
        
        const extractedText = response.data.choices[0].message.content;
        console.log('图片OCR识别成功，文本长度:', extractedText.length);
        
        return extractedText || "无法从图片中提取文字，请使用文本输入方式";
      } catch (error) {
        console.error('图片处理出错:', error);
        if (error.response) {
          console.error('错误状态码:', error.response.status);
          console.error('错误详情:', error.response.data);
        }
        return "图片识别失败，请使用\"直接输入文本\"功能手动粘贴简历内容。";
      }
    } else {
      return "不支持的文件类型，请使用文本输入方式或上传PDF、PNG、JPG格式文件";
    }
  } catch (error) {
    console.error('文件处理错误:', error);
    return "文件处理失败，请使用\"直接输入文本\"功能手动粘贴简历内容。";
  }
}

// 简历评估函数
async function evaluateResume(resumeText) {
  const apiUrl = 'https://api.deepseek.com/v1/chat/completions';
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    console.error('Deepseek API 密钥未配置');
    throw new Error('Deepseek API 密钥未配置');
  }
  
  // 清理 API 密钥，确保没有引号、空格或特殊字符
  const cleanApiKey = apiKey.toString().trim().replace(/['"]/g, '');
  console.log('API 密钥长度:', cleanApiKey.length);
  
  const prompt = `作为简历评估专家，请针对以下简历进行专业评估。评估要点：
  1. 整体结构和格式
  2. 内容质量和表达
  3. 关键成就和技能突出
  4. 可量化的结果展示
  5. ATS 友好度
  
  请提供详细的优缺点分析和具体改进建议。

  简历内容：
  "${resumeText}"
  `;
  
  try {
    console.log('准备发送请求到 Deepseek API...');
    const response = await axios({
      method: 'post',
      url: apiUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cleanApiKey}`
      },
      data: {
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 2000
      }
    });
    
    console.log('Deepseek API 响应成功');
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Deepseek API 调用错误:', error.response?.data?.error?.message || error.message);
    console.error('错误详情:', error.stack);
    
    // 如果 Deepseek API 失败，尝试使用 OpenAI API
    console.log('尝试使用 OpenAI API 作为备选...');
    try {
      const openAIResponse = await callOpenAIAPI(resumeText);
      return `[使用备选 API 生成的评估结果]\n\n${openAIResponse}`;
    } catch (openAIError) {
      console.error('OpenAI API 也失败了:', openAIError);
      throw new Error('AI 评分服务暂时不可用，请稍后再试');
    }
  }
}

// AI 简历优化函数
async function optimizeResume(resumeText) {
  const apiUrl = 'https://api.deepseek.com/v1/chat/completions';
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    console.error('Deepseek API 密钥未配置');
    throw new Error('Deepseek API 密钥未配置');
  }
  
  // 清理 API 密钥，确保没有引号、空格或特殊字符
  const cleanApiKey = apiKey.toString().trim().replace(/['"]/g, '');
  console.log('API 密钥长度:', cleanApiKey.length);
  
  const prompt = `作为一位专业的 Web3 简历优化专家，请对以下简历进行优化。优化要求：
  1. 调整措辞，使其更专业、精准
  2. 优化结构，突出核心优势
  3. 加入 Web3 行业关键词（如 DeFi、智能合约、跨链协议等）
  4. 增加量化数据
  5. 提高 ATS 系统通过率

  请直接提供优化后的完整简历内容，不要添加任何解释。

  原始简历：
  "${resumeText}"
  `;
  
  try {
    console.log('准备发送请求到 Deepseek API...');
    const response = await axios({
      method: 'post',
      url: apiUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cleanApiKey}`
      },
      data: {
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 2000
      }
    });
    
    console.log('Deepseek API 响应成功');
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Deepseek API 调用错误:', error.response?.data?.error?.message || error.message);
    console.error('错误详情:', error.stack);
    
    // 如果 Deepseek API 失败，尝试使用 OpenAI API
    console.log('尝试使用 OpenAI API 作为备选...');
    try {
      const openAIResponse = await callOpenAIAPI(resumeText);
      return `[使用备选 API 优化的简历]\n\n${openAIResponse}`;
    } catch (openAIError) {
      console.error('OpenAI API 也失败了:', openAIError);
      throw new Error('AI 优化服务暂时不可用，请稍后再试');
    }
  }
}

// 修改简历解析函数，添加Deepseek OCR作为备选方案
async function parseResume(filePath, fileType) {
  try {
    console.log('开始解析文件:', filePath);
    console.log('文件类型:', fileType);
    
    let text = '';
    if (fileType === 'application/pdf') {
      console.log('解析PDF文件...');
      const dataBuffer = await fs.readFile(filePath);
      console.log('PDF文件大小:', dataBuffer.length);
      
      try {
        // 首先尝试使用 pdf-parse
        const data = await pdf(dataBuffer);
        text = data.text;
        console.log('PDF解析完成，文本长度:', text.length);
        console.log('PDF解析信息:', {
          numpages: data.numpages,
          info: data.info,
          metadata: data.metadata
        });
        
        // 如果解析出的文本太短，尝试使用 pdf2json
        if (text.length < 10) {
          console.log('PDF解析结果文本过短，尝试使用 pdf2json...');
          text = await parsePDFWithPDF2JSON(filePath);
          console.log('pdf2json 解析完成，文本长度:', text.length);
          
          // 如果pdf2json也失败，尝试使用 Deepseek OCR
          if (text.length < 10) {
            console.log('pdf2json 解析结果文本过短，尝试使用 Deepseek OCR...');
            text = await extractTextWithDeepseekOCR(filePath);
            console.log('Deepseek OCR 解析完成，文本长度:', text.length);
          }
        }
      } catch (pdfError) {
        console.error('PDF解析错误:', pdfError);
        // 尝试使用 pdf2json 作为备选方案
        console.log('尝试使用 pdf2json 作为备选解析方法...');
        try {
          text = await parsePDFWithPDF2JSON(filePath);
          console.log('pdf2json 解析完成，文本长度:', text.length);
          
          // 如果pdf2json也失败，尝试使用 Deepseek OCR
          if (text.length < 10) {
            console.log('pdf2json 解析结果文本过短，尝试使用 Deepseek OCR...');
            text = await extractTextWithDeepseekOCR(filePath);
            console.log('Deepseek OCR 解析完成，文本长度:', text.length);
          }
        } catch (pdf2jsonError) {
          console.error('pdf2json 解析错误:', pdf2jsonError);
          
          // 最后尝试 Deepseek OCR
          console.log('尝试使用 Deepseek OCR 作为最后的解析方法...');
          text = await extractTextWithDeepseekOCR(filePath);
          console.log('Deepseek OCR 解析完成，文本长度:', text.length);
        }
      }
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      console.log('解析DOCX文件...');
      const result = await mammoth.extractRawText({ path: filePath });
      text = result.value;
      console.log('DOCX解析完成，文本长度:', text.length);
    } else if (fileType === 'image/jpeg' || fileType === 'image/png' || fileType === 'image/jpg') {
      // 如果上传的是图片文件，直接使用Deepseek OCR
      console.log('解析图片文件...');
      text = await extractTextWithDeepseekOCR(filePath);
      console.log('图片OCR解析完成，文本长度:', text.length);
    } else {
      console.log('解析文本文件...');
      text = await fs.readFile(filePath, 'utf8');
      console.log('文本文件解析完成，文本长度:', text.length);
    }
    
    if (!text || text.length < 10) {
      // 详细的错误信息，提示用户使用文本输入
      throw new Error('简历内容为空或无法识别，可能是因为您上传的是图片格式的PDF或扫描件。请使用\"直接输入文本\"功能，手动复制粘贴您的简历内容。');
    }
    
    return text;
  } catch (error) {
    console.error('简历解析错误:', error);
    throw new Error('简历解析失败: ' + error.message);
  }
}

// API 路由 - 原始的个人简介优化
app.post('/api/optimize-bio', async (req, res) => {
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

// API 路由 - 简历上传和评分
app.post('/api/upload-resume', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      console.error('没有收到文件');
      return res.status(400).json({ error: '请上传简历文件' });
    }

    console.log('收到文件:', req.file.originalname);
    console.log('文件类型:', req.file.mimetype);
    console.log('文件大小:', req.file.size);

    const resumeText = await parseResume(req.file.path, req.file.mimetype);
    console.log('简历文本长度:', resumeText.length);
    
    const evaluation = await evaluateResume(resumeText);
    
    res.json({ 
      evaluation,
      originalText: resumeText
    });
  } catch (error) {
    console.error('处理简历时出错:', error);
    res.status(500).json({ error: error.message });
  }
});

// API 路由 - 直接提交文本简历内容
app.post('/api/upload-resume-text', async (req, res) => {
  try {
    const { resumeText } = req.body;
    
    if (!resumeText || resumeText.trim().length === 0) {
      return res.status(400).json({ error: '简历内容不能为空' });
    }

    console.log('收到文本简历，长度:', resumeText.length);
    
    const evaluation = await evaluateResume(resumeText);
    
    res.json({ 
      evaluation,
      originalText: resumeText
    });
  } catch (error) {
    console.error('处理简历时出错:', error);
    res.status(500).json({ error: error.message });
  }
});

// API 路由 - 简历优化
app.post('/api/optimize', async (req, res) => {
  try {
    const { resumeText } = req.body;
    
    if (!resumeText) {
      return res.status(400).json({ error: '简历内容不能为空' });
    }
    
    const optimizedResume = await optimizeResume(resumeText);
    res.json({ optimizedResume });
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