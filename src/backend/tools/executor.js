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
      
      // Split code into lines and find the last non-empty, non-comment line
      const lines = code.split('\n').filter(line => line.trim() && !line.trim().startsWith('//'));
      const lastLine = lines[lines.length - 1];
      
      console.log('Last line:', lastLine);
      
      // If the last line doesn't start with return, const, let, var, function, or control structures
      // prepend return to it
      let modifiedCode = code;
      if (lastLine && !lastLine.trim().startsWith('return') && 
          !lastLine.trim().startsWith('const') && 
          !lastLine.trim().startsWith('let') && 
          !lastLine.trim().startsWith('var') &&
          !lastLine.trim().startsWith('function') &&
          !lastLine.trim().startsWith('if') &&
          !lastLine.trim().startsWith('for') &&
          !lastLine.trim().startsWith('while') &&
          !lastLine.trim().startsWith('class')) {
        modifiedCode = code.replace(lastLine, `return ${lastLine}`);
        console.log('Modified code:', modifiedCode);
      }
      
      const fn = new Function(modifiedCode);
      const result = fn();
      
      console.log('Execution result:', result);
      console.log('Result type:', typeof result);
      
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
      console.error('Error message:', error.message);
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
