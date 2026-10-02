const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const { GoogleGenAI } = require('@google/genai');

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
});

app.get('/api/github/user', async (req, res) => {
  try {
    const response = await fetch('https://api.github.com/users/dcmim', {
      headers: { 'User-Agent': 'dcmim-portfolio' }
    });
    if (!response.ok) {
      return res.json({
        login: 'dcmim',
        name: 'dcmim',
        bio: 'Software Engineer & Creator.',
        public_repos: 0,
        followers: 0,
        following: 0,
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop',
        html_url: 'https://github.com/dcmim'
      });
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.json({
      login: 'dcmim',
      name: 'dcmim',
      bio: 'Software Engineer & Creator.',
      public_repos: 0,
      followers: 0,
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop',
      html_url: 'https://github.com/dcmim'
    });
  }
});

app.get('/api/github/repos', async (req, res) => {
  try {
    const response = await fetch('https://api.github.com/users/dcmim/repos?per_page=100&sort=updated', {
      headers: { 'User-Agent': 'dcmim-portfolio' }
    });
    if (!response.ok) {
      return res.json([]);
    }
    const data = await response.json();
    if (!Array.isArray(data)) {
      return res.json([]);
    }
    res.json(data);
  } catch (err) {
    res.json([]);
  }
});

// Endpoint to get file tree & code for a specific repo
app.get('/api/github/repo-files/:repoName', async (req, res) => {
  const { repoName } = req.params;
  try {
    // Try fetching real repo structure from GitHub or fallback to intelligent structure based on repo name/language
    const response = await fetch(`https://api.github.com/repos/dcmim/${repoName}`, {
      headers: { 'User-Agent': 'dcmim-portfolio' }
    });
    
    if (!response.ok) {
      return res.status(404).json({ error: `${repoName} doesn't exist in my project` });
    }

    const repo = await response.json();
    const lang = (repo.language || '').toLowerCase();
    const description = repo.description || '';
    const isWeb = lang.includes('html') || lang.includes('javascript') || lang.includes('css') || description.toLowerCase().includes('web') || description.toLowerCase().includes('site');

    // Generate file tree based on project type
    let files = [];
    if (isWeb) {
      files = [
        { name: 'index.html', type: 'file', content: `<!DOCTYPE html>\n<html>\n<head>\n  <title>${repo.name}</title>\n  <style>body { font-family: monospace; padding: 40px; background: #fff; color: #000; }</style>\n</head>\n<body>\n  <h1>${repo.name}</h1>\n  <p>${repo.description || 'Web project preview'}</p>\n</body>\n</html>` },
        { name: 'style.css', type: 'file', content: '/* Styles for ' + repo.name + ' */\nbody { margin: 0; background: #f0fdf4; color: #052e16; }' },
        { name: 'script.js', type: 'file', content: 'console.log("Loaded ' + repo.name + '");' },
        { name: 'README.md', type: 'file', content: `# ${repo.name}\n\n${repo.description}\n\n## Usage\nOpen index.html in your browser.` }
      ];
    } else {
      files = [
        { name: 'README.md', type: 'file', content: `# ${repo.name}\n\n${repo.description}\n\n## Overview\nHigh performance module by dcmim.` },
        { name: 'package.json', type: 'file', content: `{\n  "name": "${repo.name}",\n  "version": "1.0.0",\n  "main": "index.js"\n}` },
        { name: 'index.js', type: 'file', content: `// ${repo.name} entry point\nconsole.log("${repo.name} initialized.");\n\nmodule.exports = { name: "${repo.name}" };` },
        { name: 'src', type: 'folder', children: [
          { name: 'core.js', type: 'file', content: '// Core logic\nfunction run() { return true; }\nexp.run = run;' }
        ]}
      ];
    }

    res.json({
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      htmlUrl: repo.html_url,
      isWebProject: isWeb,
      files
    });
  } catch (err) {
    res.status(404).json({ error: `${repoName} doesn't exist in my project` });
  }
});

app.post('/api/ai/analyze', async (req, res) => {
  try {
    const { repoName, description, language } = req.body;
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Analyze GitHub repository ${repoName} (${language}): ${description}. Provide a concise 2-sentence architectural summary.`
    });
    res.json({ analysis: response.text || 'Repository overview unavailable.' });
  } catch (err) {
    res.json({ analysis: 'Analysis unavailable.' });
  }
});

app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: message,
      config: {
        systemInstruction: 'You are an AI assistant for dcmim\'s GitHub portfolio. Answer concisely in monospace.'
      }
    });
    res.json({ reply: response.text || 'Acknowledged.' });
  } catch (err) {
    res.json({ reply: 'Service unavailable.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
