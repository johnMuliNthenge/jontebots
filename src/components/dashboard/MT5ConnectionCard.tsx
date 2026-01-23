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
  'XMGlobal-MT5',
  'XMGlobal-MT5 2',
  'XMGlobal-Real 1',
  'XMGlobal-Real 2',
  'XMGlobal-Real 3',
  'XMGlobal-Real 4',
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
  const [mt5Server, setMt5Server] = useState(connection?.mt5_server || MT5_SERVERS[0]);
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
                <SelectContent>
                  {MT5_SERVERS.map((server) => (
                    <SelectItem key={server} value={server}>
                      {server}
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
                    setMt5Server(connection.mt5_server);
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
