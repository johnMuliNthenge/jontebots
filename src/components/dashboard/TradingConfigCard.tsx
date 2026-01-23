import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { Settings, TrendingUp, TrendingDown, Loader2, AlertCircle, Power } from 'lucide-react';
import { toast } from 'sonner';

interface TradingConfig {
  take_profit_usd: number;
  stop_loss_usd: number | null;
  is_trading_enabled: boolean;
}

interface TradingConfigCardProps {
  config: TradingConfig | null;
  userId: string;
  isSubscriptionActive: boolean;
  onUpdate: () => void;
}

const TP_PRESETS = [3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25];

export default function TradingConfigCard({ 
  config, 
  userId, 
  isSubscriptionActive,
  onUpdate 
}: TradingConfigCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [takeProfit, setTakeProfit] = useState(config?.take_profit_usd || 5);
  const [stopLoss, setStopLoss] = useState<string>(config?.stop_loss_usd?.toString() || '');
  const [customTp, setCustomTp] = useState('');
  const [isTradingEnabled, setIsTradingEnabled] = useState(config?.is_trading_enabled || false);

  const handleSave = async () => {
    setIsLoading(true);

    try {
      const updateData = {
        take_profit_usd: takeProfit,
        stop_loss_usd: stopLoss ? parseFloat(stopLoss) : null,
        is_trading_enabled: isTradingEnabled && isSubscriptionActive,
      };

      const { error } = await supabase
        .from('trading_configs')
        .update(updateData)
        .eq('user_id', userId);

      if (error) throw error;

      toast.success('Trading configuration saved');
      onUpdate();
    } catch (error: any) {
      console.error('Error saving config:', error);
      toast.error(error.message || 'Failed to save configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleTrading = async (enabled: boolean) => {
    if (!isSubscriptionActive && enabled) {
      toast.error('Cannot enable trading with inactive subscription');
      return;
    }

    setIsTradingEnabled(enabled);
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('trading_configs')
        .update({ is_trading_enabled: enabled })
        .eq('user_id', userId);

      if (error) throw error;

      toast.success(enabled ? 'Trading bot started' : 'Trading bot stopped');
      onUpdate();
    } catch (error: any) {
      console.error('Error toggling trading:', error);
      toast.error(error.message || 'Failed to update trading status');
      setIsTradingEnabled(!enabled);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomTp = () => {
    const value = parseFloat(customTp);
    if (!isNaN(value) && value > 0) {
      setTakeProfit(value);
      setCustomTp('');
    }
  };

  return (
    <Card className="card-trading border-glow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Trading Configuration
            </CardTitle>
            <CardDescription>Set your take profit and stop loss</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={isTradingEnabled}
              onCheckedChange={handleToggleTrading}
              disabled={!isSubscriptionActive || isLoading}
            />
            <span className={`text-sm font-medium ${isTradingEnabled ? 'text-success' : 'text-muted-foreground'}`}>
              {isTradingEnabled ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isSubscriptionActive && (
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-warning" />
            <p className="text-sm text-warning">Subscription inactive. Trading disabled.</p>
          </div>
        )}

        {/* Take Profit Section */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-success" />
            Take Profit (USD) - Required
          </Label>
          <div className="flex flex-wrap gap-2">
            {TP_PRESETS.map((value) => (
              <Button
                key={value}
                variant={takeProfit === value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTakeProfit(value)}
                className={takeProfit === value ? 'glow-primary' : ''}
              >
                ${value}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Custom amount"
              value={customTp}
              onChange={(e) => setCustomTp(e.target.value)}
              className="bg-secondary/50"
            />
            <Button variant="outline" onClick={handleCustomTp}>
              Set
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Current: <span className="font-mono text-success">${takeProfit.toFixed(2)}</span>
          </p>
        </div>

        {/* Stop Loss Section */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-destructive" />
            Stop Loss (USD) - Optional
          </Label>
          <Input
            type="number"
            placeholder="Leave empty for no stop loss"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            className="bg-secondary/50"
          />
          <p className="text-xs text-muted-foreground">
            If not set, trades will run without stop loss protection
          </p>
        </div>

        {/* Allowed Instruments */}
        <div className="space-y-2">
          <Label>Allowed Trading Instruments</Label>
          <div className="flex flex-wrap gap-2">
            {['USD/JPY', 'CAD/JPY', 'GBP/JPY', 'EUR/JPY', 'AUD/JPY', 'CHF/JPY', 'XAU/USD'].map((pair) => (
              <span 
                key={pair} 
                className="px-3 py-1 rounded-full bg-secondary text-sm font-mono"
              >
                {pair}
              </span>
            ))}
          </div>
        </div>

        <Button 
          variant="hero" 
          className="w-full" 
          onClick={handleSave}
          disabled={isLoading || !isSubscriptionActive}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Power className="h-4 w-4" />
              Save Configuration
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
