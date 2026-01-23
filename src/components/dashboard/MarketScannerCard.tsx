import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrendingUp, 
  TrendingDown, 
  Radio, 
  RefreshCw, 
  Loader2,
  Target,
  Activity,
  Zap,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';

interface TradingSignal {
  symbol: string;
  action: 'BUY' | 'SELL';
  strategy: string;
  confidence: number;
  reason: string;
  entry_price: number;
  recommended_tp: number;
  recommended_sl: number | null;
}

interface ScanResult {
  signals: TradingSignal[];
  total_opportunities: number;
  timestamp: string;
}

const STRATEGY_COLORS: Record<string, string> = {
  'MA_CROSSOVER': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'MOMENTUM': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'BREAKOUT': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'SCALPING': 'bg-green-500/20 text-green-400 border-green-500/30',
  'COMBINED': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  'RANDOM': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const STRATEGY_ICONS: Record<string, React.ReactNode> = {
  'MA_CROSSOVER': <TrendingUp className="h-3 w-3" />,
  'MOMENTUM': <Zap className="h-3 w-3" />,
  'BREAKOUT': <Target className="h-3 w-3" />,
  'SCALPING': <Activity className="h-3 w-3" />,
  'COMBINED': <BarChart3 className="h-3 w-3" />,
};

export default function MarketScannerCard() {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastScan, setLastScan] = useState<Date | null>(null);

  useEffect(() => {
    // Initial scan
    handleScan();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (autoRefresh) {
      interval = setInterval(() => {
        handleScan();
      }, 30000); // Refresh every 30 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const handleScan = async () => {
    setScanning(true);
    try {
      const response = await supabase.functions.invoke('trading-bot', {
        body: { action: 'scan_all' }
      });

      if (response.error) throw response.error;

      setScanResult(response.data as ScanResult);
      setLastScan(new Date());
    } catch (error: any) {
      console.error('Market scan error:', error);
      toast.error('Failed to scan market');
    } finally {
      setScanning(false);
    }
  };

  const handleExecuteSignal = async (signal: TradingSignal) => {
    try {
      const response = await supabase.functions.invoke('trading-bot', {
        body: {
          action: 'process_signal',
          signal: {
            symbol: signal.symbol,
            action: signal.action,
            entry_price: signal.entry_price,
            lot_size: 0.01
          }
        }
      });

      if (response.error) throw response.error;

      if (response.data?.trades_created > 0) {
        toast.success(`Created ${response.data.trades_created} trade(s) for ${signal.symbol}`);
      } else {
        toast.info('No eligible users with trading enabled');
      }
    } catch (error: any) {
      console.error('Execute signal error:', error);
      toast.error('Failed to execute signal');
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-success';
    if (confidence >= 60) return 'text-warning';
    return 'text-muted-foreground';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 80) return 'Strong';
    if (confidence >= 70) return 'Good';
    if (confidence >= 60) return 'Moderate';
    return 'Weak';
  };

  return (
    <Card className="card-trading border-glow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Radio className={`h-5 w-5 ${autoRefresh ? 'text-success animate-pulse' : 'text-primary'}`} />
              Market Scanner
            </CardTitle>
            <CardDescription>
              Real-time trading signals across all instruments
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? 'border-success text-success' : ''}
            >
              {autoRefresh ? 'Auto: ON' : 'Auto: OFF'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleScan}
              disabled={scanning}
            >
              {scanning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        {lastScan && (
          <p className="text-xs text-muted-foreground mt-2">
            Last scan: {lastScan.toLocaleTimeString()}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {scanning && !scanResult ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : scanResult?.signals.length === 0 ? (
          <div className="text-center py-8">
            <Radio className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No high-confidence signals</p>
            <p className="text-sm text-muted-foreground mt-1">
              Market conditions don't meet strategy criteria (≥60% confidence)
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {scanResult?.signals.map((signal, index) => (
              <div
                key={`${signal.symbol}-${index}`}
                className="p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors border border-border/50"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-lg">{signal.symbol}</span>
                    <Badge 
                      variant={signal.action === 'BUY' ? 'default' : 'secondary'}
                      className={signal.action === 'BUY' ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'}
                    >
                      {signal.action === 'BUY' ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {signal.action}
                    </Badge>
                    <Badge 
                      variant="outline"
                      className={STRATEGY_COLORS[signal.strategy] || STRATEGY_COLORS['RANDOM']}
                    >
                      {STRATEGY_ICONS[signal.strategy]}
                      <span className="ml-1">{signal.strategy}</span>
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className={`text-lg font-bold ${getConfidenceColor(signal.confidence)}`}>
                        {signal.confidence.toFixed(0)}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {getConfidenceLabel(signal.confidence)}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="hero"
                      onClick={() => handleExecuteSignal(signal)}
                    >
                      Execute
                    </Button>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground mb-3">{signal.reason}</p>
                
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Entry:</span>
                    <span className="ml-2 font-mono">{signal.entry_price.toFixed(5)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">TP:</span>
                    <span className="ml-2 font-mono text-success">${signal.recommended_tp}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">SL:</span>
                    <span className="ml-2 font-mono text-destructive">
                      {signal.recommended_sl ? `$${signal.recommended_sl}` : 'None'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Risk:</span>
                    <span className={`ml-2 ${signal.recommended_sl ? 'text-warning' : 'text-success'}`}>
                      {signal.recommended_sl ? 'Protected' : 'TP Only'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Strategies Legend */}
        <div className="mt-4 pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-2">Active Strategies:</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(STRATEGY_COLORS).filter(([key]) => key !== 'RANDOM').map(([strategy, color]) => (
              <Badge key={strategy} variant="outline" className={`${color} text-xs`}>
                {STRATEGY_ICONS[strategy]}
                <span className="ml-1">{strategy.replace('_', ' ')}</span>
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
