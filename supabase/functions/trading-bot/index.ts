import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Allowed trading instruments
const ALLOWED_INSTRUMENTS = [
  'USDJPY', 'CADJPY', 'GBPJPY', 'EURJPY', 'AUDJPY', 'CHFJPY', 'XAUUSD'
]

// High liquidity pairs (best for scalping)
const HIGH_LIQUIDITY_PAIRS = ['USDJPY', 'EURJPY', 'XAUUSD']

// Volatility multipliers for different pairs
const VOLATILITY_PROFILE: Record<string, number> = {
  'USDJPY': 1.0,
  'CADJPY': 1.1,
  'GBPJPY': 1.5,  // Most volatile JPY pair
  'EURJPY': 1.2,
  'AUDJPY': 1.3,
  'CHFJPY': 1.1,
  'XAUUSD': 2.0   // Gold is highly volatile
}

// Fallback base prices (used only if live API fails)
const FALLBACK_PRICES: Record<string, number> = {
  'USDJPY': 149.50,
  'CADJPY': 109.80,
  'GBPJPY': 188.90,
  'EURJPY': 162.30,
  'AUDJPY': 97.20,
  'CHFJPY': 168.40,
  'XAUUSD': 2045.50
}

// Map our symbol names to Twelve Data format
const TWELVE_DATA_MAP: Record<string, string> = {
  'USDJPY': 'USD/JPY',
  'CADJPY': 'CAD/JPY',
  'GBPJPY': 'GBP/JPY',
  'EURJPY': 'EUR/JPY',
  'AUDJPY': 'AUD/JPY',
  'CHFJPY': 'CHF/JPY',
  'XAUUSD': 'XAU/USD'
}

let _livePriceCache: Record<string, number> = {}
let _lastFetchTime = 0

async function fetchLiveMarketPrices(symbols: string[]): Promise<Record<string, number>> {
  const now = Date.now()
  if (now - _lastFetchTime < 5000 && Object.keys(_livePriceCache).length > 0) {
    return _livePriceCache
  }

  const apiKey = Deno.env.get('TWELVE_DATA_API_KEY')
  if (!apiKey) {
    console.warn('TWELVE_DATA_API_KEY not set - using fallback prices')
    return {}
  }

  try {
    const tdSymbols = symbols.map(s => TWELVE_DATA_MAP[s]).filter(Boolean)
    if (tdSymbols.length === 0) return {}

    const url = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(tdSymbols.join(','))}&apikey=${apiKey}`
    const response = await fetch(url)
    if (!response.ok) return {}

    const data = await response.json()
    const prices: Record<string, number> = {}

    if (tdSymbols.length === 1) {
      if (data.price) {
        const ourSymbol = symbols.find(s => TWELVE_DATA_MAP[s] === tdSymbols[0])
        if (ourSymbol) prices[ourSymbol] = parseFloat(data.price)
      }
    } else {
      for (const [tdSymbol, value] of Object.entries(data)) {
        const ourSymbol = Object.entries(TWELVE_DATA_MAP).find(([_, v]) => v === tdSymbol)?.[0]
        if (ourSymbol && (value as any)?.price) {
          prices[ourSymbol] = parseFloat((value as any).price)
        }
      }
    }

    if (Object.keys(prices).length > 0) {
      _livePriceCache = prices
      _lastFetchTime = now
    }
    return prices
  } catch (err) {
    console.error('Live price fetch failed:', err)
    return {}
  }
}

// Get BASE_PRICES dynamically (live or fallback)
let BASE_PRICES: Record<string, number> = { ...FALLBACK_PRICES }

// ============================================================
// TECHNICAL INDICATORS
// ============================================================

interface PriceData {
  open: number
  high: number
  low: number
  close: number
  timestamp: number
}

interface IndicatorResult {
  sma_short: number
  sma_long: number
  ema_short: number
  ema_long: number
  rsi: number
  macd: number
  macd_signal: number
  macd_histogram: number
  atr: number
  stochastic_k: number
  stochastic_d: number
  bollinger_upper: number
  bollinger_lower: number
  bollinger_middle: number
  trend_strength: number
  volatility_state: 'low' | 'normal' | 'high'
}

// Generate simulated historical price data
function generatePriceHistory(symbol: string, periods: number = 50): PriceData[] {
  const basePrice = BASE_PRICES[symbol] || 100
  const volatility = VOLATILITY_PROFILE[symbol] || 1.0
  const history: PriceData[] = []
  
  let currentPrice = basePrice * (0.98 + Math.random() * 0.04) // Start within 2% of base
  const now = Date.now()
  
  for (let i = periods - 1; i >= 0; i--) {
    const change = (Math.random() - 0.5) * 0.002 * volatility * currentPrice
    const open = currentPrice
    const close = currentPrice + change
    const high = Math.max(open, close) + Math.abs(change) * (0.2 + Math.random() * 0.3)
    const low = Math.min(open, close) - Math.abs(change) * (0.2 + Math.random() * 0.3)
    
    history.push({
      open,
      high,
      low,
      close,
      timestamp: now - (i * 60000) // 1 minute candles
    })
    
    currentPrice = close
  }
  
  return history
}

// Simple Moving Average
function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0
  const slice = prices.slice(-period)
  return slice.reduce((a, b) => a + b, 0) / period
}

// Exponential Moving Average
function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0
  const multiplier = 2 / (period + 1)
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema
  }
  return ema
}

// Relative Strength Index
function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50
  
  let gains = 0
  let losses = 0
  
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1]
    if (change > 0) gains += change
    else losses += Math.abs(change)
  }
  
  const avgGain = gains / period
  const avgLoss = losses / period
  
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - (100 / (1 + rs))
}

// MACD (Moving Average Convergence Divergence)
function calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
  const ema12 = calculateEMA(prices, 12)
  const ema26 = calculateEMA(prices, 26)
  const macd = ema12 - ema26
  
  // Calculate signal line (9-period EMA of MACD)
  const macdHistory: number[] = []
  for (let i = 26; i <= prices.length; i++) {
    const slicedPrices = prices.slice(0, i)
    macdHistory.push(calculateEMA(slicedPrices, 12) - calculateEMA(slicedPrices, 26))
  }
  const signal = calculateEMA(macdHistory, 9)
  
  return {
    macd,
    signal,
    histogram: macd - signal
  }
}

// Average True Range (volatility indicator)
function calculateATR(history: PriceData[], period: number = 14): number {
  if (history.length < period + 1) return 0
  
  const trueRanges: number[] = []
  for (let i = 1; i < history.length; i++) {
    const high = history[i].high
    const low = history[i].low
    const prevClose = history[i - 1].close
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    )
    trueRanges.push(tr)
  }
  
  return trueRanges.slice(-period).reduce((a, b) => a + b, 0) / period
}

// Stochastic Oscillator
function calculateStochastic(history: PriceData[], period: number = 14): { k: number; d: number } {
  if (history.length < period) return { k: 50, d: 50 }
  
  const recent = history.slice(-period)
  const currentClose = history[history.length - 1].close
  const lowestLow = Math.min(...recent.map(p => p.low))
  const highestHigh = Math.max(...recent.map(p => p.high))
  
  const k = highestHigh === lowestLow ? 50 : ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100
  
  // Calculate %D (3-period SMA of %K)
  const kValues: number[] = []
  for (let i = period; i <= history.length; i++) {
    const slice = history.slice(i - period, i)
    const close = slice[slice.length - 1].close
    const low = Math.min(...slice.map(p => p.low))
    const high = Math.max(...slice.map(p => p.high))
    kValues.push(high === low ? 50 : ((close - low) / (high - low)) * 100)
  }
  
  const d = kValues.slice(-3).reduce((a, b) => a + b, 0) / 3
  
  return { k, d }
}

// Bollinger Bands
function calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2): { upper: number; middle: number; lower: number } {
  const middle = calculateSMA(prices, period)
  const slice = prices.slice(-period)
  
  const variance = slice.reduce((acc, price) => acc + Math.pow(price - middle, 2), 0) / period
  const std = Math.sqrt(variance)
  
  return {
    upper: middle + (std * stdDev),
    middle,
    lower: middle - (std * stdDev)
  }
}

// Calculate all indicators for a symbol
function calculateIndicators(symbol: string): IndicatorResult {
  const history = generatePriceHistory(symbol, 50)
  const closes = history.map(p => p.close)
  
  const sma_short = calculateSMA(closes, 9)
  const sma_long = calculateSMA(closes, 21)
  const ema_short = calculateEMA(closes, 12)
  const ema_long = calculateEMA(closes, 26)
  const rsi = calculateRSI(closes, 14)
  const macdResult = calculateMACD(closes)
  const atr = calculateATR(history, 14)
  const stochastic = calculateStochastic(history, 14)
  const bollinger = calculateBollingerBands(closes, 20, 2)
  
  // Calculate trend strength (0-100)
  const trendStrength = Math.abs(sma_short - sma_long) / sma_long * 1000
  
  // Determine volatility state
  const avgATR = atr / closes[closes.length - 1] * 100
  let volatilityState: 'low' | 'normal' | 'high' = 'normal'
  if (avgATR < 0.1) volatilityState = 'low'
  else if (avgATR > 0.3) volatilityState = 'high'
  
  return {
    sma_short,
    sma_long,
    ema_short,
    ema_long,
    rsi,
    macd: macdResult.macd,
    macd_signal: macdResult.signal,
    macd_histogram: macdResult.histogram,
    atr,
    stochastic_k: stochastic.k,
    stochastic_d: stochastic.d,
    bollinger_upper: bollinger.upper,
    bollinger_lower: bollinger.lower,
    bollinger_middle: bollinger.middle,
    trend_strength: Math.min(trendStrength, 100),
    volatility_state: volatilityState
  }
}

// ============================================================
// TRADING STRATEGIES
// ============================================================

interface StrategySignal {
  action: 'BUY' | 'SELL' | 'HOLD'
  confidence: number  // 0-100
  strategy: string
  reason: string
  recommended_tp: number
  recommended_sl: number | null
  entry_price: number
}

// Strategy 1: Moving Average Crossover (Trend-Following)
function strategyMACrossover(symbol: string, indicators: IndicatorResult, currentPrice: number): StrategySignal | null {
  const { sma_short, sma_long, atr, volatility_state, trend_strength } = indicators
  
  // Avoid sideways markets
  if (volatility_state === 'low' || trend_strength < 10) {
    return null
  }
  
  const crossoverStrength = Math.abs(sma_short - sma_long) / sma_long * 100
  
  // Bullish crossover: Short MA > Long MA
  if (sma_short > sma_long && crossoverStrength > 0.05) {
    return {
      action: 'BUY',
      confidence: Math.min(40 + trend_strength * 0.5, 85),
      strategy: 'MA_CROSSOVER',
      reason: `SMA(9) crossed above SMA(21). Trend strength: ${trend_strength.toFixed(1)}%`,
      recommended_tp: HIGH_LIQUIDITY_PAIRS.includes(symbol) ? 5 : 7,
      recommended_sl: volatility_state === 'high' ? atr * 2 : null,
      entry_price: currentPrice
    }
  }
  
  // Bearish crossover: Short MA < Long MA
  if (sma_short < sma_long && crossoverStrength > 0.05) {
    return {
      action: 'SELL',
      confidence: Math.min(40 + trend_strength * 0.5, 85),
      strategy: 'MA_CROSSOVER',
      reason: `SMA(9) crossed below SMA(21). Trend strength: ${trend_strength.toFixed(1)}%`,
      recommended_tp: HIGH_LIQUIDITY_PAIRS.includes(symbol) ? 5 : 7,
      recommended_sl: volatility_state === 'high' ? atr * 2 : null,
      entry_price: currentPrice
    }
  }
  
  return null
}

// Strategy 2: RSI + MACD Momentum
function strategyMomentum(symbol: string, indicators: IndicatorResult, currentPrice: number): StrategySignal | null {
  const { rsi, macd_histogram, stochastic_k, stochastic_d, volatility_state } = indicators
  
  // Strong oversold + momentum building (BUY signal)
  if (rsi < 35 && macd_histogram > 0 && stochastic_k > stochastic_d) {
    const confidence = Math.min(50 + (35 - rsi), 90)
    return {
      action: 'BUY',
      confidence,
      strategy: 'MOMENTUM',
      reason: `RSI oversold (${rsi.toFixed(1)}), MACD histogram positive, Stochastic crossing up`,
      recommended_tp: confidence > 70 ? 8 : 5,
      recommended_sl: volatility_state === 'high' ? 5 : null,
      entry_price: currentPrice
    }
  }
  
  // Strong overbought + momentum weakening (SELL signal)
  if (rsi > 65 && macd_histogram < 0 && stochastic_k < stochastic_d) {
    const confidence = Math.min(50 + (rsi - 65), 90)
    return {
      action: 'SELL',
      confidence,
      strategy: 'MOMENTUM',
      reason: `RSI overbought (${rsi.toFixed(1)}), MACD histogram negative, Stochastic crossing down`,
      recommended_tp: confidence > 70 ? 8 : 5,
      recommended_sl: volatility_state === 'high' ? 5 : null,
      entry_price: currentPrice
    }
  }
  
  return null
}

// Strategy 3: Bollinger Band Breakout
function strategyBreakout(symbol: string, indicators: IndicatorResult, currentPrice: number): StrategySignal | null {
  const { bollinger_upper, bollinger_lower, bollinger_middle, atr, volatility_state, rsi } = indicators
  
  // Only trade breakouts in normal/high volatility
  if (volatility_state === 'low') return null
  
  // Breakout above upper band with momentum confirmation
  if (currentPrice > bollinger_upper && rsi > 55 && rsi < 80) {
    return {
      action: 'BUY',
      confidence: 65 + Math.min((currentPrice - bollinger_upper) / bollinger_upper * 1000, 20),
      strategy: 'BREAKOUT',
      reason: `Price broke above Bollinger upper band. RSI: ${rsi.toFixed(1)}`,
      recommended_tp: symbol === 'XAUUSD' ? 15 : 10,
      recommended_sl: volatility_state === 'high' ? atr * 1.5 : 5,
      entry_price: currentPrice
    }
  }
  
  // Breakout below lower band with momentum confirmation
  if (currentPrice < bollinger_lower && rsi < 45 && rsi > 20) {
    return {
      action: 'SELL',
      confidence: 65 + Math.min((bollinger_lower - currentPrice) / bollinger_lower * 1000, 20),
      strategy: 'BREAKOUT',
      reason: `Price broke below Bollinger lower band. RSI: ${rsi.toFixed(1)}`,
      recommended_tp: symbol === 'XAUUSD' ? 15 : 10,
      recommended_sl: volatility_state === 'high' ? atr * 1.5 : 5,
      entry_price: currentPrice
    }
  }
  
  return null
}

// Strategy 4: Scalping (Small TP, High Frequency)
function strategyScalping(symbol: string, indicators: IndicatorResult, currentPrice: number): StrategySignal | null {
  // Only scalp high-liquidity pairs
  if (!HIGH_LIQUIDITY_PAIRS.includes(symbol)) return null
  
  const { rsi, stochastic_k, stochastic_d, volatility_state, macd_histogram } = indicators
  
  // Avoid high volatility for scalping (spread/slippage issues)
  if (volatility_state === 'high') return null
  
  // Quick oversold bounce
  if (rsi < 40 && stochastic_k < 30 && stochastic_k > stochastic_d && macd_histogram > -0.01) {
    return {
      action: 'BUY',
      confidence: 55 + (40 - rsi) * 0.5,
      strategy: 'SCALPING',
      reason: `Quick oversold bounce setup. RSI: ${rsi.toFixed(1)}, Stoch: ${stochastic_k.toFixed(1)}`,
      recommended_tp: 3, // Small TP for scalping
      recommended_sl: null, // No SL for quick wins
      entry_price: currentPrice
    }
  }
  
  // Quick overbought reversal
  if (rsi > 60 && stochastic_k > 70 && stochastic_k < stochastic_d && macd_histogram < 0.01) {
    return {
      action: 'SELL',
      confidence: 55 + (rsi - 60) * 0.5,
      strategy: 'SCALPING',
      reason: `Quick overbought reversal setup. RSI: ${rsi.toFixed(1)}, Stoch: ${stochastic_k.toFixed(1)}`,
      recommended_tp: 3, // Small TP for scalping
      recommended_sl: null,
      entry_price: currentPrice
    }
  }
  
  return null
}

// Strategy 5: Combined TP with Dynamic SL
function strategyCombined(symbol: string, indicators: IndicatorResult, currentPrice: number): StrategySignal | null {
  const { trend_strength, rsi, macd_histogram, ema_short, ema_long, atr, volatility_state } = indicators
  
  // Need strong trend + momentum confirmation
  if (trend_strength < 20) return null
  
  const trendUp = ema_short > ema_long
  const momentumConfirmed = trendUp ? macd_histogram > 0 : macd_histogram < 0
  const rsiConfirmed = trendUp ? (rsi > 45 && rsi < 70) : (rsi < 55 && rsi > 30)
  
  if (!momentumConfirmed || !rsiConfirmed) return null
  
  const confidence = Math.min(60 + trend_strength * 0.3 + Math.abs(50 - rsi) * 0.2, 95)
  
  // Calculate dynamic SL based on volatility
  let dynamicSL: number | null = null
  if (volatility_state === 'high') {
    dynamicSL = Math.max(5, atr * 2)
  } else if (volatility_state === 'normal' && confidence < 75) {
    dynamicSL = 5
  }
  
  return {
    action: trendUp ? 'BUY' : 'SELL',
    confidence,
    strategy: 'COMBINED',
    reason: `Trend-following + momentum confirmed. Trend: ${trend_strength.toFixed(1)}%, RSI: ${rsi.toFixed(1)}, MACD: ${macd_histogram > 0 ? '+' : ''}${macd_histogram.toFixed(4)}`,
    recommended_tp: 10,
    recommended_sl: dynamicSL,
    entry_price: currentPrice
  }
}

// Main signal generator - evaluates all strategies
function generateTradingSignal(symbol: string): StrategySignal | null {
  const currentPrice = BASE_PRICES[symbol] * (0.998 + Math.random() * 0.004)
  const indicators = calculateIndicators(symbol)
  
  // Collect all strategy signals
  const signals: (StrategySignal | null)[] = [
    strategyMACrossover(symbol, indicators, currentPrice),
    strategyMomentum(symbol, indicators, currentPrice),
    strategyBreakout(symbol, indicators, currentPrice),
    strategyScalping(symbol, indicators, currentPrice),
    strategyCombined(symbol, indicators, currentPrice)
  ]
  
  // Filter valid signals and sort by confidence
  const validSignals = signals.filter(s => s !== null) as StrategySignal[]
  
  if (validSignals.length === 0) return null
  
  // Return highest confidence signal
  validSignals.sort((a, b) => b.confidence - a.confidence)
  return validSignals[0]
}

// ============================================================
// EDGE FUNCTION HANDLER
// ============================================================

interface TradingSignal {
  symbol: string
  action: 'BUY' | 'SELL'
  entry_price: number
  lot_size?: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { action, signal, user_id, symbol } = await req.json()

    console.log('Trading bot request:', { action, symbol, user_id })

    // Fetch live prices and update BASE_PRICES before any analysis
    const livePrices = await fetchLiveMarketPrices(ALLOWED_INSTRUMENTS)
    if (Object.keys(livePrices).length > 0) {
      BASE_PRICES = { ...FALLBACK_PRICES, ...livePrices }
      console.log('Using live market prices:', livePrices)
    } else {
      console.log('Using fallback prices')
    }

    if (action === 'analyze_market') {
      const targetSymbol = symbol || ALLOWED_INSTRUMENTS[Math.floor(Math.random() * ALLOWED_INSTRUMENTS.length)]
      
      if (!ALLOWED_INSTRUMENTS.includes(targetSymbol)) {
        return new Response(
          JSON.stringify({ error: `Invalid instrument: ${targetSymbol}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      const tradingSignal = generateTradingSignal(targetSymbol)
      
      if (!tradingSignal) {
        return new Response(
          JSON.stringify({ 
            signal: null, 
            message: 'No trading opportunity found. Market conditions do not meet strategy criteria.',
            symbol: targetSymbol 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      return new Response(
        JSON.stringify({
          signal: {
            symbol: targetSymbol,
            action: tradingSignal.action,
            entry_price: Number(tradingSignal.entry_price.toFixed(5)),
            lot_size: 0.01
          },
          strategy: tradingSignal.strategy,
          confidence: tradingSignal.confidence,
          reason: tradingSignal.reason,
          recommended_tp: tradingSignal.recommended_tp,
          recommended_sl: tradingSignal.recommended_sl,
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Scan all instruments for signals
    if (action === 'scan_all') {
      const signals: Array<{
        symbol: string
        signal: StrategySignal
      }> = []
      
      for (const sym of ALLOWED_INSTRUMENTS) {
        const sig = generateTradingSignal(sym)
        if (sig && sig.confidence >= 60) {
          signals.push({ symbol: sym, signal: sig })
        }
      }
      
      signals.sort((a, b) => b.signal.confidence - a.signal.confidence)
      
      return new Response(
        JSON.stringify({
          signals: signals.map(s => ({
            symbol: s.symbol,
            action: s.signal.action,
            strategy: s.signal.strategy,
            confidence: s.signal.confidence,
            reason: s.signal.reason,
            entry_price: Number(s.signal.entry_price.toFixed(5)),
            recommended_tp: s.signal.recommended_tp,
            recommended_sl: s.signal.recommended_sl
          })),
          total_opportunities: signals.length,
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Process trading signal (execute trades for all eligible users)
    if (action === 'process_signal') {
      const tradingSignal = signal as TradingSignal

      if (!ALLOWED_INSTRUMENTS.includes(tradingSignal.symbol)) {
        return new Response(
          JSON.stringify({ error: `Invalid instrument: ${tradingSignal.symbol}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get all active subscribers with trading enabled
      const { data: activeUsers, error: usersError } = await supabase
        .from('subscriptions')
        .select('user_id, status, expiry_date')
        .eq('status', 'active')
        .gt('expiry_date', new Date().toISOString())

      if (usersError) {
        console.error('Error fetching active users:', usersError)
        throw usersError
      }

      console.log(`Found ${activeUsers?.length || 0} active subscribers`)

      const tradesCreated: string[] = []
      const errors: string[] = []

      for (const subscription of activeUsers || []) {
        try {
          // Get user's trading config
          const { data: config } = await supabase
            .from('trading_configs')
            .select('*')
            .eq('user_id', subscription.user_id)
            .maybeSingle()

          if (!config || !config.is_trading_enabled) {
            continue
          }

          // Get MT5 connection
          const { data: mt5 } = await supabase
            .from('mt5_connections')
            .select('*')
            .eq('user_id', subscription.user_id)
            .maybeSingle()

          if (!mt5 || !mt5.is_connected) {
            continue
          }

          // Create trade record
          const lotSize = tradingSignal.lot_size || 0.01
          const { data: trade, error: tradeError } = await supabase
            .from('trades')
            .insert({
              user_id: subscription.user_id,
              symbol: tradingSignal.symbol,
              trade_type: tradingSignal.action,
              entry_price: tradingSignal.entry_price,
              lot_size: lotSize,
              take_profit_usd: config.take_profit_usd,
              stop_loss_usd: config.stop_loss_usd,
              status: 'open',
              opened_at: new Date().toISOString()
            })
            .select()
            .single()

          if (tradeError) {
            errors.push(`User ${subscription.user_id}: ${tradeError.message}`)
            continue
          }

          tradesCreated.push(trade.id)
          console.log(`Trade created for user ${subscription.user_id}:`, trade.id)

        } catch (err) {
          errors.push(`User ${subscription.user_id}: ${String(err)}`)
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          trades_created: tradesCreated.length,
          trade_ids: tradesCreated,
          errors: errors.length > 0 ? errors : undefined
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get strategy info
    if (action === 'get_strategies') {
      return new Response(
        JSON.stringify({
          strategies: [
            {
              name: 'MA_CROSSOVER',
              description: 'Trend-Following: SMA(9) / SMA(21) crossover with ATR filter',
              best_for: 'Trending markets',
              tp_range: '5-7 USD'
            },
            {
              name: 'MOMENTUM',
              description: 'RSI + MACD + Stochastic momentum confirmation',
              best_for: 'Overbought/oversold reversals',
              tp_range: '5-8 USD'
            },
            {
              name: 'BREAKOUT',
              description: 'Bollinger Band breakout with RSI confirmation',
              best_for: 'High volatility (XAU/USD, GBP/JPY)',
              tp_range: '10-15 USD'
            },
            {
              name: 'SCALPING',
              description: 'Quick entries on high-liquidity pairs',
              best_for: 'USD/JPY, EUR/JPY, XAU/USD',
              tp_range: '3 USD'
            },
            {
              name: 'COMBINED',
              description: 'Trend + momentum with dynamic stop-loss',
              best_for: 'Best odds approach (TP > SL)',
              tp_range: '10 USD with optional SL'
            }
          ]
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get indicators for a symbol
    if (action === 'get_indicators') {
      const targetSymbol = symbol || 'USDJPY'
      
      if (!ALLOWED_INSTRUMENTS.includes(targetSymbol)) {
        return new Response(
          JSON.stringify({ error: `Invalid instrument: ${targetSymbol}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      const indicators = calculateIndicators(targetSymbol)
      const currentPrice = BASE_PRICES[targetSymbol] * (0.998 + Math.random() * 0.004)
      
      return new Response(
        JSON.stringify({
          symbol: targetSymbol,
          current_price: Number(currentPrice.toFixed(5)),
          indicators: {
            sma_short: Number(indicators.sma_short.toFixed(5)),
            sma_long: Number(indicators.sma_long.toFixed(5)),
            rsi: Number(indicators.rsi.toFixed(2)),
            macd: Number(indicators.macd.toFixed(5)),
            macd_histogram: Number(indicators.macd_histogram.toFixed(5)),
            atr: Number(indicators.atr.toFixed(5)),
            stochastic_k: Number(indicators.stochastic_k.toFixed(2)),
            stochastic_d: Number(indicators.stochastic_d.toFixed(2)),
            bollinger_upper: Number(indicators.bollinger_upper.toFixed(5)),
            bollinger_lower: Number(indicators.bollinger_lower.toFixed(5)),
            trend_strength: Number(indicators.trend_strength.toFixed(2)),
            volatility_state: indicators.volatility_state
          },
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Legacy simulate market (for backwards compatibility)
    if (action === 'simulate_market') {
      const targetSymbol = symbol || ALLOWED_INSTRUMENTS[Math.floor(Math.random() * ALLOWED_INSTRUMENTS.length)]
      const tradingSignal = generateTradingSignal(targetSymbol)
      
      if (!tradingSignal) {
        // Return a random signal if no strategy triggered
        const randomAction = Math.random() > 0.5 ? 'BUY' : 'SELL'
        const basePrice = BASE_PRICES[targetSymbol] || 100
        const entryPrice = basePrice * (0.998 + Math.random() * 0.004)
        
        return new Response(
          JSON.stringify({
            signal: {
              symbol: targetSymbol,
              action: randomAction,
              entry_price: Number(entryPrice.toFixed(5)),
              lot_size: 0.01
            },
            strategy: 'RANDOM',
            confidence: 30,
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      return new Response(
        JSON.stringify({
          signal: {
            symbol: targetSymbol,
            action: tradingSignal.action,
            entry_price: Number(tradingSignal.entry_price.toFixed(5)),
            lot_size: 0.01
          },
          strategy: tradingSignal.strategy,
          confidence: tradingSignal.confidence,
          reason: tradingSignal.reason,
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use: analyze_market, scan_all, process_signal, get_strategies, get_indicators, simulate_market' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Trading bot error:', error)
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
