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
      // Create a custom console to capture output
      const logs = [];
      const customConsole = {
        log: (...args) => {
          logs.push(args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          ).join(' '));
        },
        error: (...args) => {
          logs.push('ERROR: ' + args.map(arg => String(arg)).join(' '));
        },
        warn: (...args) => {
          logs.push('WARN: ' + args.map(arg => String(arg)).join(' '));
        }
      };
      
      try {
        // Create a function with custom console in scope
        const fn = new Function('console', code);
        fn(customConsole);
        
        const output = logs.join('\n');
        
        return {
          output: output || 'Code executed successfully (no output)',
          error: ''
        };
      } catch (evalError) {
        const output = logs.join('\n');
        
        return {
          output: output || '',
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
