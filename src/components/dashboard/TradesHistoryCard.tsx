import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, TrendingUp, TrendingDown, Clock, Radio } from 'lucide-react';
import { format } from 'date-fns';

interface Trade {
  id: string;
  symbol: string;
  trade_type: string;
  entry_price: number;
  exit_price: number | null;
  profit_loss: number | null;
  status: string;
  opened_at: string;
  closed_at: string | null;
}

interface TradesHistoryCardProps {
  userId: string;
}

export default function TradesHistoryCard({ userId }: TradesHistoryCardProps) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRealtime, setIsRealtime] = useState(false);

  useEffect(() => {
    if (!userId) return;

    fetchTrades();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('trades-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trades',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Realtime trade update:', payload);
          
          if (payload.eventType === 'INSERT') {
            setTrades(prev => [payload.new as Trade, ...prev].slice(0, 10));
          } else if (payload.eventType === 'UPDATE') {
            setTrades(prev => prev.map(t => 
              t.id === (payload.new as Trade).id ? payload.new as Trade : t
            ));
          } else if (payload.eventType === 'DELETE') {
            setTrades(prev => prev.filter(t => t.id !== (payload.old as Trade).id));
          }
        }
      )
      .subscribe((status) => {
        setIsRealtime(status === 'SUBSCRIBED');
        console.log('Realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchTrades = async () => {
    try {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', userId)
        .order('opened_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setTrades((data as Trade[]) || []);
    } catch (error) {
      console.error('Error fetching trades:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalProfit = trades
    .filter((t) => t.profit_loss !== null)
    .reduce((sum, t) => sum + (t.profit_loss || 0), 0);

  return (
    <Card className="card-trading border-glow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Trade History
              {isRealtime && (
                <span className="flex items-center gap-1 text-xs font-normal text-success">
                  <Radio className="h-3 w-3 animate-pulse" />
                  LIVE
                </span>
              )}
            </CardTitle>
            <CardDescription>Your recent trading activity</CardDescription>
          </div>
          <div className={`text-lg font-mono font-bold ${totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
            {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)} USD
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-secondary/50 animate-pulse" />
            ))}
          </div>
        ) : trades.length === 0 ? (
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No trades yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your trading history will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {trades.map((trade) => (
              <div
                key={trade.id}
                className="p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold">{trade.symbol}</span>
                    <Badge variant={trade.trade_type === 'BUY' ? 'default' : 'secondary'}>
                      {trade.trade_type}
                    </Badge>
                    <Badge variant={trade.status === 'open' ? 'outline' : 'secondary'}>
                      {trade.status}
                    </Badge>
                  </div>
                  {trade.profit_loss !== null && (
                    <span className={`font-mono font-bold flex items-center gap-1 ${
                      trade.profit_loss >= 0 ? 'text-success' : 'text-destructive'
                    }`}>
                      {trade.profit_loss >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {trade.profit_loss >= 0 ? '+' : ''}{trade.profit_loss.toFixed(2)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span>Entry: {trade.entry_price.toFixed(5)}</span>
                    {trade.exit_price && (
                      <span>Exit: {trade.exit_price.toFixed(5)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(trade.opened_at), 'MMM dd, HH:mm')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
