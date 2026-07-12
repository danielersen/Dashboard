// Code execution using external APIs
// Supports Python, JavaScript, C, and C++

const LANGUAGE_MAP = {
  python: 'python3',
  javascript: 'nodejs',
  c: 'c',
  cpp: 'cpp'
};

export async function executeCode(env, language, code) {
  // Use Piston API for code execution (https://emkc.org/api/v2/piston)
  // Piston is a free API for executing code in multiple languages
  
  const mappedLanguage = LANGUAGE_MAP[language];
  if (!mappedLanguage) {
    throw new Error(`Unsupported language: ${language}`);
  }
  
  try {
    const response = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        language: mappedLanguage,
        source: code,
        args: []
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to execute code');
    }
    
    const data = await response.json();
    
    if (data.message) {
      throw new Error(data.message);
    }
    
    return {
      output: data.run?.output || '',
      error: data.run?.stderr || data.compile?.stderr || ''
    };
  } catch (error) {
    console.error('Code execution error:', error);
    throw new Error(`Execution failed: ${error.message}`);
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
    throw new Error(`Execution failed: ${error.message}`);
  }
}
