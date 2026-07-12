// Unit conversion using external APIs
// For length, volume, and capacity: use conversion factors
// For currency: use external exchange rate API

const CONVERSION_FACTORS = {
  // Length conversions (base: meter) - factor = how many meters in 1 unit
  length: {
    meter: 1,
    kilometer: 1000,
    centimeter: 0.01,
    millimeter: 0.001,
    micrometer: 0.000001,
    nanometer: 0.000000001,
    mile: 1609.344,
    yard: 0.9144,
    foot: 0.3048,
    inch: 0.0254,
    'nautical-mile': 1852,
    'light-year': 9.4607e15,
    'astronomical-unit': 1.496e11,
    parsec: 3.086e16,
    angstrom: 0.0000000001,
    furlong: 201.168,
    chain: 20.1168,
    rod: 5.0292,
    fathom: 1.8288,
    hand: 0.1016
  },
  // Volume conversions (base: cubic meter) - factor = how many cubic meters in 1 unit
  volume: {
    'cubic-meter': 1,
    'cubic-kilometer': 1000000000,
    'cubic-centimeter': 0.000001,
    'cubic-millimeter': 0.000000001,
    liter: 0.001,
    milliliter: 0.000001,
    'cubic-inch': 0.0000163871,
    'cubic-foot': 0.0283168,
    'cubic-yard': 0.764555,
    'gallon-us': 0.00378541,
    'quart-us': 0.000946353,
    'pint-us': 0.000473176,
    'cup-us': 0.000236588,
    'fluid-ounce-us': 0.0000295735,
    'tablespoon-us': 0.0000147868,
    'teaspoon-us': 0.00000492892,
    'gallon-uk': 0.00454609,
    'quart-uk': 0.00113652,
    'pint-uk': 0.000568261,
    'cup-uk': 0.000284131,
    'fluid-ounce-uk': 0.0000284131,
    'tablespoon-uk': 0.0000177582,
    'teaspoon-uk': 0.00000591939,
    barrel: 0.158987,
    bushel: 0.0352391,
    peck: 0.00880977,
    'dry-gallon': 0.00440488,
    'dry-quart': 0.00110122,
    'dry-pint': 0.00055061,
    cord: 3.62456,
    'cubic-fathom': 6.11644,
    'board-foot': 0.00235974
  },
  // Capacity conversions (base: liter) - factor = how many liters in 1 unit
  capacity: {
    liter: 1,
    milliliter: 0.001,
    'cubic-meter': 1000,
    'cubic-centimeter': 0.001,
    'cubic-millimeter': 0.000001,
    'gallon-us': 3.78541,
    'quart-us': 0.946353,
    'pint-us': 0.473176,
    'cup-us': 0.236588,
    'fluid-ounce-us': 0.0295735,
    'tablespoon-us': 0.0147868,
    'teaspoon-us': 0.00492892,
    'gallon-uk': 4.54609,
    'quart-uk': 1.13652,
    'pint-uk': 0.568261,
    'cup-uk': 0.284131,
    'fluid-ounce-uk': 0.0284131,
    'tablespoon-uk': 0.0177582,
    'teaspoon-uk': 0.00591939,
    barrel: 158.987,
    bushel: 35.2391,
    peck: 8.80977,
    'dry-gallon': 4.40488,
    'dry-quart': 1.10122,
    'dry-pint': 0.55061,
    deciliter: 0.1,
    centiliter: 0.01,
    decaliter: 10,
    hectoliter: 100,
    kiloliter: 1000,
    megaliter: 1000000,
    drop: 0.00005,
    minim: 0.0000616115,
    'fluid-dram': 0.00369669,
    gill: 0.118294,
    'gill-uk': 0.142065,
    jigger: 0.0443603,
    shot: 0.0443603,
    fifth: 0.757082,
    magnum: 1.5,
    jeroboam: 3,
    rehoboam: 4.5,
    methuselah: 6,
    salmanazar: 9,
    balthazar: 12,
    nebuchadnezzar: 15,
    melchior: 18
  }
};

export async function convertUnits(env, type, value, from, to) {
  if (type === 'currency') {
    return await convertCurrency(env, value, from, to);
  }
  
  const factors = CONVERSION_FACTORS[type];
  if (!factors) {
    throw new Error(`Unsupported conversion type: ${type}`);
  }
  
  const fromFactor = factors[from];
  const toFactor = factors[to];
  
  console.log(`Converting ${value} ${from} to ${to}`);
  console.log(`fromFactor: ${fromFactor}, toFactor: ${toFactor}`);
  
  if (fromFactor === undefined || toFactor === undefined) {
    throw new Error(`Unsupported unit for type ${type}. From: ${from}, To: ${to}`);
  }
  
  // Convert from unit to base unit, then to target unit
  // factor = how many of the unit in 1 base unit
  // So to convert: value * fromFactor = base value, then base value / toFactor = target value
  const baseValue = value * fromFactor;
  const result = baseValue / toFactor;
  
  console.log(`baseValue: ${baseValue}, result: ${result}`);
  
  // Round to appropriate precision
  return roundToPrecision(result, 10);
}

async function convertCurrency(env, value, from, to) {
  if (from === to) {
    return value;
  }
  
  // Use external exchange rate API
  // Using exchangerate-api.com (free tier available)
  try {
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${from}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates');
    }
    
    const data = await response.json();
    const rate = data.rates[to];
    
    if (!rate) {
      throw new Error(`Unsupported currency: ${to}`);
    }
    
    const result = value * rate;
    return roundToPrecision(result, 6);
  } catch (error) {
    console.error('Currency conversion error:', error);
    throw new Error('Failed to convert currency. Please try again later.');
  }
}

function roundToPrecision(value, decimals) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

export async function converterHandler(env, path, method, body) {
  if (method !== 'POST') {
    throw new Error('Method not allowed');
  }
  
  const { type, value, from, to } = body;
  
  if (!type || !value || !from || !to) {
    throw new Error('Missing required parameters: type, value, from, to');
  }
  
  const numValue = parseFloat(value);
  if (isNaN(numValue)) {
    throw new Error('Invalid value');
  }
  
  try {
    const result = await convertUnits(env, type, numValue, from, to);
    return { result: result.toString() };
  } catch (error) {
    throw new Error(`Conversion failed: ${error.message}`);
  }
}
