// Code execution using external APIs
// Supports languages with simple console output

const LANGUAGE_MAP = {
  python: 'python3',
  javascript: 'nodejs',
  typescript: 'typescript',
  c: 'c',
  cpp: 'cpp17',
  ruby: 'ruby',
  go: 'go',
  rust: 'rust',
  bash: 'bash'
};

export async function executeCode(env, language, code) {
  // Use CompilerOnline API (free, no signup required)
  // Supports Python, JavaScript, TypeScript, C, C++, PHP, Ruby, etc.
  
  const mappedLanguage = LANGUAGE_MAP[language];
  if (!mappedLanguage) {
    throw new Error(`Unsupported language: ${language}`);
  }
  
  try {
    const response = await fetch('https://api.compileronline.com/api/v1/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        language: mappedLanguage,
        code: code,
        input: ''
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('CompilerOnline API error:', response.status, errorText);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('CompilerOnline result:', JSON.stringify(data));
    
    return {
      output: data.output || data.stdout || '',
      error: data.error || data.stderr || ''
    };
  } catch (error) {
    console.error('Code execution error:', error);
    throw error;
  }
}

export async function executorHandler(env, path, method, body) {
  if (method !== 'POST') {
    throw new Error('Method not allowed');
  }
  
  const { language, code } = body;
  
  if (!language || !code) {
    throw new Error('Missing required parameters: language, code');
  }
  
  if (!LANGUAGE_MAP[language]) {
    throw new Error(`Unsupported language: ${language}. Supported: ${Object.keys(LANGUAGE_MAP).join(', ')}`);
  }
  
  try {
    const result = await executeCode(env, language, code);
    
    if (result.error) {
      return {
        output: result.output,
        error: result.error
      };
    }
    
    return {
      output: result.output
    };
  } catch (error) {
    throw error;
  }
}
