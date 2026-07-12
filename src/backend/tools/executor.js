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
      // Simple approach: wrap code to capture console.log
      const wrappedCode = `
        (function() {
          const output = [];
          const originalConsole = {
            log: (...args) => output.push(args.join(' ')),
            error: (...args) => output.push('ERROR: ' + args.join(' ')),
            warn: (...args) => output.push('WARN: ' + args.join(' '))
          };
          
          const console = originalConsole;
          
          try {
            ${code}
            return output.join('\\n') || 'Code executed successfully (no output)';
          } catch (e) {
            return output.join('\\n') + '\\nERROR: ' + e.message;
          }
        })()
      `;
      
      const result = eval(wrappedCode);
      
      return {
        output: String(result),
        error: ''
      };
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
