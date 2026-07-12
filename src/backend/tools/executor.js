// Code execution using external APIs
// Supports Python, JavaScript, C, and C++

const LANGUAGE_MAP = {
  python: 71,
  javascript: 63,
  c: 50,
  cpp: 54
};

export async function executeCode(env, language, code) {
  // Use Judge0 API for code execution (https://judge0.com)
  // Judge0 is a free API for executing code in multiple languages
  
  const languageId = LANGUAGE_MAP[language];
  if (!languageId) {
    throw new Error(`Unsupported language: ${language}`);
  }
  
  try {
    // Submit the code for execution
    const submitResponse = await fetch('https://judge0.com/api/v1/submissions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source_code: code,
        language_id: languageId,
        stdin: ''
      })
    });
    
    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error('Judge0 submit error:', submitResponse.status, errorText);
      throw new Error(`API error: ${submitResponse.status} - ${errorText}`);
    }
    
    const submitData = await submitResponse.json();
    const token = submitData.token;
    
    // Poll for the result
    let result;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const resultResponse = await fetch(`https://judge0.com/api/v1/submissions/${token}`);
      const resultData = await resultResponse.json();
      
      if (resultData.status?.id >= 3) {
        result = resultData;
        break;
      }
      
      attempts++;
    }
    
    if (!result) {
      throw new Error('Execution timeout');
    }
    
    console.log('Judge0 result:', JSON.stringify(result));
    
    if (result.status?.id === 6) {
      // Compilation error
      return {
        output: '',
        error: result.compile_output || result.stderr || 'Compilation error'
      };
    }
    
    if (result.status?.id === 13) {
      // Internal error
      return {
        output: '',
        error: 'Internal error'
      };
    }
    
    return {
      output: result.stdout || '',
      error: result.stderr || ''
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
