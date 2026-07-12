import { authedFetch } from "/lib/auth.js";

// ===================== SECTION NAVIGATION =====================

const navButtons = document.querySelectorAll('.tools-nav');
const sections = document.querySelectorAll('.tools-section');

navButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const sectionId = btn.dataset.section;
    
    // Update nav buttons
    navButtons.forEach(b => b.dataset.active = 'false');
    btn.dataset.active = 'true';
    
    // Update sections
    sections.forEach(section => {
      section.dataset.active = section.id === `${sectionId}-section` ? 'true' : 'false';
    });
  });
});

// Set initial active state
document.querySelector('.tools-nav[data-section="calculator"]').dataset.active = 'true';

// ===================== CALCULATOR =====================

class ScientificCalculator {
  constructor() {
    this.expression = '';
    this.result = '0';
    this.displayExpression = document.getElementById('calc-expression');
    this.displayResult = document.getElementById('calc-result');
    this.initEventListeners();
  }

  initEventListeners() {
    document.querySelectorAll('.calc-btn').forEach(btn => {
      btn.addEventListener('click', () => this.handleButton(btn));
    });
  }

  handleButton(btn) {
    const action = btn.dataset.action;
    const value = btn.dataset.value;

    if (action === 'clear') {
      this.clear();
    } else if (action === 'backspace') {
      this.backspace();
    } else if (action === 'equals') {
      this.calculate();
    } else if (action === 'operator') {
      this.addOperator(value);
    } else if (action === 'percent') {
      this.percent();
    } else if (action === 'sign') {
      this.toggleSign();
    } else if (action === 'parenthesis') {
      this.addParenthesis(value);
    } else if (action === 'sin' || action === 'cos' || action === 'tan') {
      this.trigFunction(action);
    } else if (action === 'log' || action === 'ln') {
      this.logFunction(action);
    } else if (action === 'sqrt') {
      this.sqrt();
    } else if (action === 'power') {
      this.addOperator('^');
    } else if (action === 'factorial') {
      this.factorial();
    } else if (action === 'pi') {
      this.addConstant('Math.PI');
    } else if (action === 'e') {
      this.addConstant('Math.E');
    } else if (value) {
      this.addNumber(value);
    }
  }

  clear() {
    this.expression = '';
    this.result = '0';
    this.updateDisplay();
  }

  backspace() {
    this.expression = this.expression.slice(0, -1);
    this.updateDisplay();
  }

  addNumber(num) {
    this.expression += num;
    this.updateDisplay();
  }

  addOperator(op) {
    const lastChar = this.expression.slice(-1);
    if (['+', '-', '*', '/', '^'].includes(lastChar)) {
      this.expression = this.expression.slice(0, -1) + op;
    } else {
      this.expression += op;
    }
    this.updateDisplay();
  }

  addParenthesis(paren) {
    this.expression += paren;
    this.updateDisplay();
  }

  addConstant(constant) {
    this.expression += constant;
    this.updateDisplay();
  }

  percent() {
    if (this.expression) {
      this.expression = `(${this.expression})/100`;
      this.calculate();
    }
  }

  toggleSign() {
    if (this.expression) {
      this.expression = `-${this.expression}`;
      this.updateDisplay();
    }
  }

  trigFunction(func) {
    if (this.expression) {
      this.expression = `Math.${func}(${this.expression})`;
      this.calculate();
    }
  }

  logFunction(func) {
    if (this.expression) {
      if (func === 'log') {
        this.expression = `Math.log10(${this.expression})`;
      } else {
        this.expression = `Math.log(${this.expression})`;
      }
      this.calculate();
    }
  }

  sqrt() {
    if (this.expression) {
      this.expression = `Math.sqrt(${this.expression})`;
      this.calculate();
    }
  }

  factorial() {
    if (this.expression) {
      const num = parseFloat(this.expression);
      if (num >= 0 && Number.isInteger(num)) {
        this.expression = this.factorialCalc(num).toString();
        this.updateDisplay();
      }
    }
  }

  factorialCalc(n) {
    if (n === 0 || n === 1) return 1;
    return n * this.factorialCalc(n - 1);
  }

  calculate() {
    try {
      // Replace display operators with JS operators
      let evalExpression = this.expression
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/−/g, '-')
        .replace(/\^/g, '**');

      // Evaluate the expression
      const result = eval(evalExpression);
      
      if (isNaN(result) || !isFinite(result)) {
        this.result = 'Error';
      } else {
        // Round to avoid floating point errors
        this.result = Math.round(result * 1000000000) / 1000000000;
        this.expression = this.result.toString();
      }
    } catch (e) {
      this.result = 'Error';
    }
    this.updateDisplay();
  }

  updateDisplay() {
    this.displayExpression.textContent = this.expression
      .replace(/\*/g, '×')
      .replace(/\//g, '÷')
      .replace(/-/g, '−')
      .replace(/Math\.PI/g, 'π')
      .replace(/Math\.E/g, 'e')
      .replace(/Math\.sin/g, 'sin')
      .replace(/Math\.cos/g, 'cos')
      .replace(/Math\.tan/g, 'tan')
      .replace(/Math\.log10/g, 'log')
      .replace(/Math\.log/g, 'ln')
      .replace(/Math\.sqrt/g, '√');
    this.displayResult.textContent = this.result;
  }
}

// Initialize calculator
const calculator = new ScientificCalculator();

// ===================== CONVERTER =====================

const converterUnits = {
  length: {
    units: ['meter', 'kilometer', 'centimeter', 'millimeter', 'mile', 'yard', 'foot', 'inch'],
    symbols: ['m', 'km', 'cm', 'mm', 'mi', 'yd', 'ft', 'in']
  },
  volume: {
    units: ['cubic-meter', 'cubic-kilometer', 'cubic-centimeter', 'liter', 'milliliter', 'gallon', 'quart', 'pint'],
    symbols: ['m³', 'km³', 'cm³', 'L', 'mL', 'gal', 'qt', 'pt']
  },
  capacity: {
    units: ['liter', 'milliliter', 'gallon', 'quart', 'pint', 'cup', 'fluid-ounce', 'tablespoon'],
    symbols: ['L', 'mL', 'gal', 'qt', 'pt', 'cup', 'fl oz', 'tbsp']
  },
  currency: {
    units: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY'],
    symbols: ['$', '€', '£', '¥', 'C$', 'A$', 'Fr', '¥']
  }
};

let currentConverterType = 'length';

const converterTypeBtns = document.querySelectorAll('.converter-type-btn');
const converterFromSelect = document.getElementById('converter-from-unit');
const converterToSelect = document.getElementById('converter-to-unit');
const converterFromInput = document.getElementById('converter-from');
const converterToInput = document.getElementById('converter-to');
const converterSwapBtn = document.getElementById('converter-swap-btn');
const converterResultDisplay = document.getElementById('converter-result-display');

// Initialize converter
function initConverter() {
  populateUnits(currentConverterType);
  
  converterTypeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      converterTypeBtns.forEach(b => b.dataset.active = 'false');
      btn.dataset.active = 'true';
      currentConverterType = btn.dataset.type;
      populateUnits(currentConverterType);
      converterFromInput.value = '';
      converterToInput.value = '';
      converterResultDisplay.textContent = '';
    });
  });

  converterFromInput.addEventListener('input', handleConversion);
  converterToSelect.addEventListener('change', handleConversion);
  converterFromSelect.addEventListener('change', handleConversion);
  
  converterSwapBtn.addEventListener('click', () => {
    const tempValue = converterFromSelect.value;
    converterFromSelect.value = converterToSelect.value;
    converterToSelect.value = tempValue;
    handleConversion();
  });
}

function populateUnits(type) {
  const units = converterUnits[type].units;
  const symbols = converterUnits[type].symbols;
  
  converterFromSelect.innerHTML = '';
  converterToSelect.innerHTML = '';
  
  units.forEach((unit, index) => {
    const option1 = new Option(`${unit} (${symbols[index]})`, unit);
    const option2 = new Option(`${unit} (${symbols[index]})`, unit);
    converterFromSelect.add(option1);
    converterToSelect.add(option2);
  });
  
  // Set default selections
  if (units.length >= 2) {
    converterFromSelect.value = units[0];
    converterToSelect.value = units[1];
  }
}

async function handleConversion() {
  const value = parseFloat(converterFromInput.value);
  const fromUnit = converterFromSelect.value;
  const toUnit = converterToSelect.value;
  
  if (isNaN(value)) {
    converterToInput.value = '';
    converterResultDisplay.textContent = '';
    return;
  }
  
  try {
    const response = await authedFetch('/api/tools/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: currentConverterType,
        value,
        from: fromUnit,
        to: toUnit
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      converterToInput.value = data.result;
      converterResultDisplay.textContent = `${value} ${fromUnit} = ${data.result} ${toUnit}`;
    } else {
      converterResultDisplay.textContent = 'Conversion failed';
    }
  } catch (error) {
    console.error('Conversion error:', error);
    converterResultDisplay.textContent = 'Error converting units';
  }
}

initConverter();

// ===================== CODE EXECUTOR =====================

let currentLanguage = 'python';

const codeLangBtns = document.querySelectorAll('.code-lang-btn');
const codeInput = document.getElementById('code-input');
const codeRunBtn = document.getElementById('code-run-btn');
const codeClearBtn = document.getElementById('code-clear-btn');
const codeOutputContent = document.getElementById('code-output-content');
const codeCopyOutput = document.getElementById('code-copy-output');

// Set default code examples
const codeExamples = {
  python: `# Python example
print("Hello, World!")
for i in range(5):
    print(f"Number: {i}")`,
  javascript: `// JavaScript example
console.log("Hello, World!");
for (let i = 0; i < 5; i++) {
    console.log(\`Number: \${i}\`);
}`,
  c: `// C example
#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    for (int i = 0; i < 5; i++) {
        printf("Number: %d\\n", i);
    }
    return 0;
}`,
  cpp: `// C++ example
#include <iostream>

int main() {
    std::cout << "Hello, World!" << std::endl;
    for (int i = 0; i < 5; i++) {
        std::cout << "Number: " << i << std::endl;
    }
    return 0;
}`
};

// Initialize code executor
function initCodeExecutor() {
  codeInput.value = codeExamples[currentLanguage];
  
  codeLangBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      codeLangBtns.forEach(b => b.dataset.active = 'false');
      btn.dataset.active = 'true';
      currentLanguage = btn.dataset.lang;
      codeInput.value = codeExamples[currentLanguage];
      codeOutputContent.textContent = '';
    });
  });

  codeRunBtn.addEventListener('click', runCode);
  codeClearBtn.addEventListener('click', () => {
    codeInput.value = codeExamples[currentLanguage];
    codeOutputContent.textContent = '';
  });
  
  codeCopyOutput.addEventListener('click', () => {
    const text = codeOutputContent.textContent;
    if (text) {
      navigator.clipboard.writeText(text);
      codeCopyOutput.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      `;
      setTimeout(() => {
        codeCopyOutput.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
          </svg>
        `;
      }, 2000);
    }
  });
}

async function runCode() {
  const code = codeInput.value;
  
  if (!code.trim()) {
    codeOutputContent.textContent = 'Please enter some code';
    return;
  }
  
  codeOutputContent.textContent = 'Running...';
  codeRunBtn.disabled = true;
  
  try {
    const response = await authedFetch('/api/tools/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: currentLanguage,
        code
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      codeOutputContent.textContent = data.output || data.error || 'Code executed successfully';
    } else {
      const errorData = await response.json();
      codeOutputContent.textContent = errorData.error || 'Execution failed';
    }
  } catch (error) {
    console.error('Code execution error:', error);
    codeOutputContent.textContent = 'Error executing code';
  } finally {
    codeRunBtn.disabled = false;
  }
}

initCodeExecutor();
