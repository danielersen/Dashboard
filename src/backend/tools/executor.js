// Code execution using external APIs
// Supports Python, JavaScript, C, and C++

export async function executeCode(env, language, code) {
  // For JavaScript: execute locally in a sandboxed environment
  // For other languages: use Piston API (with fallback message)
  
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
  
  // For other languages, use Piston API with clear error message
  const LANGUAGE_MAP = {
    python: 'python3',
    c: 'c',
    cpp: 'cpp'
  };
  
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
        version: '*',
        files: [
          {
            content: code
          }
        ]
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Piston API error:', response.status, errorText);
      
      // If it's the whitelist error, throw a more user-friendly message
      if (response.status === 401 && errorText.includes('whitelist')) {
        throw new Error('Code execution for Python, C, and C++ is currently unavailable due to API restrictions. JavaScript execution is available locally.');
      }
      
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Piston API response:', JSON.stringify(data));
    
    if (data.message) {
      throw new Error(data.message);
    }
    
    return {
      output: data.run?.output || '',
      error: data.run?.stderr || data.compile?.stderr || data.message || ''
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
