import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Server, Wifi, WifiOff, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface MT5Connection {
  mt5_login: string;
  mt5_server: string;
  trading_mode: 'demo' | 'live';
  is_connected: boolean;
  account_balance: number | null;
}

interface MT5ConnectionCardProps {
  connection: MT5Connection | null;
  userId: string;
  isSubscriptionActive: boolean;
  onUpdate: () => void;
}

const MT5_SERVERS = [
  // XM Servers
  { label: 'XMGlobal-MT5 (Demo)', value: 'XMGlobal-MT5' },
  { label: 'XMGlobal-MT5 2 (Demo)', value: 'XMGlobal-MT5 2' },
  { label: 'XMGlobal-MT5 3 (Demo)', value: 'XMGlobal-MT5 3' },
  { label: 'XMGlobal-MT5 4 (Demo)', value: 'XMGlobal-MT5 4' },
  { label: 'XMGlobal-MT5 5 (Demo)', value: 'XMGlobal-MT5 5' },
  { label: 'XMGlobal-MT5 6 (Demo)', value: 'XMGlobal-MT5 6' },
  { label: 'XMGlobal-Real 1 (Live)', value: 'XMGlobal-Real 1' },
  { label: 'XMGlobal-Real 2 (Live)', value: 'XMGlobal-Real 2' },
  { label: 'XMGlobal-Real 3 (Live)', value: 'XMGlobal-Real 3' },
  { label: 'XMGlobal-Real 4 (Live)', value: 'XMGlobal-Real 4' },
  { label: 'XMGlobal-Real 5 (Live)', value: 'XMGlobal-Real 5' },
  { label: 'XMGlobal-Real 6 (Live)', value: 'XMGlobal-Real 6' },
  { label: 'XMGlobal-Real 7 (Live)', value: 'XMGlobal-Real 7' },
  { label: 'XMGlobal-Real 8 (Live)', value: 'XMGlobal-Real 8' },
  // Exness Servers
  { label: 'Exness-MT5Trial (Demo)', value: 'Exness-MT5Trial' },
  { label: 'Exness-MT5Trial2 (Demo)', value: 'Exness-MT5Trial2' },
  { label: 'Exness-MT5Trial3 (Demo)', value: 'Exness-MT5Trial3' },
  { label: 'Exness-MT5Trial4 (Demo)', value: 'Exness-MT5Trial4' },
  { label: 'Exness-MT5Trial5 (Demo)', value: 'Exness-MT5Trial5' },
  { label: 'Exness-MT5Trial6 (Demo)', value: 'Exness-MT5Trial6' },
  { label: 'Exness-MT5Real (Live)', value: 'Exness-MT5Real' },
  { label: 'Exness-MT5Real2 (Live)', value: 'Exness-MT5Real2' },
  { label: 'Exness-MT5Real3 (Live)', value: 'Exness-MT5Real3' },
  { label: 'Exness-MT5Real4 (Live)', value: 'Exness-MT5Real4' },
  { label: 'Exness-MT5Real5 (Live)', value: 'Exness-MT5Real5' },
  { label: 'Exness-MT5Real6 (Live)', value: 'Exness-MT5Real6' },
  { label: 'Exness-MT5Real7 (Live)', value: 'Exness-MT5Real7' },
  { label: 'Exness-MT5Real8 (Live)', value: 'Exness-MT5Real8' },
  { label: 'Exness-MT5Real9 (Live)', value: 'Exness-MT5Real9' },
  { label: 'Exness-MT5Real10 (Live)', value: 'Exness-MT5Real10' },
  // IC Markets Servers
  { label: 'ICMarketsSC-Demo (Demo)', value: 'ICMarketsSC-Demo' },
  { label: 'ICMarketsSC-Demo02 (Demo)', value: 'ICMarketsSC-Demo02' },
  { label: 'ICMarketsSC-Demo03 (Demo)', value: 'ICMarketsSC-Demo03' },
  { label: 'ICMarketsSC-Demo04 (Demo)', value: 'ICMarketsSC-Demo04' },
  { label: 'ICMarketsSC-MT5 (Live)', value: 'ICMarketsSC-MT5' },
  { label: 'ICMarketsSC-MT5-2 (Live)', value: 'ICMarketsSC-MT5-2' },
  { label: 'ICMarketsSC-MT5-3 (Live)', value: 'ICMarketsSC-MT5-3' },
  { label: 'ICMarketsSC-MT5-4 (Live)', value: 'ICMarketsSC-MT5-4' },
  { label: 'ICMarketsSC-MT5-5 (Live)', value: 'ICMarketsSC-MT5-5' },
  { label: 'ICMarketsSC-MT5-6 (Live)', value: 'ICMarketsSC-MT5-6' },
  // FBS Servers
  { label: 'FBS-Demo (Demo)', value: 'FBS-Demo' },
  { label: 'FBS-Demo-2 (Demo)', value: 'FBS-Demo-2' },
  { label: 'FBS-Demo-3 (Demo)', value: 'FBS-Demo-3' },
  { label: 'FBS-Real (Live)', value: 'FBS-Real' },
  { label: 'FBS-Real-2 (Live)', value: 'FBS-Real-2' },
  { label: 'FBS-Real-3 (Live)', value: 'FBS-Real-3' },
  { label: 'FBS-Real-4 (Live)', value: 'FBS-Real-4' },
  // FXTM Servers
  { label: 'ForexTimeFXTM-Demo01 (Demo)', value: 'ForexTimeFXTM-Demo01' },
  { label: 'ForexTimeFXTM-Demo02 (Demo)', value: 'ForexTimeFXTM-Demo02' },
  { label: 'ForexTimeFXTM-Demo03 (Demo)', value: 'ForexTimeFXTM-Demo03' },
  { label: 'ForexTimeFXTM-Demo04 (Demo)', value: 'ForexTimeFXTM-Demo04' },
  { label: 'ForexTimeFXTM-MT5 (Live)', value: 'ForexTimeFXTM-MT5' },
  { label: 'ForexTimeFXTM-MT5-2 (Live)', value: 'ForexTimeFXTM-MT5-2' },
  { label: 'ForexTimeFXTM-MT5-3 (Live)', value: 'ForexTimeFXTM-MT5-3' },
  // Pepperstone Servers
  { label: 'Pepperstone-Demo (Demo)', value: 'Pepperstone-Demo' },
  { label: 'Pepperstone-Demo02 (Demo)', value: 'Pepperstone-Demo02' },
  { label: 'Pepperstone-Demo03 (Demo)', value: 'Pepperstone-Demo03' },
  { label: 'Pepperstone-MT5-Live01 (Live)', value: 'Pepperstone-MT5-Live01' },
  { label: 'Pepperstone-MT5-Live02 (Live)', value: 'Pepperstone-MT5-Live02' },
  { label: 'Pepperstone-MT5-Live03 (Live)', value: 'Pepperstone-MT5-Live03' },
  // RoboForex Servers
  { label: 'RoboForex-DemoUS (Demo)', value: 'RoboForex-DemoUS' },
  { label: 'RoboForex-Demo (Demo)', value: 'RoboForex-Demo' },
  { label: 'RoboForex-Demo2 (Demo)', value: 'RoboForex-Demo2' },
  { label: 'RoboForex-MT5 (Live)', value: 'RoboForex-MT5' },
  { label: 'RoboForex-Prime (Live)', value: 'RoboForex-Prime' },
  { label: 'RoboForex-Pro (Live)', value: 'RoboForex-Pro' },
  // Tickmill Servers
  { label: 'Tickmill-Demo (Demo)', value: 'Tickmill-Demo' },
  { label: 'Tickmill-Demo-EU (Demo)', value: 'Tickmill-Demo-EU' },
  { label: 'Tickmill-Live (Live)', value: 'Tickmill-Live' },
  { label: 'Tickmill-Live-EU (Live)', value: 'Tickmill-Live-EU' },
  // Admirals Servers
  { label: 'AdmiralMarkets-Demo (Demo)', value: 'AdmiralMarkets-Demo' },
  { label: 'AdmiralMarkets-Demo2 (Demo)', value: 'AdmiralMarkets-Demo2' },
  { label: 'AdmiralMarkets-MT5 (Live)', value: 'AdmiralMarkets-MT5' },
  { label: 'AdmiralMarkets-MT5-2 (Live)', value: 'AdmiralMarkets-MT5-2' },
  // OctaFX Servers
  { label: 'OctaFX-Demo (Demo)', value: 'OctaFX-Demo' },
  { label: 'OctaFX-Demo2 (Demo)', value: 'OctaFX-Demo2' },
  { label: 'OctaFX-Real (Live)', value: 'OctaFX-Real' },
  { label: 'OctaFX-Real2 (Live)', value: 'OctaFX-Real2' },
  { label: 'OctaFX-Real3 (Live)', value: 'OctaFX-Real3' },
  // HFM Servers
  { label: 'HFMarketsSV-Demo (Demo)', value: 'HFMarketsSV-Demo' },
  { label: 'HFMarketsSV-Demo2 (Demo)', value: 'HFMarketsSV-Demo2' },
  { label: 'HFMarketsSV-Demo3 (Demo)', value: 'HFMarketsSV-Demo3' },
  { label: 'HFMarketsSV-Live (Live)', value: 'HFMarketsSV-Live' },
  { label: 'HFMarketsSV-Live2 (Live)', value: 'HFMarketsSV-Live2' },
  { label: 'HFMarketsSV-Live3 (Live)', value: 'HFMarketsSV-Live3' },
  // FxPro Servers
  { label: 'FxPro-MT5 Demo (Demo)', value: 'FxPro-MT5 Demo' },
  { label: 'FxPro-MT5 Demo2 (Demo)', value: 'FxPro-MT5 Demo2' },
  { label: 'FxPro-MT5 (Live)', value: 'FxPro-MT5' },
  { label: 'FxPro-MT5-02 (Live)', value: 'FxPro-MT5-02' },
  // AvaTrade Servers
  { label: 'AvaTrade-Demo (Demo)', value: 'AvaTrade-Demo' },
  { label: 'AvaTrade-Demo-EU (Demo)', value: 'AvaTrade-Demo-EU' },
  { label: 'AvaTrade-MT5 (Live)', value: 'AvaTrade-MT5' },
  { label: 'AvaTrade-MT5-EU (Live)', value: 'AvaTrade-MT5-EU' },
  // OANDA Servers
  { label: 'OANDA-Demo-1 (Demo)', value: 'OANDA-Demo-1' },
  { label: 'OANDA-Demo-2 (Demo)', value: 'OANDA-Demo-2' },
  { label: 'OANDA-MT5-1 (Live)', value: 'OANDA-MT5-1' },
  { label: 'OANDA-MT5-2 (Live)', value: 'OANDA-MT5-2' },
];

export default function MT5ConnectionCard({ 
  connection, 
  userId, 
  isSubscriptionActive,
  onUpdate 
}: MT5ConnectionCardProps) {
  const [isEditing, setIsEditing] = useState(!connection);
  const [isLoading, setIsLoading] = useState(false);

  const [mt5Login, setMt5Login] = useState(connection?.mt5_login || '');
  const [mt5Password, setMt5Password] = useState('');
  const [mt5Server, setMt5Server] = useState(connection?.mt5_server || MT5_SERVERS[0].value);
  const [tradingMode, setTradingMode] = useState<'demo' | 'live'>(connection?.trading_mode || 'demo');

  const handleSave = async () => {
    if (!mt5Login || !mt5Password || !mt5Server) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);

    try {
      if (connection) {
        // Update existing connection
        const { error } = await supabase
          .from('mt5_connections')
          .update({
            mt5_login: mt5Login,
            mt5_password: mt5Password,
            mt5_server: mt5Server,
            trading_mode: tradingMode,
          })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Create new connection
        const { error } = await supabase
          .from('mt5_connections')
          .insert({
            user_id: userId,
            mt5_login: mt5Login,
            mt5_password: mt5Password,
            mt5_server: mt5Server,
            trading_mode: tradingMode,
          });

        if (error) throw error;
      }

      toast.success('MT5 connection saved successfully');
      setIsEditing(false);
      setMt5Password('');
      onUpdate();
    } catch (error: any) {
      console.error('Error saving MT5 connection:', error);
      toast.error(error.message || 'Failed to save connection');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="card-trading border-glow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />
              MT5 Connection
            </CardTitle>
            <CardDescription>Connect your MetaTrader 5 account</CardDescription>
          </div>
          {connection && (
            <Badge variant={connection.is_connected ? 'default' : 'secondary'}>
              {connection.is_connected ? (
                <><Wifi className="h-3 w-3 mr-1" /> Connected</>
              ) : (
                <><WifiOff className="h-3 w-3 mr-1" /> Disconnected</>
              )}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!isSubscriptionActive && (
          <div className="mb-4 p-3 rounded-lg bg-warning/10 border border-warning/30 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-warning" />
            <p className="text-sm text-warning">Subscription inactive. Trading disabled.</p>
          </div>
        )}

        {isEditing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mt5-login">MT5 Login ID</Label>
              <Input
                id="mt5-login"
                placeholder="Enter your MT5 login"
                value={mt5Login}
                onChange={(e) => setMt5Login(e.target.value)}
                className="bg-secondary/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mt5-password">MT5 Password</Label>
              <Input
                id="mt5-password"
                type="password"
                placeholder="Enter your MT5 password"
                value={mt5Password}
                onChange={(e) => setMt5Password(e.target.value)}
                className="bg-secondary/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mt5-server">MT5 Server</Label>
              <Select value={mt5Server} onValueChange={setMt5Server}>
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue placeholder="Select server" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] bg-background">
                  {MT5_SERVERS.map((server) => (
                    <SelectItem key={server.value} value={server.value}>
                      {server.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trading-mode">Trading Mode</Label>
              <Select value={tradingMode} onValueChange={(v) => setTradingMode(v as 'demo' | 'live')}>
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="demo">Demo Account</SelectItem>
                  <SelectItem value="live">Live Account</SelectItem>
                </SelectContent>
              </Select>
              {tradingMode === 'live' && (
                <p className="text-xs text-warning mt-1">
                  ⚠️ Live trading involves real money. Proceed with caution.
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                variant="hero" 
                className="flex-1" 
                onClick={handleSave}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Connection'
                )}
              </Button>
              {connection && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsEditing(false);
                    setMt5Login(connection.mt5_login);
                    setMt5Password('');
                    setMt5Server(connection.mt5_server || MT5_SERVERS[0].value);
                    setTradingMode(connection.trading_mode);
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground mb-1">Login ID</p>
                <p className="font-mono font-semibold">{connection?.mt5_login}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground mb-1">Server</p>
                <p className="font-semibold text-sm">{connection?.mt5_server}</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-secondary/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Trading Mode</p>
                  <Badge variant={connection?.trading_mode === 'live' ? 'destructive' : 'secondary'}>
                    {connection?.trading_mode?.toUpperCase()}
                  </Badge>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  Edit
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
