import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  Play, 
  Pause, 
  RefreshCw, 
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  Timer
} from 'lucide-react';
import { toast } from 'sonner';

interface SimulatorResult {
  success: boolean;
  processed: number;
  closed: number;
  closedTrades: { id: string; reason: string; profit_loss: number }[];
  current_prices: Record<string, number>;
  errors?: string[];
}

export default function TradeSimulatorCard() {
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<SimulatorResult | null>(null);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [tickCount, setTickCount] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (running) {
      // Run immediately when started
      runSimulatorTick();
      
      // Then run every 60 seconds
      interval = setInterval(() => {
        runSimulatorTick();
      }, 60000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [running]);

  const runSimulatorTick = async () => {
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('trade-simulator', {
        body: { action: 'tick' }
      });

      if (response.error) throw response.error;

      setLastResult(response.data as SimulatorResult);
      setLastRun(new Date());
      setTickCount(prev => prev + 1);

      if (response.data?.closed > 0) {
        toast.success(`Closed ${response.data.closed} trade(s)`, {
          description: response.data.closedTrades.map((t: any) => 
            `${t.reason}: $${t.profit_loss.toFixed(2)}`
          ).join(', ')
        });
      }
    } catch (error: any) {
      console.error('Simulator error:', error);
      toast.error('Simulator tick failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleSimulator = () => {
    setRunning(!running);
    if (!running) {
      toast.success('Trade simulator started');
    } else {
      toast.info('Trade simulator stopped');
    }
  };

  return (
    <Card className="card-trading border-glow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Timer className={`h-5 w-5 ${running ? 'text-success animate-pulse' : 'text-muted-foreground'}`} />
              Trade Simulator
            </CardTitle>
            <CardDescription>
              Auto-closes trades when TP/SL is hit (every 7 seconds via cron)
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={running ? 'default' : 'secondary'} className={running ? 'bg-success' : ''}>
              {running ? 'Running' : 'Stopped'}
            </Badge>
            <Button
              variant={running ? 'destructive' : 'hero'}
              size="sm"
              onClick={toggleSimulator}
            >
              {running ? (
                <>
                  <Pause className="h-4 w-4 mr-1" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  Start
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={runSimulatorTick}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="p-3 rounded-lg bg-secondary/30 text-center">
            <div className="text-2xl font-bold text-primary">{tickCount}</div>
            <div className="text-xs text-muted-foreground">Total Ticks</div>
          </div>
          <div className="p-3 rounded-lg bg-secondary/30 text-center">
            <div className="text-2xl font-bold">{lastResult?.processed || 0}</div>
            <div className="text-xs text-muted-foreground">Trades Checked</div>
          </div>
          <div className="p-3 rounded-lg bg-secondary/30 text-center">
            <div className="text-2xl font-bold text-success">{lastResult?.closed || 0}</div>
            <div className="text-xs text-muted-foreground">Trades Closed</div>
          </div>
        </div>

        {lastRun && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Clock className="h-4 w-4" />
            Last tick: {lastRun.toLocaleTimeString()}
          </div>
        )}

        {lastResult?.closedTrades && lastResult.closedTrades.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Recently Closed:</p>
            {lastResult.closedTrades.slice(0, 5).map((trade, idx) => (
              <div 
                key={trade.id || idx}
                className="flex items-center justify-between p-2 rounded bg-secondary/20"
              >
                <div className="flex items-center gap-2">
                  {trade.profit_loss >= 0 ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <Badge variant="outline" className="text-xs">
                    {trade.reason}
                  </Badge>
                </div>
                <span className={`font-mono font-bold ${trade.profit_loss >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {trade.profit_loss >= 0 ? '+' : ''}{trade.profit_loss.toFixed(2)} USD
                </span>
              </div>
            ))}
          </div>
        )}

        {lastResult?.current_prices && Object.keys(lastResult.current_prices).length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-2">Simulated Prices:</p>
            <div className="grid grid-cols-4 gap-2 text-xs">
              {Object.entries(lastResult.current_prices).map(([symbol, price]) => (
                <div key={symbol} className="font-mono">
                  <span className="text-muted-foreground">{symbol}:</span>{' '}
                  <span>{(price as number).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {running && (
          <div className="mt-4 p-3 rounded-lg bg-success/10 border border-success/30">
            <p className="text-sm text-success flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              Simulator is running. Checking trades every 7 seconds via background cron.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
