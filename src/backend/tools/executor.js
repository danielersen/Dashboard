// Code execution using external APIs
// Supports languages with simple console output via Agent Code Runner API

const LANGUAGE_MAP = {
  python: 'python',
  javascript: 'javascript',
  typescript: 'typescript',
  bash: 'bash'
};

export async function executeCode(env, language, code) {
  // Use Agent Code Runner API (free, no signup required)
  // 30 requests/minute without API key, supports Python, JavaScript, TypeScript, Bash
  
  const mappedLanguage = LANGUAGE_MAP[language];
  if (!mappedLanguage) {
    throw new Error(`Unsupported language: ${language}`);
  }
  
  try {
    const response = await fetch('https://agent-gateway-kappa.vercel.app/v1/agent-coderunner/api/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        language: mappedLanguage,
        code: code
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Agent Code Runner API error:', response.status, errorText);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Agent Code Runner result:', JSON.stringify(data));
    
    return {
      output: data.stdout || '',
      error: data.stderr || ''
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
