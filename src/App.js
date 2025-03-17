import React, { useState, useRef } from 'react';
import axios from 'axios';
import './App.css';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

function App() {
  const [activeTab, setActiveTab] = useState('bio'); // 'bio' 或 'resume'
  
  // 个人简介优化部分的状态
  const [originalText, setOriginalText] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [optimizedVersions, setOptimizedVersions] = useState([]);
  const [bioLoading, setBioLoading] = useState(false);
  const [bioError, setBioError] = useState('');
  
  // 简历优化部分的状态
  const [file, setFile] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [optimizedResume, setOptimizedResume] = useState(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState(null);
  const [resumeInputMode, setResumeInputMode] = useState('text'); // 默认为文本输入方式
  const [resumeTextInput, setResumeTextInput] = useState('');
  const resumePdfRef = useRef(null);

  // 个人简介优化函数
  const handleBioSubmit = async (e) => {
    e.preventDefault();
    
    if (!originalText.trim()) {
      setBioError('请输入您的个人简介');
      return;
    }

    if (originalText.length > 1000) {
      setBioError('个人简介不能超过1000字');
      return;
    }
    
    setBioLoading(true);
    setBioError('');

    try {
      const response = await axios.post('/api/optimize-bio', {
        originalText,
        jobTitle
      });
      
      setOptimizedVersions(response.data.optimizedVersions);
    } catch (err) {
      setBioError(err.response?.data?.error || '发生错误，请重试');
    } finally {
      setBioLoading(false);
    }
  };

  // 直接提交文本内容的函数
  const handleResumeTextUpload = async () => {
    if (!resumeTextInput.trim()) {
      setResumeError('请输入简历内容');
      return;
    }
    
    setResumeLoading(true);
    setResumeError(null);
    
    try {
      const response = await axios.post('/api/upload-resume-text', {
        resumeText: resumeTextInput
      });
      
      setEvaluation(response.data.evaluation);
    } catch (error) {
      console.error('文本提交错误:', error);
      setResumeError(error.response?.data?.error || '提交失败，请稍后再试');
    } finally {
      setResumeLoading(false);
    }
  };
  
  // 统一的简历提交处理函数
  const handleResumeUpload = () => {
    if (resumeInputMode === 'text') {
      handleResumeTextUpload();
    } else {
      handleFileUpload();
    }
  };

  // 文件上传处理函数
  const handleFileUpload = async () => {
    if (!file) {
      setResumeError('请选择文件');
      return;
    }
    
    setResumeLoading(true);
    setResumeError(null);
    
    const formData = new FormData();
    formData.append('resume', file);
    
    try {
      const response = await axios.post('/api/upload-resume', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setEvaluation(response.data.evaluation);
    } catch (error) {
      console.error('上传错误:', error);
      console.log('错误详情:', error.response);
      
      // 增强对图片型PDF的错误处理
      if (error.response?.data?.error?.includes('图片格式') || 
          error.response?.data?.error?.includes('扫描件') ||
          error.response?.data?.error?.includes('内容为空')) {
        setResumeError('您上传的PDF可能是图片格式，系统无法提取文本。请使用"直接输入文本"选项，手动复制粘贴简历内容。');
        setResumeInputMode('text'); // 自动切换到文本输入模式
      } else {
        setResumeError(error.response?.data?.error || '简历上传失败，请稍后再试');
      }
    } finally {
      setResumeLoading(false);
    }
  };

  // 简历优化
  const handleOptimize = async () => {
    if (!evaluation) {
      setResumeError('请先上传简历');
      return;
    }

    setResumeLoading(true);
    setResumeError(null);

    try {
      const response = await axios.post('/api/optimize', {
        resumeText: evaluation.originalText || evaluation,
      });

      setOptimizedResume(response.data.optimizedResume);
    } catch (err) {
      console.error('优化错误:', err);
      setResumeError(err.response?.data?.error || '优化失败，请重试');
    } finally {
      setResumeLoading(false);
    }
  };

  // 将简历文本转换为格式化内容
  const formatResumeContent = () => {
    if (!optimizedResume) return null;
    
    // 提取基本信息
    const lines = optimizedResume.split('\n').filter(line => line.trim() !== '');
    
    // 假设第一行是姓名
    const name = lines[0] || '姓名';
    
    // 尝试提取职位和其他信息
    let position = '职位未指定';
    let experience = [];
    let skills = [];
    let education = [];
    let contact = [];
    
    let currentSection = '';
    
    lines.forEach((line, index) => {
      if (index === 0) return; // 跳过第一行(姓名)
      
      const lowerLine = line.toLowerCase();
      
      if (lowerLine.includes('经验') || lowerLine.includes('工作') || lowerLine.includes('experience')) {
        currentSection = 'experience';
      } else if (lowerLine.includes('技能') || lowerLine.includes('skill') || lowerLine.includes('专长')) {
        currentSection = 'skills';
      } else if (lowerLine.includes('教育') || lowerLine.includes('学历') || lowerLine.includes('education')) {
        currentSection = 'education';
      } else if (lowerLine.includes('联系') || lowerLine.includes('contact') || lowerLine.includes('电话') || lowerLine.includes('邮箱')) {
        currentSection = 'contact';
      } else if (index < 3 && !position.includes('职位')) {
        position = line; // 假设职位在前几行
      } else {
        switch (currentSection) {
          case 'experience':
            experience.push(line);
            break;
          case 'skills':
            skills.push(line);
            break;
          case 'education':
            education.push(line);
            break;
          case 'contact':
            contact.push(line);
            break;
          default:
            // 无法确定的部分加入经验
            if (line.trim().length > 0) {
              experience.push(line);
            }
        }
      }
    });
    
    return { name, position, experience, skills, education, contact };
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>AI 简历优化系统</h1>
        <p>通过 AI 技术提升您的简历和个人简介</p>
      </header>

      <div className="tabs">
        <button 
          className={`tab-button ${activeTab === 'bio' ? 'active' : ''}`}
          onClick={() => setActiveTab('bio')}
        >
          个人简介优化
        </button>
        <button 
          className={`tab-button ${activeTab === 'resume' ? 'active' : ''}`}
          onClick={() => setActiveTab('resume')}
        >
          Web3 简历优化
        </button>
      </div>

      <main className="App-main">
        {/* 个人简介优化部分 */}
        {activeTab === 'bio' && (
          <div className="bio-optimizer">
            <form onSubmit={handleBioSubmit}>
              <div className="form-group">
                <label htmlFor="originalText">您的个人简介 (最多1000字)</label>
                <textarea
                  id="originalText"
                  value={originalText}
                  onChange={(e) => setOriginalText(e.target.value)}
                  placeholder="在此粘贴您当前的简历个人简介..."
                  rows={10}
                  maxLength={1000}
                />
                <small>{originalText.length}/1000</small>
              </div>
              
              <div className="form-group">
                <label htmlFor="jobTitle">目标岗位 (选填)</label>
                <input
                  type="text"
                  id="jobTitle"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="例如：Web3开发、产品经理、社区运营"
                />
              </div>

              {bioError && <div className="error-message">{bioError}</div>}

              <button type="submit" disabled={bioLoading} className="submit-button">
                {bioLoading ? '优化中...' : '优化个人简介'}
              </button>
            </form>
            
            {optimizedVersions.length > 0 && (
              <div className="results">
                <h2>优化后的版本</h2>
                {optimizedVersions.map((version, index) => (
                  <div key={index} className="optimized-version">
                    <h3>版本 {index + 1}</h3>
                    <div className="version-content">{version}</div>
                    <button 
                      onClick={() => navigator.clipboard.writeText(version)}
                      className="copy-button"
                    >
                      复制此版本
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Web3 简历优化部分 */}
        {activeTab === 'resume' && (
          <div className="resume-optimizer">
            <div className="input-mode-toggle">
              <button
                className={`mode-button ${resumeInputMode === 'text' ? 'active' : ''}`}
                onClick={() => setResumeInputMode('text')}
              >
                直接输入文本
              </button>
              <button
                className={`mode-button ${resumeInputMode === 'file' ? 'active' : ''}`}
                onClick={() => setResumeInputMode('file')}
              >
                上传文件
              </button>
            </div>

            {resumeInputMode === 'text' ? (
              <div className="text-input-section">
                <div className="instruction-box">
                  <p><strong>推荐使用文本输入方式</strong>：将您的简历内容直接复制粘贴到下方文本框中，可以避免文件解析问题，尤其是对于中文内容。</p>
                </div>
                <textarea
                  placeholder="请在此输入您的简历内容..."
                  value={resumeTextInput}
                  onChange={(e) => setResumeTextInput(e.target.value)}
                  rows={15}
                  className="resume-text-input"
                />
                <button
                  onClick={handleResumeUpload}
                  disabled={resumeLoading}
                  className="upload-button"
                >
                  {resumeLoading ? '处理中...' : '提交简历'}
                </button>
              </div>
            ) : (
              <div className="file-upload">
                <div className="instruction-box warning">
                  <p><strong>注意：</strong>如果您的简历是图片格式的PDF或扫描件，系统可能无法正确提取文本。</p>
                  <p>建议使用"直接输入文本"选项，手动复制粘贴简历内容以获得更准确的结果。</p>
                </div>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files[0])}
                  accept=".pdf,.docx,.txt"
                />
                <button
                  onClick={handleResumeUpload}
                  disabled={!file || resumeLoading}
                  className="upload-button"
                >
                  {resumeLoading ? '正在处理...' : '上传并分析'}
                </button>
              </div>
            )}

            {resumeError && <div className="error-message">{resumeError}</div>}

            {evaluation && (
              <div className="evaluation-section">
                <h2>AI 评分结果</h2>
                <div className="evaluation-content">
                  <pre>{evaluation}</pre>
                </div>
                <button
                  onClick={handleOptimize}
                  disabled={resumeLoading}
                  className="optimize-button"
                >
                  {resumeLoading ? '优化中...' : '一键优化'}
                </button>
              </div>
            )}

            {optimizedResume && (
              <>
                <div className="optimized-section">
                  <h2>优化后的简历</h2>
                  <div className="optimized-content">
                    <pre>{optimizedResume}</pre>
                  </div>
                  <div className="button-group">
                    <button
                      onClick={() => {
                        const blob = new Blob([optimizedResume], { type: 'text/plain' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = '优化后的简历.txt';
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                      }}
                      className="download-button"
                    >
                      下载文本版简历
                    </button>
                    <button 
                      onClick={() => {
                        const blob = new Blob([optimizedResume], { type: 'application/pdf' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = '优化后的专业简历.pdf';
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                      }}
                      className="download-button pdf-button"
                    >
                      {resumeLoading ? '生成中...' : '生成设计版PDF'}
                    </button>
                  </div>
                </div>
                
                {/* 美观的简历模板 - 用于PDF生成 */}
                <div className="hidden-template">
                  <div ref={resumePdfRef} className="resume-template">
                    <div className="resume-header">
                      <div className="personal-info">
                        <h1>{formatResumeContent()?.name}</h1>
                        <h2>{formatResumeContent()?.position}</h2>
                      </div>
                    </div>
                    
                    <div className="resume-body">
                      <div className="left-column">
                        <div className="section">
                          <h3>联系方式</h3>
                          <ul>
                            {formatResumeContent()?.contact.map((item, index) => (
                              <li key={`contact-${index}`}>{item}</li>
                            ))}
                          </ul>
                        </div>
                        
                        <div className="section">
                          <h3>技能专长</h3>
                          <ul>
                            {formatResumeContent()?.skills.map((item, index) => (
                              <li key={`skill-${index}`}>{item}</li>
                            ))}
                          </ul>
                        </div>
                        
                        <div className="section">
                          <h3>教育背景</h3>
                          <ul>
                            {formatResumeContent()?.education.map((item, index) => (
                              <li key={`edu-${index}`}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      
                      <div className="right-column">
                        <div className="section">
                          <h3>工作经历</h3>
                          <div className="experience-list">
                            {formatResumeContent()?.experience.map((item, index) => (
                              <p key={`exp-${index}`}>{item}</p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App; 