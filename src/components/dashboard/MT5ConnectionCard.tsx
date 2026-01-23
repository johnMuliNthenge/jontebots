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
  { label: 'XM - Demo', value: 'XMGlobal-MT5' },
  { label: 'XM - Demo 2', value: 'XMGlobal-MT5 2' },
  { label: 'XM - Live 1', value: 'XMGlobal-Real 1' },
  { label: 'XM - Live 2', value: 'XMGlobal-Real 2' },
  { label: 'XM - Live 3', value: 'XMGlobal-Real 3' },
  { label: 'XM - Live 4', value: 'XMGlobal-Real 4' },
  // Exness Servers
  { label: 'Exness - Demo', value: 'Exness-MT5Trial' },
  { label: 'Exness - Demo 2', value: 'Exness-MT5Trial2' },
  { label: 'Exness - Live', value: 'Exness-MT5Real' },
  { label: 'Exness - Live 2', value: 'Exness-MT5Real2' },
  { label: 'Exness - Live 3', value: 'Exness-MT5Real3' },
  { label: 'Exness - Live 4', value: 'Exness-MT5Real4' },
  { label: 'Exness - Live 5', value: 'Exness-MT5Real5' },
  { label: 'Exness - Live 6', value: 'Exness-MT5Real6' },
  { label: 'Exness - Live 7', value: 'Exness-MT5Real7' },
  // IC Markets Servers
  { label: 'IC Markets - Demo', value: 'ICMarketsSC-Demo' },
  { label: 'IC Markets - Live 1', value: 'ICMarketsSC-MT5' },
  { label: 'IC Markets - Live 2', value: 'ICMarketsSC-MT5-2' },
  { label: 'IC Markets - Live 3', value: 'ICMarketsSC-MT5-3' },
  { label: 'IC Markets - Live 4', value: 'ICMarketsSC-MT5-4' },
  // FBS Servers
  { label: 'FBS - Demo', value: 'FBS-Demo' },
  { label: 'FBS - Live', value: 'FBS-Real' },
  { label: 'FBS - Live 2', value: 'FBS-Real-2' },
  { label: 'FBS - Live 3', value: 'FBS-Real-3' },
  // FXTM Servers
  { label: 'FXTM - Demo', value: 'ForexTimeFXTM-Demo01' },
  { label: 'FXTM - Demo 2', value: 'ForexTimeFXTM-Demo02' },
  { label: 'FXTM - Live', value: 'ForexTimeFXTM-MT5' },
  { label: 'FXTM - Live 2', value: 'ForexTimeFXTM-MT5-2' },
  // Pepperstone Servers
  { label: 'Pepperstone - Demo', value: 'Pepperstone-Demo' },
  { label: 'Pepperstone - Live', value: 'Pepperstone-MT5-Live01' },
  { label: 'Pepperstone - Live 2', value: 'Pepperstone-MT5-Live02' },
  // RoboForex Servers
  { label: 'RoboForex - Demo', value: 'RoboForex-DemoUS' },
  { label: 'RoboForex - Live', value: 'RoboForex-MT5' },
  { label: 'RoboForex - Live 2', value: 'RoboForex-Prime' },
  // Tickmill Servers
  { label: 'Tickmill - Demo', value: 'Tickmill-Demo' },
  { label: 'Tickmill - Live', value: 'Tickmill-Live' },
  // Admirals (Admiral Markets) Servers
  { label: 'Admirals - Demo', value: 'AdmiralMarkets-Demo' },
  { label: 'Admirals - Live', value: 'AdmiralMarkets-MT5' },
  { label: 'Admirals - Live 2', value: 'AdmiralMarkets-MT5-2' },
  // OctaFX Servers
  { label: 'OctaFX - Demo', value: 'OctaFX-Demo' },
  { label: 'OctaFX - Live', value: 'OctaFX-Real' },
  { label: 'OctaFX - Live 2', value: 'OctaFX-Real2' },
  // HotForex (HFM) Servers
  { label: 'HFM - Demo', value: 'HFMarketsSV-Demo' },
  { label: 'HFM - Live', value: 'HFMarketsSV-Live' },
  { label: 'HFM - Live 2', value: 'HFMarketsSV-Live2' },
  // FxPro Servers
  { label: 'FxPro - Demo', value: 'FxPro-MT5 Demo' },
  { label: 'FxPro - Live', value: 'FxPro-MT5' },
  // AvaTrade Servers
  { label: 'AvaTrade - Demo', value: 'AvaTrade-Demo' },
  { label: 'AvaTrade - Live', value: 'AvaTrade-MT5' },
  // OANDA Servers
  { label: 'OANDA - Demo', value: 'OANDA-Demo-1' },
  { label: 'OANDA - Live', value: 'OANDA-MT5-1' },
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
                <SelectContent className="max-h-[300px]">
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
