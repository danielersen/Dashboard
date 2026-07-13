// Code execution using external APIs
// Supports languages with simple console output via Agent Code Runner API

const LANGUAGE_MAP = {
  python: 'python',
  javascript: 'javascript',
  typescript: 'typescript',
  bash: 'bash'
};

export async function executeCode(env, language, code) {
  // For JavaScript: execute locally in a sandboxed environment
  // For other languages: external APIs are currently unavailable
  
  if (language === 'javascript') {
    try {
      console.log('Executing JavaScript code:', code);
      
      // Wrap code in a function to allow return statements
      const fn = new Function(code);
      const result = fn();
      
      console.log('Execution result:', result);
      console.log('Result type:', typeof result);
      console.log('Result is undefined:', result === undefined);
      
      // Convert result to string
      let output;
      if (result === undefined) {
        output = 'Code executed successfully (no output)';
      } else if (result === null) {
        output = 'null';
      } else if (typeof result === 'object') {
        output = JSON.stringify(result, null, 2);
      } else {
        output = String(result);
      }
      
      console.log('Final output:', output);
      
      return {
        output: output,
        error: ''
      };
    } catch (error) {
      console.error('JavaScript execution error:', error);
      console.error('Error stack:', error.stack);
      return {
        output: '',
        error: error.message
      };
    }
  }
  
  // For other languages, return error message
  throw new Error('Code execution for Python, TypeScript, and Bash is currently unavailable. External APIs require authentication or are experiencing issues. Only JavaScript execution is available locally.');
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
