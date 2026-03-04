/**
 * Verification tests for technical indicator calculations
 * Run this to verify all math is correct
 */

import { calculateRSI, calculateMACD, calculateSMA, calculateEMA, calculateBollingerBands, calculateATR, calculateADX } from './indicators.service';
import { DerivOHLCV } from './deriv-data.service';

// Test data generator
function generateTestData(count: number, trend: 'up' | 'down' | 'flat' = 'flat'): DerivOHLCV[] {
  const data: DerivOHLCV[] = [];
  let basePrice = 100;
  
  for (let i = 0; i < count; i++) {
    let price = basePrice;
    
    switch (trend) {
      case 'up':
        price = basePrice + (i * 0.5) + (Math.random() * 2 - 1);
        break;
      case 'down':
        price = basePrice - (i * 0.5) + (Math.random() * 2 - 1);
        break;
      case 'flat':
        price = basePrice + (Math.random() * 2 - 1);
        break;
    }
    
    data.push({
      time: Date.now() + (i * 60000),
      open: price - 0.5,
      high: price + 1,
      low: price - 1,
      close: price,
      volume: 1000,
    });
    
    basePrice = price;
  }
  
  return data;
}

// Verification functions
export function verifyRSI() {
  console.log('Testing RSI calculation...');
  const data = generateTestData(30);
  const closes = data.map(d => d.close);
  const rsi = calculateRSI(closes, 14);
  
  if (rsi === undefined) {
    console.error('❌ RSI returned undefined');
    return false;
  }
  
  if (rsi < 0 || rsi > 100) {
    console.error(`❌ RSI out of range: ${rsi} (should be 0-100)`);
    return false;
  }
  
  console.log(`✅ RSI: ${rsi.toFixed(2)} (valid range)`);
  return true;
}

export function verifyMACD() {
  console.log('Testing MACD calculation...');
  const data = generateTestData(50);
  const closes = data.map(d => d.close);
  const macd = calculateMACD(closes);
  
  if (macd === undefined) {
    console.error('❌ MACD returned undefined');
    return false;
  }
  
  if (isNaN(macd.macd) || isNaN(macd.signal) || isNaN(macd.histogram)) {
    console.error(`❌ MACD contains NaN values`);
    return false;
  }
  
  const expectedHistogram = macd.macd - macd.signal;
  if (Math.abs(macd.histogram - expectedHistogram) > 0.0001) {
    console.error(`❌ MACD histogram mismatch: ${macd.histogram} vs ${expectedHistogram}`);
    return false;
  }
  
  console.log(`✅ MACD: ${macd.macd.toFixed(4)}, Signal: ${macd.signal.toFixed(4)}, Histogram: ${macd.histogram.toFixed(4)}`);
  return true;
}

export function verifySMA() {
  console.log('Testing SMA calculation...');
  const data = generateTestData(30);
  const closes = data.map(d => d.close);
  const sma = calculateSMA(closes, 20);
  
  if (sma.length === 0) {
    console.error('❌ SMA returned empty array');
    return false;
  }
  
  // Verify last SMA is average of last 20 values
  const last20 = closes.slice(-20);
  const expected = last20.reduce((a, b) => a + b, 0) / 20;
  const actual = sma[sma.length - 1];
  
  if (Math.abs(actual - expected) > 0.0001) {
    console.error(`❌ SMA mismatch: ${actual} vs ${expected}`);
    return false;
  }
  
  console.log(`✅ SMA(20): ${actual.toFixed(4)}`);
  return true;
}

export function verifyEMA() {
  console.log('Testing EMA calculation...');
  const data = generateTestData(60);
  const closes = data.map(d => d.close);
  const ema = calculateEMA(closes, 50);
  
  if (ema === undefined || ema.length === 0) {
    console.error('❌ EMA returned undefined or empty');
    return false;
  }
  
  // EMA should be between min and max of prices
  const minPrice = Math.min(...closes);
  const maxPrice = Math.max(...closes);
  const lastEMA = ema[ema.length - 1];
  
  if (lastEMA < minPrice || lastEMA > maxPrice) {
    console.error(`❌ EMA out of price range: ${lastEMA} (range: ${minPrice}-${maxPrice})`);
    return false;
  }
  
  console.log(`✅ EMA(50): ${lastEMA.toFixed(4)}`);
  return true;
}

export function verifyBollingerBands() {
  console.log('Testing Bollinger Bands calculation...');
  const data = generateTestData(30);
  const closes = data.map(d => d.close);
  const bb = calculateBollingerBands(closes, 20, 2);
  
  if (bb === undefined) {
    console.error('❌ Bollinger Bands returned undefined');
    return false;
  }
  
  // Upper should be > middle, middle should be > lower
  if (bb.upper <= bb.middle || bb.middle <= bb.lower) {
    console.error(`❌ Bollinger Bands ordering incorrect: Upper=${bb.upper}, Middle=${bb.middle}, Lower=${bb.lower}`);
    return false;
  }
  
  // Middle should be close to SMA(20)
  const sma = calculateSMA(closes, 20);
  const expectedMiddle = sma[sma.length - 1];
  if (Math.abs(bb.middle - expectedMiddle) > 0.0001) {
    console.error(`❌ BB Middle mismatch: ${bb.middle} vs ${expectedMiddle}`);
    return false;
  }
  
  console.log(`✅ BB: Upper=${bb.upper.toFixed(4)}, Middle=${bb.middle.toFixed(4)}, Lower=${bb.lower.toFixed(4)}`);
  return true;
}

export function verifyATR() {
  console.log('Testing ATR calculation...');
  const data = generateTestData(20);
  const atr = calculateATR(data, 14);
  
  if (atr === undefined) {
    console.error('❌ ATR returned undefined');
    return false;
  }
  
  if (atr < 0) {
    console.error(`❌ ATR is negative: ${atr}`);
    return false;
  }
  
  console.log(`✅ ATR(14): ${atr.toFixed(4)}`);
  return true;
}

export function verifyADX() {
  console.log('Testing ADX calculation...');
  const data = generateTestData(30);
  const adx = calculateADX(data, 14);
  
  if (adx === undefined) {
    console.error('❌ ADX returned undefined');
    return false;
  }
  
  if (adx < 0 || adx > 100) {
    console.error(`❌ ADX out of range: ${adx} (should be 0-100)`);
    return false;
  }
  
  console.log(`✅ ADX(14): ${adx.toFixed(2)}`);
  return true;
}

// Run all verifications
export function runAllVerifications() {
  console.log('=== Technical Indicators Verification ===\n');
  
  const results = {
    rsi: verifyRSI(),
    macd: verifyMACD(),
    sma: verifySMA(),
    ema: verifyEMA(),
    bb: verifyBollingerBands(),
    atr: verifyATR(),
    adx: verifyADX(),
  };
  
  console.log('\n=== Results ===');
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  console.log(`${passed}/${total} tests passed`);
  
  return results;
}

