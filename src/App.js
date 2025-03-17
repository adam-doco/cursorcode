import React, { useState } from 'react';
import './App.css';

function App() {
  const [originalText, setOriginalText] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [optimizedVersions, setOptimizedVersions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!originalText.trim()) {
      setError('请输入您的个人简介');
      return;
    }
    
    if (originalText.length > 1000) {
      setError('个人简介不能超过1000字');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ originalText, jobTitle }),
      });
      
      if (!response.ok) {
        throw new Error('优化请求失败');
      }
      
      const data = await response.json();
      setOptimizedVersions(data.optimizedVersions);
    } catch (err) {
      setError('发生错误: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>AI 简历个人简介优化</h1>
        <p>通过 AI 技术提升您的简历个人简介，使其更专业、更有吸引力</p>
      </header>
      
      <main>
        <form onSubmit={handleSubmit}>
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
          
          {error && <div className="error-message">{error}</div>}
          
          <button type="submit" disabled={isLoading}>
            {isLoading ? '优化中...' : '优化个人简介'}
          </button>
        </form>
        
        {optimizedVersions.length > 0 && (
          <div className="results">
            <h2>优化后的版本</h2>
            {optimizedVersions.map((version, index) => (
              <div key={index} className="optimized-version">
                <h3>版本 {index + 1}</h3>
                <div className="version-content">{version}</div>
                <button onClick={() => navigator.clipboard.writeText(version)}>
                  复制此版本
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default App; 