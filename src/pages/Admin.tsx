import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Loader2, 
  TrendingUp, 
  ArrowLeft, 
  Users, 
  Activity, 
  Shield, 
  Search,
  UserCheck,
  UserX,
  Calendar,
  RefreshCw,
  Radio,
  Timer
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import MarketScannerCard from '@/components/dashboard/MarketScannerCard';
import TradeSimulatorCard from '@/components/dashboard/TradeSimulatorCard';

interface UserData {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  subscription: {
    status: 'active' | 'suspended' | 'expired';
    activation_date: string;
    expiry_date: string;
  } | null;
  mt5_connection: {
    is_connected: boolean;
    trading_mode: 'demo' | 'live';
  } | null;
  trading_config: {
    is_trading_enabled: boolean;
  } | null;
}

export default function Admin() {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();

  const [users, setUsers] = useState<UserData[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (!loading && user && !isAdmin) {
      navigate('/dashboard');
      toast.error('Access denied. Admin privileges required.');
    }
  }, [user, loading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const usersWithData: UserData[] = await Promise.all(
        (profiles || []).map(async (profile) => {
          const [subRes, mt5Res, configRes] = await Promise.all([
            supabase
              .from('subscriptions')
              .select('*')
              .eq('user_id', profile.user_id)
              .maybeSingle(),
            supabase
              .from('mt5_connections')
              .select('is_connected, trading_mode')
              .eq('user_id', profile.user_id)
              .maybeSingle(),
            supabase
              .from('trading_configs')
              .select('is_trading_enabled')
              .eq('user_id', profile.user_id)
              .maybeSingle(),
          ]);

          return {
            id: profile.id,
            user_id: profile.user_id,
            email: profile.email,
            full_name: profile.full_name,
            subscription: subRes.data as UserData['subscription'],
            mt5_connection: mt5Res.data as UserData['mt5_connection'],
            trading_config: configRes.data as UserData['trading_config'],
          };
        })
      );

      setUsers(usersWithData);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setDataLoading(false);
    }
  };

  const updateSubscriptionStatus = async (userId: string, status: 'active' | 'suspended' | 'expired') => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status })
        .eq('user_id', userId);

      if (error) throw error;

      // If deactivating, also disable trading
      if (status !== 'active') {
        await supabase
          .from('trading_configs')
          .update({ is_trading_enabled: false })
          .eq('user_id', userId);
      }

      toast.success(`User subscription ${status}`);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating subscription:', error);
      toast.error(error.message || 'Failed to update subscription');
    } finally {
      setIsUpdating(false);
    }
  };

  const updateExpiryDate = async () => {
    if (!selectedUser || !newExpiryDate) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ expiry_date: new Date(newExpiryDate).toISOString() })
        .eq('user_id', selectedUser.user_id);

      if (error) throw error;

      toast.success('Expiry date updated');
      setSelectedUser(null);
      setNewExpiryDate('');
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating expiry date:', error);
      toast.error(error.message || 'Failed to update expiry date');
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeUsers = users.filter(
    (u) => u.subscription?.status === 'active' && new Date(u.subscription.expiry_date) > new Date()
  ).length;

  const tradingUsers = users.filter((u) => u.trading_config?.is_trading_enabled).length;

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen gradient-hero">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center glow-primary">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <span className="text-xl font-bold text-gradient-primary">Admin Panel</span>
              </div>
            </div>
            <Button variant="outline" onClick={fetchUsers}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="card-trading">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-3xl font-bold text-gradient-primary">{users.length}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-trading">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Subscriptions</p>
                  <p className="text-3xl font-bold text-success">{activeUsers}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                  <UserCheck className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-trading">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Trading Active</p>
                  <p className="text-3xl font-bold text-warning">{tradingUsers}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="scanner" className="flex items-center gap-2">
              <Radio className="h-4 w-4" />
              Market Scanner
            </TabsTrigger>
            <TabsTrigger value="simulator" className="flex items-center gap-2">
              <Timer className="h-4 w-4" />
              Trade Simulator
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
        {/* Users Table */}
        <Card className="card-trading border-glow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage subscriber accounts and subscriptions</CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-secondary/50"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/30">
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>MT5</TableHead>
                    <TableHead>Trading</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((userData) => (
                    <TableRow key={userData.id} className="hover:bg-secondary/20">
                      <TableCell>
                        <div>
                          <p className="font-medium">{userData.email}</p>
                          {userData.full_name && (
                            <p className="text-sm text-muted-foreground">{userData.full_name}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            userData.subscription?.status === 'active'
                              ? 'default'
                              : userData.subscription?.status === 'suspended'
                              ? 'secondary'
                              : 'destructive'
                          }
                        >
                          {userData.subscription?.status || 'No subscription'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {userData.subscription ? (
                          <span className="text-sm font-mono">
                            {format(new Date(userData.subscription.expiry_date), 'MMM dd, yyyy')}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {userData.mt5_connection ? (
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full ${
                                userData.mt5_connection.is_connected ? 'bg-success' : 'bg-muted-foreground'
                              }`}
                            />
                            <span className="text-sm">
                              {userData.mt5_connection.trading_mode.toUpperCase()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Not connected</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {userData.trading_config?.is_trading_enabled ? (
                          <Badge variant="default" className="bg-success">
                            <Activity className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(userData);
                                  setNewExpiryDate(
                                    userData.subscription?.expiry_date?.split('T')[0] || ''
                                  );
                                }}
                              >
                                <Calendar className="h-3 w-3" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Update Expiry Date</DialogTitle>
                                <DialogDescription>
                                  Change subscription expiry for {selectedUser?.email}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label>New Expiry Date</Label>
                                  <Input
                                    type="date"
                                    value={newExpiryDate}
                                    onChange={(e) => setNewExpiryDate(e.target.value)}
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button
                                  variant="hero"
                                  onClick={updateExpiryDate}
                                  disabled={isUpdating}
                                >
                                  {isUpdating ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    'Update'
                                  )}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          {userData.subscription?.status === 'active' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                updateSubscriptionStatus(userData.user_id, 'suspended')
                              }
                              disabled={isUpdating}
                            >
                              <UserX className="h-3 w-3" />
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                updateSubscriptionStatus(userData.user_id, 'active')
                              }
                              disabled={isUpdating}
                            >
                              <UserCheck className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="scanner">
            <MarketScannerCard />
          </TabsContent>

          <TabsContent value="simulator">
            <TradeSimulatorCard />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
