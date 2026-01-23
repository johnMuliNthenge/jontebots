import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Allowed trading instruments
const ALLOWED_INSTRUMENTS = [
  'USDJPY', 'CADJPY', 'GBPJPY', 'EURJPY', 'AUDJPY', 'CHFJPY', 'XAUUSD'
]

interface TradingSignal {
  symbol: string
  action: 'BUY' | 'SELL'
  entry_price: number
  lot_size?: number
}

interface UserTradingConfig {
  user_id: string
  take_profit_usd: number
  stop_loss_usd: number | null
  is_trading_enabled: boolean
}

interface MT5Connection {
  user_id: string
  mt5_login: string
  mt5_server: string
  trading_mode: 'demo' | 'live'
  is_connected: boolean
  account_balance: number | null
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { action, signal, user_id } = await req.json()

    console.log('Trading bot request:', { action, signal, user_id })

    // Process trading signal
    if (action === 'process_signal') {
      const tradingSignal = signal as TradingSignal

      // Validate instrument
      if (!ALLOWED_INSTRUMENTS.includes(tradingSignal.symbol)) {
        return new Response(
          JSON.stringify({ error: `Invalid instrument: ${tradingSignal.symbol}. Allowed: ${ALLOWED_INSTRUMENTS.join(', ')}` }),
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
          const { data: config, error: configError } = await supabase
            .from('trading_configs')
            .select('*')
            .eq('user_id', subscription.user_id)
            .single()

          if (configError || !config) {
            console.log(`No trading config for user ${subscription.user_id}`)
            continue
          }

          // Skip if trading is disabled
          if (!config.is_trading_enabled) {
            console.log(`Trading disabled for user ${subscription.user_id}`)
            continue
          }

          // Get MT5 connection
          const { data: mt5, error: mt5Error } = await supabase
            .from('mt5_connections')
            .select('*')
            .eq('user_id', subscription.user_id)
            .single()

          if (mt5Error || !mt5 || !mt5.is_connected) {
            console.log(`No active MT5 connection for user ${subscription.user_id}`)
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
            console.error(`Error creating trade for user ${subscription.user_id}:`, tradeError)
            errors.push(`User ${subscription.user_id}: ${tradeError.message}`)
            continue
          }

          tradesCreated.push(trade.id)
          console.log(`Trade created for user ${subscription.user_id}:`, trade.id)

        } catch (err) {
          console.error(`Error processing user ${subscription.user_id}:`, err)
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

    // Close a trade
    if (action === 'close_trade') {
      const { trade_id, exit_price, profit_loss } = await req.json()

      const { data: trade, error: tradeError } = await supabase
        .from('trades')
        .update({
          status: 'closed',
          exit_price: exit_price,
          profit_loss: profit_loss,
          closed_at: new Date().toISOString()
        })
        .eq('id', trade_id)
        .select()
        .single()

      if (tradeError) {
        throw tradeError
      }

      // Update account balance
      const { data: mt5, error: mt5Error } = await supabase
        .from('mt5_connections')
        .select('account_balance')
        .eq('user_id', trade.user_id)
        .single()

      if (!mt5Error && mt5) {
        const newBalance = (mt5.account_balance || 0) + profit_loss
        await supabase
          .from('mt5_connections')
          .update({ account_balance: newBalance })
          .eq('user_id', trade.user_id)
      }

      return new Response(
        JSON.stringify({ success: true, trade }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get open trades for a user
    if (action === 'get_open_trades') {
      // Validate subscription status first
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('status, expiry_date')
        .eq('user_id', user_id)
        .single()

      if (subError || !subscription || subscription.status !== 'active' || new Date(subscription.expiry_date) <= new Date()) {
        return new Response(
          JSON.stringify({ error: 'User subscription is not active' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: trades, error: tradesError } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user_id)
        .eq('status', 'open')

      if (tradesError) throw tradesError

      return new Response(
        JSON.stringify({ trades }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Simulate market check (for demo purposes)
    if (action === 'simulate_market') {
      // Generate random signals for testing
      const randomSymbol = ALLOWED_INSTRUMENTS[Math.floor(Math.random() * ALLOWED_INSTRUMENTS.length)]
      const randomAction = Math.random() > 0.5 ? 'BUY' : 'SELL'
      
      // Simulated prices
      const basePrices: Record<string, number> = {
        'USDJPY': 149.50,
        'CADJPY': 109.80,
        'GBPJPY': 188.90,
        'EURJPY': 162.30,
        'AUDJPY': 97.20,
        'CHFJPY': 168.40,
        'XAUUSD': 2045.50
      }

      const basePrice = basePrices[randomSymbol] || 100
      const randomVariation = (Math.random() - 0.5) * 0.01 * basePrice
      const entryPrice = basePrice + randomVariation

      return new Response(
        JSON.stringify({
          signal: {
            symbol: randomSymbol,
            action: randomAction,
            entry_price: Number(entryPrice.toFixed(5)),
            lot_size: 0.01
          },
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
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
