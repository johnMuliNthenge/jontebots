import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, LogOut, Settings, BarChart3, Wallet, Activity, Shield, Crown } from 'lucide-react';
import MT5ConnectionCard from '@/components/dashboard/MT5ConnectionCard';
import TradingConfigCard from '@/components/dashboard/TradingConfigCard';
import TradesHistoryCard from '@/components/dashboard/TradesHistoryCard';
import SubscriptionCard from '@/components/dashboard/SubscriptionCard';
import { toast } from 'sonner';

interface Subscription {
  status: 'active' | 'suspended' | 'expired';
  activation_date: string;
  expiry_date: string;
}

interface MT5Connection {
  mt5_login: string;
  mt5_server: string;
  trading_mode: 'demo' | 'live';
  is_connected: boolean;
  account_balance: number | null;
}

interface TradingConfig {
  take_profit_usd: number;
  stop_loss_usd: number | null;
  is_trading_enabled: boolean;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading, isAdmin, signOut } = useAuth();

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [mt5Connection, setMt5Connection] = useState<MT5Connection | null>(null);
  const [tradingConfig, setTradingConfig] = useState<TradingConfig | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [adminExists, setAdminExists] = useState<boolean | null>(null);
  const [bootstrappingAdmin, setBootstrappingAdmin] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchUserData();
      checkAdminExists();
    }
  }, [user]);

  const checkAdminExists = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) return;

      const response = await supabase.functions.invoke('assign-admin', {
        body: { action: 'check_admin_exists' }
      });

      if (response.data) {
        setAdminExists(response.data.admin_exists);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const handleBootstrapAdmin = async () => {
    setBootstrappingAdmin(true);
    try {
      const response = await supabase.functions.invoke('assign-admin', {
        body: { action: 'bootstrap_first_admin' }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.success) {
        toast.success('You are now the platform admin!');
        setAdminExists(true);
        // Refresh the page to update admin status
        window.location.reload();
      } else if (response.data?.error) {
        toast.error(response.data.error);
      }
    } catch (error: any) {
      console.error('Error bootstrapping admin:', error);
      toast.error(error.message || 'Failed to assign admin role');
    } finally {
      setBootstrappingAdmin(false);
    }
  };

  const fetchUserData = async () => {
    if (!user) return;

    try {
      // Fetch subscription
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (subData) {
        setSubscription(subData as Subscription);
      }

      // Fetch MT5 connection
      const { data: mt5Data } = await supabase
        .from('mt5_connections')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (mt5Data) {
        setMt5Connection(mt5Data as MT5Connection);
      }

      // Fetch trading config
      const { data: configData } = await supabase
        .from('trading_configs')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (configData) {
        setTradingConfig(configData as TradingConfig);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isSubscriptionActive = subscription?.status === 'active' && 
    new Date(subscription.expiry_date) > new Date();

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center glow-primary">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <span className="text-xl font-bold text-gradient-primary">SUPERJONNIE</span>
              </div>
              <Badge variant={isSubscriptionActive ? 'default' : 'destructive'} className="ml-4">
                {isSubscriptionActive ? 'Active' : subscription?.status || 'Inactive'}
              </Badge>
            </div>

            <div className="flex items-center gap-4">
              {/* Bootstrap Admin Button - only show if no admin exists and user is not admin */}
              {adminExists === false && !isAdmin && (
                <Button 
                  variant="outline" 
                  onClick={handleBootstrapAdmin}
                  disabled={bootstrappingAdmin}
                  className="border-warning text-warning hover:bg-warning/10"
                >
                  {bootstrappingAdmin ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Crown className="h-4 w-4 mr-2" />
                  )}
                  Become Admin
                </Button>
              )}
              {isAdmin && (
                <Button variant="outline" onClick={() => navigate('/admin')}>
                  <Shield className="h-4 w-4 mr-2" />
                  Admin Panel
                </Button>
              )}
              <Button variant="ghost" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, <span className="text-gradient-primary">{user?.email?.split('@')[0]}</span>
          </h1>
          <p className="text-muted-foreground">
            Manage your MT5 connection and trading settings
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="card-trading">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Account Balance</p>
                  <p className="text-2xl font-bold font-mono text-gradient-primary">
                    ${mt5Connection?.account_balance?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-trading">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Trading Mode</p>
                  <p className="text-2xl font-bold">
                    {mt5Connection?.trading_mode?.toUpperCase() || 'DEMO'}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
                  <Settings className="h-6 w-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-trading">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Take Profit</p>
                  <p className="text-2xl font-bold font-mono text-success">
                    ${tradingConfig?.take_profit_usd?.toFixed(2) || '5.00'}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-trading">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Bot Status</p>
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${tradingConfig?.is_trading_enabled ? 'bg-success pulse-live' : 'bg-muted-foreground'}`} />
                    <p className="text-lg font-semibold">
                      {tradingConfig?.is_trading_enabled ? 'Running' : 'Stopped'}
                    </p>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <SubscriptionCard 
              subscription={subscription} 
              isActive={isSubscriptionActive} 
            />
            <MT5ConnectionCard 
              connection={mt5Connection}
              userId={user?.id || ''}
              isSubscriptionActive={isSubscriptionActive}
              onUpdate={fetchUserData}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <TradingConfigCard 
              config={tradingConfig}
              userId={user?.id || ''}
              isSubscriptionActive={isSubscriptionActive}
              onUpdate={fetchUserData}
            />
            <TradesHistoryCard userId={user?.id || ''} />
          </div>
        </div>
      </main>
    </div>
  );
}
