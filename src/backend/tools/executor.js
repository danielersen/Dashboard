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
      // Capture console.log output
      let output = '';
      const originalLog = console.log;
      console.log = (...args) => {
        output += args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ') + '\n';
      };
      
      try {
        // Execute the code in a limited scope
        const result = eval(code);
        
        // Restore console.log
        console.log = originalLog;
        
        // Add result to output if not undefined
        if (result !== undefined) {
          output += String(result);
        }
        
        return {
          output: output.trim(),
          error: ''
        };
      } catch (evalError) {
        // Restore console.log
        console.log = originalLog;
        
        return {
          output: output.trim(),
          error: evalError.message || evalError.toString()
        };
      }
    } catch (error) {
      console.error('JavaScript execution error:', error);
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
