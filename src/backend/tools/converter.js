// Unit conversion using external APIs
// For length, volume, and capacity: use conversion factors
// For currency: use external exchange rate API

const CONVERSION_FACTORS = {
  // Length conversions (base: meter)
  length: {
    meter: 1,
    kilometer: 0.001,
    centimeter: 100,
    millimeter: 1000,
    mile: 0.000621371,
    yard: 1.09361,
    foot: 3.28084,
    inch: 39.3701
  },
  // Volume conversions (base: cubic meter)
  volume: {
    'cubic-meter': 1,
    'cubic-kilometer': 1e-9,
    'cubic-centimeter': 1e6,
    liter: 1000,
    milliliter: 1e6,
    gallon: 264.172,
    quart: 1056.69,
    pint: 2113.38
  },
  // Capacity conversions (base: liter)
  capacity: {
    liter: 1,
    milliliter: 1000,
    gallon: 0.264172,
    quart: 1.05669,
    pint: 2.11338,
    cup: 4.22675,
    'fluid-ounce': 33.814,
    tablespoon: 67.628
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
  
  if (fromFactor === undefined || toFactor === undefined) {
    throw new Error(`Unsupported unit for type ${type}`);
  }
  
  // Convert to base unit, then to target unit
  const baseValue = value / fromFactor;
  const result = baseValue * toFactor;
  
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
