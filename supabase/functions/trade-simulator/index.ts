import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Fallback prices (used only if live API fails)
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
const SYMBOL_MAP: Record<string, string> = {
  'USDJPY': 'USD/JPY',
  'CADJPY': 'CAD/JPY',
  'GBPJPY': 'GBP/JPY',
  'EURJPY': 'EUR/JPY',
  'AUDJPY': 'AUD/JPY',
  'CHFJPY': 'CHF/JPY',
  'XAUUSD': 'XAU/USD'
}

// Pip values for calculating profit/loss
const PIP_VALUES: Record<string, number> = {
  'USDJPY': 0.01,
  'CADJPY': 0.01,
  'GBPJPY': 0.01,
  'EURJPY': 0.01,
  'AUDJPY': 0.01,
  'CHFJPY': 0.01,
  'XAUUSD': 0.01
}

// Cache for live prices (refreshed each tick)
let livePriceCache: Record<string, number> = {}
let lastPriceFetchTime = 0
const PRICE_CACHE_TTL_MS = 5000 // 5 seconds

async function fetchLivePrices(symbols: string[]): Promise<Record<string, number>> {
  const now = Date.now()
  
  // Return cache if still fresh
  if (now - lastPriceFetchTime < PRICE_CACHE_TTL_MS && Object.keys(livePriceCache).length > 0) {
    console.log('Using cached live prices')
    return livePriceCache
  }

  const apiKey = Deno.env.get('TWELVE_DATA_API_KEY')
  if (!apiKey) {
    console.warn('TWELVE_DATA_API_KEY not set - using fallback prices')
    return {}
  }

  try {
    // Map symbols to Twelve Data format
    const tdSymbols = symbols
      .map(s => SYMBOL_MAP[s])
      .filter(Boolean)
    
    if (tdSymbols.length === 0) return {}

    const symbolParam = tdSymbols.join(',')
    const url = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(symbolParam)}&apikey=${apiKey}`
    
    console.log(`Fetching live prices for: ${symbolParam}`)
    
    const response = await fetch(url)
    if (!response.ok) {
      console.error(`Twelve Data API error: ${response.status}`)
      return {}
    }

    const data = await response.json()
    const prices: Record<string, number> = {}

    // If single symbol, response is { price: "..." }
    // If multiple symbols, response is { "USD/JPY": { price: "..." }, ... }
    if (tdSymbols.length === 1) {
      if (data.price) {
        const ourSymbol = symbols.find(s => SYMBOL_MAP[s] === tdSymbols[0])
        if (ourSymbol) {
          prices[ourSymbol] = parseFloat(data.price)
        }
      }
    } else {
      for (const [tdSymbol, value] of Object.entries(data)) {
        const ourSymbol = Object.entries(SYMBOL_MAP).find(([_, v]) => v === tdSymbol)?.[0]
        if (ourSymbol && (value as any)?.price) {
          prices[ourSymbol] = parseFloat((value as any).price)
        }
      }
    }

    if (Object.keys(prices).length > 0) {
      livePriceCache = prices
      lastPriceFetchTime = now
      console.log(`Live prices fetched:`, prices)
    }

    return prices
  } catch (err) {
    console.error('Failed to fetch live prices:', err)
    return {}
  }
}

function getPrice(symbol: string, livePrices: Record<string, number>): number {
  if (livePrices[symbol]) return livePrices[symbol]
  return FALLBACK_PRICES[symbol] || 0
}

interface OpenTrade {
  id: string
  user_id: string
  symbol: string
  trade_type: string
  entry_price: number
  lot_size: number
  take_profit_usd: number
  stop_loss_usd: number | null
  opened_at: string
}

function simulatePrice(symbol: string, basePrice: number): number {
  // Simulate price movement with random walk
  const volatility = symbol === 'XAUUSD' ? 0.002 : 0.001 // Gold is more volatile
  const randomChange = (Math.random() - 0.5) * 2 * volatility * basePrice
  return Number((basePrice + randomChange).toFixed(5))
}

function calculateProfitLoss(
  trade: OpenTrade,
  currentPrice: number
): number {
  const pipValue = PIP_VALUES[trade.symbol] || 0.01
  const priceDiff = trade.trade_type === 'BUY' 
    ? currentPrice - trade.entry_price 
    : trade.entry_price - currentPrice
  
  // Calculate profit in USD
  // For JPY pairs: profit = (price_diff / 0.01) * lot_size * 100
  // For XAUUSD: profit = price_diff * lot_size * 100
  let profitLoss: number
  
  if (trade.symbol === 'XAUUSD') {
    profitLoss = priceDiff * trade.lot_size * 100
  } else {
    // JPY pairs
    profitLoss = (priceDiff / pipValue) * trade.lot_size * 0.1
  }
  
  return Number(profitLoss.toFixed(2))
}

function shouldCloseTrade(
  trade: OpenTrade,
  currentProfitLoss: number
): { shouldClose: boolean; reason: 'TP' | 'SL' | null } {
  // Check Take Profit
  if (currentProfitLoss >= trade.take_profit_usd) {
    return { shouldClose: true, reason: 'TP' }
  }
  
  // Check Stop Loss (if set)
  if (trade.stop_loss_usd !== null && currentProfitLoss <= -trade.stop_loss_usd) {
    return { shouldClose: true, reason: 'SL' }
  }
  
  return { shouldClose: false, reason: null }
}

// Helper function to delay execution
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// deno-lint-ignore no-explicit-any
async function runSingleTick(supabase: any): Promise<{
  processed: number
  closed: number
  closedTrades: { id: string; reason: string; profit_loss: number }[]
  errors: string[]
  current_prices: Record<string, number>
}> {
  // Get all open trades
  const { data: openTrades, error: tradesError } = await supabase
    .from('trades')
    .select('*')
    .eq('status', 'open')

  if (tradesError) {
    console.error('Error fetching open trades:', tradesError)
    throw tradesError
  }

  console.log(`Processing ${openTrades?.length || 0} open trades`)

  const results = {
    processed: 0,
    closed: 0,
    closedTrades: [] as { id: string; reason: string; profit_loss: number }[],
    errors: [] as string[],
    current_prices: {} as Record<string, number>
  }

  // Track simulated prices for this tick
  const currentPrices: Record<string, number> = {}

  for (const trade of openTrades || []) {
    results.processed++

    try {
      // Validate user subscription is still active
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('status, expiry_date')
        .eq('user_id', trade.user_id)
        .maybeSingle()

      const isActive = subscription?.status === 'active' && 
        new Date(subscription.expiry_date) > new Date()

      // If user subscription is not active, close the trade immediately
      if (!isActive) {
        console.log(`Closing trade ${trade.id} - user subscription inactive`)
        
        // Use last known price for closure
        const exitPrice = currentPrices[trade.symbol] || 
          simulatePrice(trade.symbol, BASE_PRICES[trade.symbol] || trade.entry_price)
        
        const profitLoss = calculateProfitLoss(trade as OpenTrade, exitPrice)

        await closeTrade(supabase, trade.id, trade.user_id, exitPrice, profitLoss)
        
        results.closed++
        results.closedTrades.push({ 
          id: trade.id, 
          reason: 'SUBSCRIPTION_INACTIVE', 
          profit_loss: profitLoss 
        })
        continue
      }

      // Simulate current price
      if (!currentPrices[trade.symbol]) {
        currentPrices[trade.symbol] = simulatePrice(
          trade.symbol, 
          BASE_PRICES[trade.symbol] || trade.entry_price
        )
      }
      const currentPrice = currentPrices[trade.symbol]

      // Calculate current P/L
      const currentProfitLoss = calculateProfitLoss(trade as OpenTrade, currentPrice)

      // Check if TP or SL hit
      const { shouldClose, reason } = shouldCloseTrade(trade as OpenTrade, currentProfitLoss)

      if (shouldClose && reason) {
        console.log(`Closing trade ${trade.id} - ${reason} hit at ${currentProfitLoss} USD`)

        await closeTrade(supabase, trade.id, trade.user_id, currentPrice, currentProfitLoss)

        results.closed++
        results.closedTrades.push({ 
          id: trade.id, 
          reason, 
          profit_loss: currentProfitLoss 
        })
      }

    } catch (err) {
      console.error(`Error processing trade ${trade.id}:`, err)
      results.errors.push(`Trade ${trade.id}: ${String(err)}`)
    }
  }

  results.current_prices = currentPrices
  return results
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

    const body = await req.json().catch(() => ({}))
    const { action, trade_id} = body

    console.log('Trade simulator request:', { action, trade_id })

    // Continuous tick mode - runs every 7 seconds for ~1 minute (called by cron)
    if (action === 'continuous_tick') {
      const TICK_INTERVAL_MS = 7000 // 7 seconds
      const TOTAL_DURATION_MS = 56000 // ~56 seconds (8 ticks, leaving buffer before next cron)
      const startTime = Date.now()
      
      let tickCount = 0
      const allResults = {
        ticks: [] as Array<{
          tick: number
          timestamp: string
          processed: number
          closed: number
          closedTrades: { id: string; reason: string; profit_loss: number }[]
        }>,
        totalProcessed: 0,
        totalClosed: 0
      }

      console.log(`Starting continuous tick mode: ${TICK_INTERVAL_MS}ms intervals for ${TOTAL_DURATION_MS}ms`)

      while (Date.now() - startTime < TOTAL_DURATION_MS) {
        tickCount++
        console.log(`Tick ${tickCount} at ${new Date().toISOString()}`)
        
        try {
          const tickResult = await runSingleTick(supabase)
          
          allResults.ticks.push({
            tick: tickCount,
            timestamp: new Date().toISOString(),
            processed: tickResult.processed,
            closed: tickResult.closed,
            closedTrades: tickResult.closedTrades
          })
          
          allResults.totalProcessed += tickResult.processed
          allResults.totalClosed += tickResult.closed

          console.log(`Tick ${tickCount} complete: processed=${tickResult.processed}, closed=${tickResult.closed}`)
        } catch (tickError) {
          console.error(`Tick ${tickCount} error:`, tickError)
        }

        // Wait for next tick interval (unless we've exceeded total duration)
        if (Date.now() - startTime + TICK_INTERVAL_MS < TOTAL_DURATION_MS) {
          await delay(TICK_INTERVAL_MS)
        } else {
          break
        }
      }

      console.log(`Continuous tick complete: ${tickCount} ticks, ${allResults.totalClosed} trades closed`)

      return new Response(
        JSON.stringify({
          success: true,
          mode: 'continuous',
          tick_interval_ms: TICK_INTERVAL_MS,
          total_ticks: tickCount,
          ...allResults
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Single tick mode - check all open trades once
    if (action === 'tick' || action === undefined) {
      const results = await runSingleTick(supabase)
      console.log('Single tick complete:', results)

      return new Response(
        JSON.stringify({
          success: true,
          mode: 'single',
          ...results
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Simulate a specific trade
    if (action === 'simulate_single' && trade_id) {
      const { data: trade, error: tradeError } = await supabase
        .from('trades')
        .select('*')
        .eq('id', trade_id)
        .maybeSingle()

      if (tradeError || !trade) {
        return new Response(
          JSON.stringify({ error: 'Trade not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const currentPrice = simulatePrice(trade.symbol, BASE_PRICES[trade.symbol] || trade.entry_price)
      const currentProfitLoss = calculateProfitLoss(trade as OpenTrade, currentPrice)
      const { shouldClose, reason } = shouldCloseTrade(trade as OpenTrade, currentProfitLoss)

      return new Response(
        JSON.stringify({
          trade_id: trade.id,
          symbol: trade.symbol,
          trade_type: trade.trade_type,
          entry_price: trade.entry_price,
          current_price: currentPrice,
          current_profit_loss: currentProfitLoss,
          take_profit_usd: trade.take_profit_usd,
          stop_loss_usd: trade.stop_loss_usd,
          would_close: shouldClose,
          close_reason: reason
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get current simulated prices
    if (action === 'get_prices') {
      const prices: Record<string, number> = {}
      for (const [symbol, basePrice] of Object.entries(BASE_PRICES)) {
        prices[symbol] = simulatePrice(symbol, basePrice)
      }

      return new Response(
        JSON.stringify({ prices, timestamp: new Date().toISOString() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Force close a trade at current simulated price
    if (action === 'force_close' && trade_id) {
      const { data: trade, error: tradeError } = await supabase
        .from('trades')
        .select('*')
        .eq('id', trade_id)
        .eq('status', 'open')
        .maybeSingle()

      if (tradeError || !trade) {
        return new Response(
          JSON.stringify({ error: 'Open trade not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const currentPrice = simulatePrice(trade.symbol, BASE_PRICES[trade.symbol] || trade.entry_price)
      const profitLoss = calculateProfitLoss(trade as OpenTrade, currentPrice)

      await closeTrade(supabase, trade.id, trade.user_id, currentPrice, profitLoss)

      return new Response(
        JSON.stringify({
          success: true,
          trade_id: trade.id,
          exit_price: currentPrice,
          profit_loss: profitLoss
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use: tick, simulate_single, get_prices, force_close' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Trade simulator error:', error)
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// deno-lint-ignore no-explicit-any
async function closeTrade(
  supabase: any,
  tradeId: string,
  userId: string,
  exitPrice: number,
  profitLoss: number
) {
  // Update trade record
  const { error: updateError } = await supabase
    .from('trades')
    .update({
      status: 'closed',
      exit_price: exitPrice,
      profit_loss: profitLoss,
      closed_at: new Date().toISOString()
    })
    .eq('id', tradeId)

  if (updateError) {
    throw updateError
  }

  // Update account balance
  const { data: mt5 } = await supabase
    .from('mt5_connections')
    .select('account_balance')
    .eq('user_id', userId)
    .maybeSingle()

  if (mt5) {
    const newBalance = ((mt5 as { account_balance: number | null }).account_balance || 0) + profitLoss
    await supabase
      .from('mt5_connections')
      .update({ account_balance: newBalance })
      .eq('user_id', userId)
  }

  console.log(`Trade ${tradeId} closed: exit=${exitPrice}, P/L=${profitLoss}`)
}
