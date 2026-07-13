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
    const originalExpression = this.expression;
    try {
      // Convert display format to JS eval format
      let evalExpression = this.expression
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/−/g, '-')
        // Add implicit multiplication for number followed by π or e
        .replace(/(\d)(π)/g, '$1*Math.PI')
        .replace(/(\d)(e(?![x^]))/g, '$1*Math.E')
        // Add implicit multiplication for number followed by functions
        .replace(/(\d)(sin⁻¹\()/g, '$1*Math.asin(')
        .replace(/(\d)(cos⁻¹\()/g, '$1*Math.acos(')
        .replace(/(\d)(tan⁻¹\()/g, '$1*Math.atan(')
        .replace(/(\d)(sin\()/g, '$1*Math.sin(')
        .replace(/(\d)(cos\()/g, '$1*Math.cos(')
        .replace(/(\d)(tan\()/g, '$1*Math.tan(')
        .replace(/(\d)(log\()/g, '$1*Math.log10(')
        .replace(/(\d)(ln\()/g, '$1*Math.log(')
        .replace(/(\d)(√\()/g, '$1*Math.sqrt(')
        .replace(/(\d)(∛\()/g, '$1*Math.cbrt(')
        // Add implicit multiplication for number followed by parenthesis
        .replace(/(\d)\(/g, '$1*(')
        // Add implicit multiplication for parenthesis followed by number
        .replace(/\)(\d)/g, ')*$1')
        // Add implicit multiplication for parenthesis followed by π or e
        .replace(/\)(π)/g, ')*Math.PI')
        .replace(/\)(e(?![x^]))/g, ')*Math.E')
        // Add implicit multiplication for parenthesis followed by functions
        .replace(/\)(sin⁻¹\()/g, ')*Math.asin(')
        .replace(/\)(cos⁻¹\()/g, ')*Math.acos(')
        .replace(/\)(tan⁻¹\()/g, ')*Math.atan(')
        .replace(/\)(sin\()/g, ')*Math.sin(')
        .replace(/\)(cos\()/g, ')*Math.cos(')
        .replace(/\)(tan\()/g, ')*Math.tan(')
        .replace(/\)(log\()/g, ')*Math.log10(')
        .replace(/\)(ln\()/g, ')*Math.log(')
        .replace(/\)(√\()/g, ')*Math.sqrt(')
        .replace(/\)(∛\()/g, ')*Math.cbrt(')
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
        .replace(/e\^/g, 'Math.exp(')
        // Replace ^ with ** for power operator
        .replace(/\^/g, '**');

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
        
        // Add to history if calculation was successful
        if (originalExpression && this.result !== 'Error') {
          addCalculationToHistory(originalExpression, this.result);
        }
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
    
    // Format power expressions with superscript
    const formatExpression = (expr) => {
      // Replace ^ with superscript formatting for the following characters
      // This is a simple implementation - for complex expressions, more sophisticated parsing would be needed
      return expr.replace(/\^([^\^]+)/g, '<sup>$1</sup>');
    };
    
    this.displayExpression.innerHTML = `
      <span>${formatExpression(beforeCursor)}</span>
      <span class="cursor">|</span>
      <span>${formatExpression(afterCursor)}</span>
    `;
    
    this.displayResult.textContent = this.result;
  }
}

// Initialize calculator
const calculator = new ScientificCalculator();

// ===================== CALCULATOR HISTORY =====================

const calculatorHistoryContainer = document.getElementById('calculator-history');
const clearHistoryBtn = document.getElementById('clear-history-btn');

async function loadCalculatorHistory() {
  try {
    const response = await authedFetch('/api/tools/calcul-history', {
      method: 'GET'
    });
    
    if (response.ok) {
      const data = await response.json();
      renderCalculatorHistory(data.resp?.history || []);
    }
  } catch (error) {
    console.error('Error loading calculator history:', error);
  }
}

function renderCalculatorHistory(history) {
  if (!history || history.length === 0) {
    calculatorHistoryContainer.innerHTML = '<p class="history-empty">No calculations yet</p>';
    return;
  }
  
  calculatorHistoryContainer.innerHTML = history.map(item => `
    <div class="history-item" data-calculation="${item.calculation}" data-result="${item.result}">
      <div class="history-calculation">${item.calculation}</div>
      <div class="history-result">= ${item.result}</div>
      <div class="history-timestamp">${new Date(item.timestamp).toLocaleString()}</div>
    </div>
  `).join('');
  
  // Add click handlers to history items
  document.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', () => {
      const calculation = item.dataset.calculation;
      const result = item.dataset.result;
      calculator.expression = result;
      calculator.cursorPos = result.length;
      calculator.updateDisplay();
    });
  });
}

async function addCalculationToHistory(calculation, result) {
  // Optimistic update - add to UI immediately
  const newEntry = {
    calculation,
    result,
    timestamp: new Date().toISOString()
  };
  
  // Get current history from DOM or create new array
  const currentHistory = [];
  const existingItems = document.querySelectorAll('.history-item');
  existingItems.forEach(item => {
    currentHistory.push({
      calculation: item.dataset.calculation,
      result: item.dataset.result,
      timestamp: item.querySelector('.history-timestamp').textContent
    });
  });
  
  // Add new entry at the beginning
  currentHistory.unshift(newEntry);
  
  // Keep only most recent 30
  if (currentHistory.length > 30) {
    currentHistory.splice(30);
  }
  
  // Update UI immediately
  renderCalculatorHistory(currentHistory);
  
  // Then send to API in background
  try {
    const response = await authedFetch('/api/tools/calcul-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ calculation, result })
    });
    
    if (response.ok) {
      const data = await response.json();
      // Update with server response to ensure consistency
      renderCalculatorHistory(data.resp?.history || []);
    }
  } catch (error) {
    console.error('Error adding to calculator history:', error);
  }
}

async function clearCalculatorHistory() {
  try {
    const response = await authedFetch('/api/tools/calcul-history', {
      method: 'DELETE'
    });
    
    if (response.ok) {
      const data = await response.json();
      renderCalculatorHistory(data.history || []);
    }
  } catch (error) {
    console.error('Error clearing calculator history:', error);
  }
}

clearHistoryBtn.addEventListener('click', clearCalculatorHistory);

// Load history on page load
loadCalculatorHistory();

// ===================== CONVERTER =====================

const converterUnits = {
  length: {
    units: ['angstrom', 'nanometer', 'micrometer', 'millimeter', 'centimeter', 'inch', 'hand', 'foot', 'yard', 'meter', 'fathom', 'rod', 'chain', 'furlong', 'kilometer', 'mile', 'nautical-mile', 'astronomical-unit', 'light-year', 'parsec'],
    symbols: ['Å', 'nm', 'μm', 'mm', 'cm', 'in', 'h', 'ft', 'yd', 'm', 'fm', 'rd', 'ch', 'fur', 'km', 'mi', 'nmi', 'AU', 'ly', 'pc']
  },
  volume: {
    units: ['cubic-millimeter', 'cubic-centimeter', 'milliliter', 'teaspoon-us', 'tablespoon-us', 'cubic-inch', 'fluid-ounce-us', 'fluid-ounce-uk', 'cup-us', 'cup-uk', 'pint-us', 'pint-uk', 'dry-pint', 'quart-us', 'quart-uk', 'dry-quart', 'liter', 'board-foot', 'gallon-us', 'gallon-uk', 'dry-gallon', 'peck', 'cubic-foot', 'bushel', 'barrel', 'cubic-yard', 'cord', 'cubic-fathom', 'cubic-meter', 'cubic-kilometer'],
    symbols: ['mm³', 'cm³', 'mL', 'tsp (US)', 'tbsp (US)', 'in³', 'fl oz (US)', 'fl oz (UK)', 'cup (US)', 'cup (UK)', 'pt (US)', 'pt (UK)', 'dry pt', 'qt (US)', 'qt (UK)', 'dry qt', 'L', 'fbm', 'gal (US)', 'gal (UK)', 'dry gal', 'pk', 'ft³', 'bu', 'bbl', 'yd³', 'cord', 'fm³', 'm³', 'km³']
  },
  capacity: {
    units: ['cubic-millimeter', 'drop', 'minim', 'milliliter', 'cubic-centimeter', 'teaspoon-us', 'fluid-dram', 'tablespoon-us', 'fluid-ounce-uk', 'fluid-ounce-us', 'jigger', 'shot', 'gill', 'gill-uk', 'cup-us', 'cup-uk', 'pint-us', 'dry-pint', 'pint-uk', 'fifth', 'liter', 'quart-us', 'dry-quart', 'quart-uk', 'magnum', 'gallon-us', 'jeroboam', 'gallon-uk', 'dry-gallon', 'rehoboam', 'decaliter', 'methuselah', 'peck', 'hectoliter', 'salmanazar', 'balthazar', 'bushel', 'kiloliter', 'nebuchadnezzar', 'cubic-meter', 'barrel', 'melchior', 'megaliter'],
    symbols: ['mm³', 'gtt', 'min', 'mL', 'cm³', 'tsp (US)', 'fl dr', 'tbsp (US)', 'fl oz (UK)', 'fl oz (US)', 'jig', 'shot', 'gi (US)', 'gi (UK)', 'cup (US)', 'cup (UK)', 'pt (US)', 'dry pt', 'pt (UK)', 'fifth', 'L', 'qt (US)', 'dry qt', 'qt (UK)', 'mag', 'gal (US)', 'jer', 'gal (UK)', 'dry gal', 'reh', 'daL', 'meth', 'pk', 'hL', 'sal', 'bal', 'bu', 'kL', 'neb', 'm³', 'bbl', 'mel', 'ML']
  },
  currency: {
    units: ['AFN', 'AOA', 'ARS', 'AUD', 'AWG', 'AZN', 'BAM', 'BBD', 'BDT', 'BGN', 'BHD', 'BIF', 'BMD', 'BND', 'BOB', 'BRL', 'BSD', 'BTN', 'BWP', 'BYN', 'BZD', 'CAD', 'CDF', 'CHF', 'CLP', 'CNY', 'COP', 'CRC', 'CUC', 'CUP', 'CVE', 'CZK', 'DJF', 'DKK', 'DOP', 'DZD', 'EGP', 'ERN', 'ETB', 'EUR', 'FJD', 'FKP', 'GBP', 'GEL', 'GGP', 'GHS', 'GIP', 'GMD', 'GNF', 'GTQ', 'GYD', 'HKD', 'HNL', 'HRK', 'HTG', 'HUF', 'IDR', 'ILS', 'IMP', 'INR', 'IQD', 'IRR', 'ISK', 'JEP', 'JMD', 'JOD', 'JPY', 'KES', 'KGS', 'KHR', 'KMF', 'KPW', 'KRW', 'KWD', 'KYD', 'KZT', 'LAK', 'LBP', 'LKR', 'LRD', 'LSL', 'LYD', 'MAD', 'MDL', 'MGA', 'MKD', 'MMK', 'MNT', 'MOP', 'MRU', 'MUR', 'MVR', 'MWK', 'MXN', 'MYR', 'MZN', 'NAD', 'NGN', 'NIO', 'NOK', 'NPR', 'NZD', 'OMR', 'PAB', 'PEN', 'PGK', 'PHP', 'PKR', 'PLN', 'PYG', 'QAR', 'RON', 'RSD', 'RUB', 'RWF', 'SAR', 'SBD', 'SCR', 'SDG', 'SEK', 'SGD', 'SHP', 'SLL', 'SOS', 'SPL', 'SRD', 'STN', 'SVC', 'SYP', 'SZL', 'THB', 'TJS', 'TMT', 'TND', 'TOP', 'TRY', 'TTD', 'TVD', 'TWD', 'TZS', 'UAH', 'UGX', 'USD', 'UYU', 'UZS', 'VEF', 'VND', 'VUV', 'WST', 'XAF', 'XAG', 'XAU', 'XBA', 'XBB', 'XBC', 'XBD', 'XCD', 'XDR', 'XOF', 'XPD', 'XPF', 'XPT', 'XSU', 'XTS', 'XUA', 'XXX', 'YER', 'ZAR', 'ZMW', 'ZWL'],
    symbols: ['؋', 'Kz', '$', 'A$', 'ƒ', '₼', 'КМ', '$', '৳', 'лв', 'BD', 'FBu', '$', 'B$', 'Bs', 'R$', '$', 'Nu.', 'P', 'Bs', '$', 'C$', 'FC', 'Fr', '$', '¥', '$', '₡', 'CUC', '$', '$', 'Kč', 'Fdj', 'kr', 'RD$', 'DA', 'E£', 'Nfk', 'Br', '€', '$', '£', '£', '₵', '£', 'D', 'FG', 'Q', 'GY$', 'HK$', 'L', 'kn', 'G', 'Ft', 'Rp', '₪', '£', '₨', 'ع.د', '﷼', 'kr', '£', 'J$', 'د.ا', '¥', 'KSh', 'с', '៛', 'CF', '₩', '₩', 'KD', 'CI$', '₸', '₭', 'ل.ل', '₨', 'L$', 'L', 'LD', 'DH', 'L', 'Ar', 'ден', 'K', '₮', 'MOP$', 'UM', '₨', 'Rf', 'MK', '$', 'RM', 'MT', 'N$', '₦', 'C$', 'kr', '₨', 'NZ$', 'ر.ع', 'B/.', 'S/', 'K', '₱', '₨', 'zł', '₲', 'QR', 'lei', 'дин', '₽', 'FRw', '﷼', 'SI$', '₨', '£', 'S', 'SOS', 'SPL', '$', 'Db', '₡', '£', 'L', '฿', 'ЅМ', 'm', 'DT', 'T$', '₺', 'TT$', '$', 'NT$', 'TSh', '₴', 'UGX', '$', '$', 'soʻm', 'VES', '₫', 'VT', 'T', 'FCFA', 'XAG', 'XAU', 'XBA', 'XBB', 'XBC', 'XBD', '$', 'XDR', 'CFA', 'XPD', 'XPF', 'XPT', 'XSU', 'XTS', 'XUA', 'XXX', '﷼', 'R', 'ZK', 'ZWL'],
    countries: {
      'AFN': 'Afghanistan',
      'AOA': 'Angola',
      'ARS': 'Argentina',
      'AUD': 'Australia',
      'AWG': 'Aruba',
      'AZN': 'Azerbaijan',
      'BAM': 'Bosnia and Herzegovina',
      'BBD': 'Barbados',
      'BDT': 'Bangladesh',
      'BGN': 'Bulgaria',
      'BHD': 'Bahrain',
      'BIF': 'Burundi',
      'BMD': 'Bermuda',
      'BND': 'Brunei',
      'BOB': 'Bolivia',
      'BRL': 'Brazil',
      'BSD': 'Bahamas',
      'BTN': 'Bhutan',
      'BWP': 'Botswana',
      'BYN': 'Belarus',
      'BZD': 'Belize',
      'CAD': 'Canada',
      'CDF': 'Democratic Republic of Congo',
      'CHF': 'Switzerland',
      'CLP': 'Chile',
      'CNY': 'China',
      'COP': 'Colombia',
      'CRC': 'Costa Rica',
      'CUC': 'Cuba',
      'CUP': 'Cuba',
      'CVE': 'Cape Verde',
      'CZK': 'Czech Republic',
      'DJF': 'Djibouti',
      'DKK': 'Denmark',
      'DOP': 'Dominican Republic',
      'DZD': 'Algeria',
      'EGP': 'Egypt',
      'ERN': 'Eritrea',
      'ETB': 'Ethiopia',
      'EUR': 'Eurozone (Europe)',
      'FJD': 'Fiji',
      'FKP': 'Falkland Islands',
      'GBP': 'United Kingdom',
      'GEL': 'Georgia',
      'GGP': 'Guernsey',
      'GHS': 'Ghana',
      'GIP': 'Gibraltar',
      'GMD': 'Gambia',
      'GNF': 'Guinea',
      'GTQ': 'Guatemala',
      'GYD': 'Guyana',
      'HKD': 'Hong Kong',
      'HNL': 'Honduras',
      'HRK': 'Croatia',
      'HTG': 'Haiti',
      'HUF': 'Hungary',
      'IDR': 'Indonesia',
      'ILS': 'Israel',
      'IMP': 'Isle of Man',
      'INR': 'India',
      'IQD': 'Iraq',
      'IRR': 'Iran',
      'ISK': 'Iceland',
      'JEP': 'Jersey',
      'JMD': 'Jamaica',
      'JOD': 'Jordan',
      'JPY': 'Japan',
      'KES': 'Kenya',
      'KGS': 'Kyrgyzstan',
      'KHR': 'Cambodia',
      'KMF': 'Comoros',
      'KPW': 'North Korea',
      'KRW': 'South Korea',
      'KWD': 'Kuwait',
      'KYD': 'Cayman Islands',
      'KZT': 'Kazakhstan',
      'LAK': 'Laos',
      'LBP': 'Lebanon',
      'LKR': 'Sri Lanka',
      'LRD': 'Liberia',
      'LSL': 'Lesotho',
      'LYD': 'Libya',
      'MAD': 'Morocco',
      'MDL': 'Moldova',
      'MGA': 'Madagascar',
      'MKD': 'North Macedonia',
      'MMK': 'Myanmar',
      'MNT': 'Mongolia',
      'MOP': 'Macau',
      'MRU': 'Mauritania',
      'MUR': 'Mauritius',
      'MVR': 'Maldives',
      'MWK': 'Malawi',
      'MXN': 'Mexico',
      'MYR': 'Malaysia',
      'MZN': 'Mozambique',
      'NAD': 'Namibia',
      'NGN': 'Nigeria',
      'NIO': 'Nicaragua',
      'NOK': 'Norway',
      'NPR': 'Nepal',
      'NZD': 'New Zealand',
      'OMR': 'Oman',
      'PAB': 'Panama',
      'PEN': 'Peru',
      'PGK': 'Papua New Guinea',
      'PHP': 'Philippines',
      'PKR': 'Pakistan',
      'PLN': 'Poland',
      'PYG': 'Paraguay',
      'QAR': 'Qatar',
      'RON': 'Romania',
      'RSD': 'Serbia',
      'RUB': 'Russia',
      'RWF': 'Rwanda',
      'SAR': 'Saudi Arabia',
      'SBD': 'Solomon Islands',
      'SCR': 'Seychelles',
      'SDG': 'Sudan',
      'SEK': 'Sweden',
      'SGD': 'Singapore',
      'SHP': 'Saint Helena',
      'SLL': 'Sierra Leone',
      'SOS': 'Somalia',
      'SPL': 'Seborga',
      'SRD': 'Suriname',
      'STN': 'São Tomé and Príncipe',
      'SVC': 'El Salvador',
      'SYP': 'Syria',
      'SZL': 'Eswatini',
      'THB': 'Thailand',
      'TJS': 'Tajikistan',
      'TMT': 'Turkmenistan',
      'TND': 'Tunisia',
      'TOP': 'Tonga',
      'TRY': 'Turkey',
      'TTD': 'Trinidad and Tobago',
      'TVD': 'Tuvalu',
      'TWD': 'Taiwan',
      'TZS': 'Tanzania',
      'UAH': 'Ukraine',
      'UGX': 'Uganda',
      'USD': 'United States',
      'UYU': 'Uruguay',
      'UZS': 'Uzbekistan',
      'VEF': 'Venezuela',
      'VND': 'Vietnam',
      'VUV': 'Vanuatu',
      'WST': 'Samoa',
      'XAF': 'Central Africa (CFA)',
      'XAG': 'Silver (Precious Metal)',
      'XAU': 'Gold (Precious Metal)',
      'XBA': 'European Composite Unit (EURCO)',
      'XBB': 'European Monetary Unit (EMU)',
      'XBC': 'European Unit of Account (XBC)',
      'XBD': 'European Unit of Account (XBD)',
      'XCD': 'East Caribbean',
      'XDR': 'Special Drawing Rights (IMF)',
      'XOF': 'West Africa (CFA)',
      'XPD': 'Palladium (Precious Metal)',
      'XPF': 'French Pacific Territories (CFP)',
      'XPT': 'Platinum (Precious Metal)',
      'XSU': 'Sistema Unitario de Compensación',
      'XTS': 'Testing Currency Code',
      'XUA': 'African Development Bank',
      'XXX': 'No Currency',
      'YER': 'Yemen',
      'ZAR': 'South Africa',
      'ZMW': 'Zambia',
      'ZWL': 'Zimbabwe'
    }
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
  const countries = converterUnits[type].countries;
  
  converterFromSelect.innerHTML = '';
  converterToSelect.innerHTML = '';
  
  units.forEach((unit, index) => {
    let labelText;
    if (type === 'currency' && countries && countries[unit]) {
      labelText = `${unit} (${symbols[index]}) - ${countries[unit]}`;
    } else {
      labelText = `${unit} (${symbols[index]})`;
    }
    const option1 = new Option(labelText, unit);
    const option2 = new Option(labelText, unit);
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

let currentLanguage = 'javascript';

const codeLangBtns = document.querySelectorAll('.code-lang-btn');
const codeInput = document.getElementById('code-input');
const codeRunBtn = document.getElementById('code-run-btn');
const codeClearBtn = document.getElementById('code-clear-btn');
const codeOutputContent = document.getElementById('code-output-content');
const codeCopyOutput = document.getElementById('code-copy-output');

// Set default code examples
const codeExamples = {
  javascript: `console.log("Hello")`
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
    // Execute JavaScript directly in the browser
    if (currentLanguage === 'javascript') {
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
        },
        info: (...args) => {
          logs.push('INFO: ' + args.map(arg => String(arg)).join(' '));
        }
      };
      
      try {
        const fn = new Function('console', code);
        fn(customConsole);
        
        const output = logs.join('\n');
        codeOutputContent.textContent = output || 'Code executed successfully (no output)';
      } catch (evalError) {
        codeOutputContent.textContent = 'Error: ' + evalError.message;
      }
    } else {
      // For other languages, use backend API
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
    }
  } catch (error) {
    console.error('Code execution error:', error);
    codeOutputContent.textContent = error.message || 'Error executing code';
  } finally {
    codeRunBtn.disabled = false;
  }
}

initCodeExecutor();
