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
      console.log('Code length:', code.length);
      
      // Create a custom console to capture output
      const logs = [];
      const customConsole = {
        log: (...args) => {
          const message = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          ).join(' ');
          logs.push(message);
          console.log('[CAPTURED]', message);
        },
        error: (...args) => {
          const message = 'ERROR: ' + args.map(arg => String(arg)).join(' ');
          logs.push(message);
          console.log('[CAPTURED]', message);
        },
        warn: (...args) => {
          const message = 'WARN: ' + args.map(arg => String(arg)).join(' ');
          logs.push(message);
          console.log('[CAPTURED]', message);
        },
        info: (...args) => {
          const message = 'INFO: ' + args.map(arg => String(arg)).join(' ');
          logs.push(message);
          console.log('[CAPTURED]', message);
        }
      };
      
      console.log('Creating function with custom console');
      // Create a function with custom console as parameter
      const fn = new Function('console', code);
      console.log('Executing function');
      fn(customConsole);
      
      console.log('Captured logs:', logs);
      console.log('Number of logs:', logs.length);
      
      const output = logs.join('\n');
      
      console.log('Final output:', output);
      
      return {
        output: output || 'Code executed successfully (no output)',
        error: ''
      };
    } catch (error) {
      console.error('JavaScript execution error:', error);
      console.error('Error message:', error.message);
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
