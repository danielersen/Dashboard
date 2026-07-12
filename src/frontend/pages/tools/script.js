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
    this.cursorPos = 0;
    this.result = '0';
    this.secondMode = false;
    this.displayExpression = document.getElementById('calc-expression');
    this.displayResult = document.getElementById('calc-result');
    this.secondBtn = document.getElementById('second-btn');
    this.initEventListeners();
    this.updateDisplay();
  }

  initEventListeners() {
    document.querySelectorAll('.calc-btn').forEach(btn => {
      btn.addEventListener('click', () => this.handleButton(btn));
    });
  }

  handleButton(btn) {
    const action = btn.dataset.action;
    const value = btn.dataset.value;
    const altAction = btn.dataset.alt;

    if (action === 'second') {
      this.toggleSecond();
    } else if (action === 'clear') {
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
      this.trigFunction(this.secondMode && altAction ? altAction : action);
    } else if (action === 'log' || action === 'ln') {
      this.logFunction(this.secondMode && altAction ? altAction : action);
    } else if (action === 'sqrt') {
      this.rootFunction(this.secondMode && altAction ? altAction : action);
    } else if (action === 'power') {
      this.powerFunction(this.secondMode && altAction ? altAction : action);
    } else if (action === 'factorial') {
      this.factorial();
    } else if (action === 'pi') {
      this.addConstant('π');
    } else if (action === 'e') {
      this.addConstant('e');
    } else if (value) {
      this.addNumber(value);
    }
  }

  toggleSecond() {
    this.secondMode = !this.secondMode;
    this.secondBtn.dataset.active = this.secondMode ? 'true' : 'false';
    
    // Update button labels
    document.querySelectorAll('.calc-btn[data-alt]').forEach(btn => {
      const alt = btn.dataset.alt;
      if (this.secondMode) {
        btn.dataset.originalText = btn.textContent;
        btn.textContent = alt;
      } else {
        btn.textContent = btn.dataset.originalText || btn.dataset.action;
      }
    });
  }

  clear() {
    this.expression = '';
    this.cursorPos = 0;
    this.result = '0';
    this.updateDisplay();
  }

  backspace() {
    if (this.cursorPos > 0) {
      this.expression = this.expression.slice(0, this.cursorPos - 1) + this.expression.slice(this.cursorPos);
      this.cursorPos--;
    }
    this.updateDisplay();
  }

  addNumber(num) {
    this.expression = this.insertAtCursor(this.expression, num, this.cursorPos);
    this.cursorPos += num.length;
    this.updateDisplay();
  }

  addOperator(op) {
    const lastChar = this.expression.slice(this.cursorPos - 1, this.cursorPos);
    if (['+', '-', '*', '/', '^'].includes(lastChar)) {
      this.expression = this.expression.slice(0, this.cursorPos - 1) + op + this.expression.slice(this.cursorPos);
    } else {
      this.expression = this.insertAtCursor(this.expression, op, this.cursorPos);
      this.cursorPos += op.length;
    }
    this.updateDisplay();
  }

  addParenthesis(paren) {
    this.expression = this.insertAtCursor(this.expression, paren, this.cursorPos);
    this.cursorPos += paren.length;
    this.updateDisplay();
  }

  addConstant(constant) {
    this.expression = this.insertAtCursor(this.expression, constant, this.cursorPos);
    this.cursorPos += constant.length;
    this.updateDisplay();
  }

  insertAtCursor(str, insert, pos) {
    return str.slice(0, pos) + insert + str.slice(pos);
  }

  percent() {
    if (this.expression) {
      this.expression = `(${this.expression})/100`;
      this.cursorPos = this.expression.length;
      this.calculate();
    }
  }

  toggleSign() {
    if (this.expression) {
      this.expression = `-${this.expression}`;
      this.cursorPos = this.expression.length;
      this.updateDisplay();
    }
  }

  trigFunction(func) {
    const funcName = func === 'asin' ? 'asin' : func === 'acos' ? 'acos' : func === 'atan' ? 'atan' : func;
    const displayFunc = funcName === 'asin' ? 'sin⁻¹' : funcName === 'acos' ? 'cos⁻¹' : funcName === 'atan' ? 'tan⁻¹' : func;
    this.expression = this.insertAtCursor(this.expression, `${displayFunc}(`, this.cursorPos);
    this.cursorPos += displayFunc.length + 1;
    this.updateDisplay();
  }

  logFunction(func) {
    if (func === '10x') {
      this.expression = this.insertAtCursor(this.expression, '10^', this.cursorPos);
      this.cursorPos += 3;
    } else if (func === 'ex') {
      this.expression = this.insertAtCursor(this.expression, 'e^', this.cursorPos);
      this.cursorPos += 2;
    } else {
      const displayFunc = func === 'log' ? 'log(' : 'ln(';
      this.expression = this.insertAtCursor(this.expression, displayFunc, this.cursorPos);
      this.cursorPos += displayFunc.length;
    }
    this.updateDisplay();
  }

  rootFunction(func) {
    if (func === 'cbrt') {
      this.expression = this.insertAtCursor(this.expression, '∛(', this.cursorPos);
      this.cursorPos += 2;
    } else {
      this.expression = this.insertAtCursor(this.expression, '√(', this.cursorPos);
      this.cursorPos += 2;
    }
    this.updateDisplay();
  }

  powerFunction(func) {
    if (func === 'root') {
      this.expression = this.insertAtCursor(this.expression, '^(1/', this.cursorPos);
      this.cursorPos += 4;
    } else {
      this.expression = this.insertAtCursor(this.expression, '^', this.cursorPos);
      this.cursorPos += 1;
    }
    this.updateDisplay();
  }

  factorial() {
    const beforeCursor = this.expression.slice(0, this.cursorPos);
    const num = parseFloat(beforeCursor.match(/-?\d*\.?\d+$/)?.[0] || '0');
    
    if (num >= 0 && Number.isInteger(num)) {
      const fact = this.factorialCalc(num);
      const match = beforeCursor.match(/-?\d*\.?\d+$/);
      if (match) {
        this.expression = beforeCursor.slice(0, -match[0].length) + fact + this.expression.slice(this.cursorPos);
        this.cursorPos = beforeCursor.slice(0, -match[0].length).length + fact.toString().length;
      }
    }
    this.updateDisplay();
  }

  factorialCalc(n) {
    if (n === 0 || n === 1) return 1;
    return n * this.factorialCalc(n - 1);
  }

  calculate() {
    try {
      // Convert display format to JS eval format
      let evalExpression = this.expression
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/−/g, '-')
        // Add implicit multiplication for number followed by π or e
        .replace(/(\d)(π)/g, '$1*Math.PI')
        .replace(/(\d)(e(?![x^]))/g, '$1*Math.E')
        .replace(/π/g, 'Math.PI')
        .replace(/e(?![x^])/g, 'Math.E')
        .replace(/sin⁻¹\(/g, 'Math.asin(')
        .replace(/cos⁻¹\(/g, 'Math.acos(')
        .replace(/tan⁻¹\(/g, 'Math.atan(')
        .replace(/sin\(/g, 'Math.sin(')
        .replace(/cos\(/g, 'Math.cos(')
        .replace(/tan\(/g, 'Math.tan(')
        .replace(/log\(/g, 'Math.log10(')
        .replace(/ln\(/g, 'Math.log(')
        .replace(/√\(/g, 'Math.sqrt(')
        .replace(/∛\(/g, 'Math.cbrt(')
        .replace(/10\^/g, 'Math.pow(10,')
        .replace(/e\^/g, 'Math.exp(');

      // Close any open parentheses
      const openParens = (evalExpression.match(/\(/g) || []).length;
      const closeParens = (evalExpression.match(/\)/g) || []).length;
      if (openParens > closeParens) {
        evalExpression += ')'.repeat(openParens - closeParens);
      }

      // Evaluate the expression
      const result = eval(evalExpression);
      
      if (isNaN(result) || !isFinite(result)) {
        this.result = 'Error';
      } else {
        // Round to avoid floating point errors
        this.result = Math.round(result * 1000000000) / 1000000000;
        this.expression = this.result.toString();
        this.cursorPos = this.expression.length;
      }
    } catch (e) {
      this.result = 'Error';
    }
    this.updateDisplay();
  }

  updateDisplay() {
    // Display expression with cursor indicator
    const beforeCursor = this.expression.slice(0, this.cursorPos);
    const afterCursor = this.expression.slice(this.cursorPos);
    
    this.displayExpression.innerHTML = `
      <span>${beforeCursor}</span>
      <span class="cursor">|</span>
      <span>${afterCursor}</span>
    `;
    
    this.displayResult.textContent = this.result;
  }
}

// Initialize calculator
const calculator = new ScientificCalculator();

// ===================== CONVERTER =====================

const converterUnits = {
  length: {
    units: ['meter', 'kilometer', 'centimeter', 'millimeter', 'micrometer', 'nanometer', 'mile', 'yard', 'foot', 'inch', 'nautical-mile', 'light-year', 'astronomical-unit', 'parsec', 'angstrom', 'furlong', 'chain', 'rod', 'fathom', 'hand'],
    symbols: ['m', 'km', 'cm', 'mm', 'μm', 'nm', 'mi', 'yd', 'ft', 'in', 'nmi', 'ly', 'AU', 'pc', 'Å', 'fur', 'ch', 'rd', 'fm', 'h']
  },
  volume: {
    units: ['cubic-meter', 'cubic-kilometer', 'cubic-centimeter', 'cubic-millimeter', 'liter', 'milliliter', 'cubic-inch', 'cubic-foot', 'cubic-yard', 'gallon-us', 'quart-us', 'pint-us', 'cup-us', 'fluid-ounce-us', 'tablespoon-us', 'teaspoon-us', 'gallon-uk', 'quart-uk', 'pint-uk', 'cup-uk', 'fluid-ounce-uk', 'tablespoon-uk', 'teaspoon-uk', 'barrel', 'bushel', 'peck', 'dry-gallon', 'dry-quart', 'dry-pint', 'cord', 'cubic-fathom', 'board-foot'],
    symbols: ['m³', 'km³', 'cm³', 'mm³', 'L', 'mL', 'in³', 'ft³', 'yd³', 'gal (US)', 'qt (US)', 'pt (US)', 'cup (US)', 'fl oz (US)', 'tbsp (US)', 'tsp (US)', 'gal (UK)', 'qt (UK)', 'pt (UK)', 'cup (UK)', 'fl oz (UK)', 'tbsp (UK)', 'tsp (UK)', 'bbl', 'bu', 'pk', 'dry gal', 'dry qt', 'dry pt', 'cord', 'fm³', 'fbm']
  },
  capacity: {
    units: ['liter', 'milliliter', 'cubic-meter', 'cubic-centimeter', 'cubic-millimeter', 'gallon-us', 'quart-us', 'pint-us', 'cup-us', 'fluid-ounce-us', 'tablespoon-us', 'teaspoon-us', 'gallon-uk', 'quart-uk', 'pint-uk', 'cup-uk', 'fluid-ounce-uk', 'tablespoon-uk', 'teaspoon-uk', 'barrel', 'bushel', 'peck', 'dry-gallon', 'dry-quart', 'dry-pint', 'deciliter', 'centiliter', 'decaliter', 'hectoliter', 'kiloliter', 'megaliter', 'drop', 'minim', 'fluid-dram', 'gill', 'gill-uk', 'jigger', 'shot', 'fifth', 'magnum', 'jeroboam', 'rehoboam', 'methuselah', 'salmanazar', 'balthazar', 'nebuchadnezzar', 'melchior'],
    symbols: ['L', 'mL', 'm³', 'cm³', 'mm³', 'gal (US)', 'qt (US)', 'pt (US)', 'cup (US)', 'fl oz (US)', 'tbsp (US)', 'tsp (US)', 'gal (UK)', 'qt (UK)', 'pt (UK)', 'cup (UK)', 'fl oz (UK)', 'tbsp (UK)', 'tsp (UK)', 'bbl', 'bu', 'pk', 'dry gal', 'dry qt', 'dry pt', 'dL', 'cL', 'daL', 'hL', 'kL', 'ML', 'gtt', 'min', 'fl dr', 'gi (US)', 'gi (UK)', 'jig', 'shot', 'fifth', 'mag', 'jer', 'reh', 'meth', 'sal', 'bal', 'neb', 'mel']
  },
  currency: {
    units: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'MXN', 'BRL', 'KRW', 'SGD', 'HKD', 'NOK', 'SEK', 'DKK', 'PLN', 'THB', 'MYR', 'IDR', 'PHP', 'VND', 'RUB', 'TRY', 'ZAR', 'AED', 'SAR'],
    symbols: ['$', '€', '£', '¥', 'C$', 'A$', 'Fr', '¥', '₹', '$', 'R$', '₩', 'S$', 'HK$', 'kr', 'kr', 'kr', 'zł', '฿', 'RM', 'Rp', '₱', '₫', '₽', '₺', 'R', 'د.إ', '﷼']
  }
};

let currentConverterType = 'length';
let converterTypeBtns, converterFromSelect, converterToSelect, converterFromInput, converterToInput, converterSwapBtn, converterResultDisplay;

// Initialize converter
function initConverter() {
  converterTypeBtns = document.querySelectorAll('.converter-type-btn');
  converterFromSelect = document.getElementById('converter-from-unit');
  converterToSelect = document.getElementById('converter-to-unit');
  converterFromInput = document.getElementById('converter-from');
  converterToInput = document.getElementById('converter-to');
  converterSwapBtn = document.getElementById('converter-swap-btn');
  converterResultDisplay = document.getElementById('converter-result-display');
  
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
  
  console.log(`Converting: ${value} from ${fromUnit} to ${toUnit}`);
  
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
      console.log('Conversion result:', data);
      console.log('converterToInput:', converterToInput);
      console.log('converterResultDisplay:', converterResultDisplay);
      console.log('data.resp.result:', data.resp?.result);
      console.log('value:', value);
      console.log('fromUnit:', fromUnit);
      console.log('toUnit:', toUnit);
      
      const result = data.resp?.result;
      if (converterToInput && result) {
        converterToInput.value = result;
      }
      if (converterResultDisplay) {
        converterResultDisplay.textContent = `${value} ${fromUnit} = ${result} ${toUnit}`;
      }
    } else {
      const errorData = await response.json();
      console.error('Conversion failed:', errorData);
      converterResultDisplay.textContent = errorData.error || 'Conversion failed';
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
  typescript: `// TypeScript example
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
}`,
  ruby: `# Ruby example
puts "Hello, World!"
(0..4).each do |i|
  puts "Number: #{i}"
end`,
  go: `// Go example
package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
    for i := 0; i < 5; i++ {
        fmt.Printf("Number: %d\\n", i)
    }
}`,
  rust: `// Rust example
fn main() {
    println!("Hello, World!");
    for i in 0..5 {
        println!("Number: {}", i);
    }
}`,
  bash: `#!/bin/bash
# Bash example
echo "Hello, World!"
for i in {0..4}; do
    echo "Number: $i"
done`
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
      if (data.output) {
        codeOutputContent.textContent = data.output;
      } else if (data.error) {
        codeOutputContent.textContent = data.error;
      } else {
        codeOutputContent.textContent = 'Code executed successfully (no output)';
      }
    } else {
      const errorData = await response.json();
      codeOutputContent.textContent = errorData.error || errorData.message || 'Execution failed';
    }
  } catch (error) {
    console.error('Code execution error:', error);
    codeOutputContent.textContent = error.message || 'Error executing code';
  } finally {
    codeRunBtn.disabled = false;
  }
}

initCodeExecutor();
