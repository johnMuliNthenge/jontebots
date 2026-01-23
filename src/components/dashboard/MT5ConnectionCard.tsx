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

const BROKERS = [
  { label: 'XM Global', value: 'xm' },
  { label: 'Exness', value: 'exness' },
  { label: 'IC Markets', value: 'icmarkets' },
  { label: 'FBS', value: 'fbs' },
  { label: 'FXTM (ForexTime)', value: 'fxtm' },
  { label: 'Pepperstone', value: 'pepperstone' },
  { label: 'RoboForex', value: 'roboforex' },
  { label: 'Tickmill', value: 'tickmill' },
  { label: 'Admirals', value: 'admirals' },
  { label: 'OctaFX', value: 'octafx' },
  { label: 'HFM (HotForex)', value: 'hfm' },
  { label: 'FxPro', value: 'fxpro' },
  { label: 'AvaTrade', value: 'avatrade' },
  { label: 'OANDA', value: 'oanda' },
  { label: 'XTB', value: 'xtb' },
  { label: 'Plus500', value: 'plus500' },
  { label: 'eToro', value: 'etoro' },
  { label: 'FXCM', value: 'fxcm' },
  { label: 'Axi', value: 'axi' },
  { label: 'Vantage', value: 'vantage' },
];

const MT5_SERVERS_BY_BROKER: Record<string, Array<{ label: string; value: string }>> = {
  xm: [
    // Demo Servers
    { label: 'XMGlobal-MT5 (Demo)', value: 'XMGlobal-MT5' },
    { label: 'XMGlobal-MT5 2 (Demo)', value: 'XMGlobal-MT5 2' },
    { label: 'XMGlobal-MT5 3 (Demo)', value: 'XMGlobal-MT5 3' },
    { label: 'XMGlobal-MT5 4 (Demo)', value: 'XMGlobal-MT5 4' },
    { label: 'XMGlobal-MT5 5 (Demo)', value: 'XMGlobal-MT5 5' },
    { label: 'XMGlobal-MT5 6 (Demo)', value: 'XMGlobal-MT5 6' },
    { label: 'XMGlobal-MT5 7 (Demo)', value: 'XMGlobal-MT5 7' },
    { label: 'XMGlobal-MT5 8 (Demo)', value: 'XMGlobal-MT5 8' },
    { label: 'XMGlobal-MT5 9 (Demo)', value: 'XMGlobal-MT5 9' },
    { label: 'XMGlobal-MT5 10 (Demo)', value: 'XMGlobal-MT5 10' },
    // Live Servers
    { label: 'XMGlobal-Real 1 (Live)', value: 'XMGlobal-Real 1' },
    { label: 'XMGlobal-Real 2 (Live)', value: 'XMGlobal-Real 2' },
    { label: 'XMGlobal-Real 3 (Live)', value: 'XMGlobal-Real 3' },
    { label: 'XMGlobal-Real 4 (Live)', value: 'XMGlobal-Real 4' },
    { label: 'XMGlobal-Real 5 (Live)', value: 'XMGlobal-Real 5' },
    { label: 'XMGlobal-Real 6 (Live)', value: 'XMGlobal-Real 6' },
    { label: 'XMGlobal-Real 7 (Live)', value: 'XMGlobal-Real 7' },
    { label: 'XMGlobal-Real 8 (Live)', value: 'XMGlobal-Real 8' },
    { label: 'XMGlobal-Real 9 (Live)', value: 'XMGlobal-Real 9' },
    { label: 'XMGlobal-Real 10 (Live)', value: 'XMGlobal-Real 10' },
    { label: 'XMGlobal-Real 11 (Live)', value: 'XMGlobal-Real 11' },
    { label: 'XMGlobal-Real 12 (Live)', value: 'XMGlobal-Real 12' },
    { label: 'XMGlobal-Real 13 (Live)', value: 'XMGlobal-Real 13' },
    { label: 'XMGlobal-Real 14 (Live)', value: 'XMGlobal-Real 14' },
    { label: 'XMGlobal-Real 15 (Live)', value: 'XMGlobal-Real 15' },
  ],
  exness: [
    // Demo Servers
    { label: 'Exness-MT5Trial (Demo)', value: 'Exness-MT5Trial' },
    { label: 'Exness-MT5Trial2 (Demo)', value: 'Exness-MT5Trial2' },
    { label: 'Exness-MT5Trial3 (Demo)', value: 'Exness-MT5Trial3' },
    { label: 'Exness-MT5Trial4 (Demo)', value: 'Exness-MT5Trial4' },
    { label: 'Exness-MT5Trial5 (Demo)', value: 'Exness-MT5Trial5' },
    { label: 'Exness-MT5Trial6 (Demo)', value: 'Exness-MT5Trial6' },
    { label: 'Exness-MT5Trial7 (Demo)', value: 'Exness-MT5Trial7' },
    { label: 'Exness-MT5Trial8 (Demo)', value: 'Exness-MT5Trial8' },
    // Live Servers
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
    { label: 'Exness-MT5Real11 (Live)', value: 'Exness-MT5Real11' },
    { label: 'Exness-MT5Real12 (Live)', value: 'Exness-MT5Real12' },
    { label: 'Exness-MT5Real13 (Live)', value: 'Exness-MT5Real13' },
    { label: 'Exness-MT5Real14 (Live)', value: 'Exness-MT5Real14' },
    { label: 'Exness-MT5Real15 (Live)', value: 'Exness-MT5Real15' },
  ],
  icmarkets: [
    // Demo Servers
    { label: 'ICMarketsSC-Demo (Demo)', value: 'ICMarketsSC-Demo' },
    { label: 'ICMarketsSC-Demo02 (Demo)', value: 'ICMarketsSC-Demo02' },
    { label: 'ICMarketsSC-Demo03 (Demo)', value: 'ICMarketsSC-Demo03' },
    { label: 'ICMarketsSC-Demo04 (Demo)', value: 'ICMarketsSC-Demo04' },
    { label: 'ICMarketsSC-Demo05 (Demo)', value: 'ICMarketsSC-Demo05' },
    // Live Servers
    { label: 'ICMarketsSC-MT5 (Live)', value: 'ICMarketsSC-MT5' },
    { label: 'ICMarketsSC-MT5-2 (Live)', value: 'ICMarketsSC-MT5-2' },
    { label: 'ICMarketsSC-MT5-3 (Live)', value: 'ICMarketsSC-MT5-3' },
    { label: 'ICMarketsSC-MT5-4 (Live)', value: 'ICMarketsSC-MT5-4' },
    { label: 'ICMarketsSC-MT5-5 (Live)', value: 'ICMarketsSC-MT5-5' },
    { label: 'ICMarketsSC-MT5-6 (Live)', value: 'ICMarketsSC-MT5-6' },
    { label: 'ICMarketsSC-MT5-7 (Live)', value: 'ICMarketsSC-MT5-7' },
    { label: 'ICMarketsSC-MT5-8 (Live)', value: 'ICMarketsSC-MT5-8' },
  ],
  fbs: [
    // Demo Servers
    { label: 'FBS-Demo (Demo)', value: 'FBS-Demo' },
    { label: 'FBS-Demo-2 (Demo)', value: 'FBS-Demo-2' },
    { label: 'FBS-Demo-3 (Demo)', value: 'FBS-Demo-3' },
    { label: 'FBS-Demo-4 (Demo)', value: 'FBS-Demo-4' },
    // Live Servers
    { label: 'FBS-Real (Live)', value: 'FBS-Real' },
    { label: 'FBS-Real-2 (Live)', value: 'FBS-Real-2' },
    { label: 'FBS-Real-3 (Live)', value: 'FBS-Real-3' },
    { label: 'FBS-Real-4 (Live)', value: 'FBS-Real-4' },
    { label: 'FBS-Real-5 (Live)', value: 'FBS-Real-5' },
    { label: 'FBS-Real-6 (Live)', value: 'FBS-Real-6' },
  ],
  fxtm: [
    // Demo Servers
    { label: 'ForexTimeFXTM-Demo01 (Demo)', value: 'ForexTimeFXTM-Demo01' },
    { label: 'ForexTimeFXTM-Demo02 (Demo)', value: 'ForexTimeFXTM-Demo02' },
    { label: 'ForexTimeFXTM-Demo03 (Demo)', value: 'ForexTimeFXTM-Demo03' },
    { label: 'ForexTimeFXTM-Demo04 (Demo)', value: 'ForexTimeFXTM-Demo04' },
    { label: 'ForexTimeFXTM-Demo05 (Demo)', value: 'ForexTimeFXTM-Demo05' },
    // Live Servers
    { label: 'ForexTimeFXTM-MT5 (Live)', value: 'ForexTimeFXTM-MT5' },
    { label: 'ForexTimeFXTM-MT5-2 (Live)', value: 'ForexTimeFXTM-MT5-2' },
    { label: 'ForexTimeFXTM-MT5-3 (Live)', value: 'ForexTimeFXTM-MT5-3' },
    { label: 'ForexTimeFXTM-MT5-4 (Live)', value: 'ForexTimeFXTM-MT5-4' },
    { label: 'ForexTimeFXTM-MT5-5 (Live)', value: 'ForexTimeFXTM-MT5-5' },
  ],
  pepperstone: [
    // Demo Servers
    { label: 'Pepperstone-Demo (Demo)', value: 'Pepperstone-Demo' },
    { label: 'Pepperstone-Demo02 (Demo)', value: 'Pepperstone-Demo02' },
    { label: 'Pepperstone-Demo03 (Demo)', value: 'Pepperstone-Demo03' },
    { label: 'Pepperstone-Demo04 (Demo)', value: 'Pepperstone-Demo04' },
    // Live Servers
    { label: 'Pepperstone-MT5-Live01 (Live)', value: 'Pepperstone-MT5-Live01' },
    { label: 'Pepperstone-MT5-Live02 (Live)', value: 'Pepperstone-MT5-Live02' },
    { label: 'Pepperstone-MT5-Live03 (Live)', value: 'Pepperstone-MT5-Live03' },
    { label: 'Pepperstone-MT5-Live04 (Live)', value: 'Pepperstone-MT5-Live04' },
    { label: 'Pepperstone-MT5-Live05 (Live)', value: 'Pepperstone-MT5-Live05' },
  ],
  roboforex: [
    // Demo Servers
    { label: 'RoboForex-DemoUS (Demo)', value: 'RoboForex-DemoUS' },
    { label: 'RoboForex-Demo (Demo)', value: 'RoboForex-Demo' },
    { label: 'RoboForex-Demo2 (Demo)', value: 'RoboForex-Demo2' },
    { label: 'RoboForex-Demo3 (Demo)', value: 'RoboForex-Demo3' },
    // Live Servers
    { label: 'RoboForex-MT5 (Live)', value: 'RoboForex-MT5' },
    { label: 'RoboForex-Prime (Live)', value: 'RoboForex-Prime' },
    { label: 'RoboForex-Pro (Live)', value: 'RoboForex-Pro' },
    { label: 'RoboForex-ECN (Live)', value: 'RoboForex-ECN' },
    { label: 'RoboForex-ProCent (Live)', value: 'RoboForex-ProCent' },
  ],
  tickmill: [
    // Demo Servers
    { label: 'Tickmill-Demo (Demo)', value: 'Tickmill-Demo' },
    { label: 'Tickmill-Demo-EU (Demo)', value: 'Tickmill-Demo-EU' },
    { label: 'Tickmill-Demo-UK (Demo)', value: 'Tickmill-Demo-UK' },
    // Live Servers
    { label: 'Tickmill-Live (Live)', value: 'Tickmill-Live' },
    { label: 'Tickmill-Live-EU (Live)', value: 'Tickmill-Live-EU' },
    { label: 'Tickmill-Live-UK (Live)', value: 'Tickmill-Live-UK' },
    { label: 'Tickmill-Live02 (Live)', value: 'Tickmill-Live02' },
  ],
  admirals: [
    // Demo Servers
    { label: 'AdmiralMarkets-Demo (Demo)', value: 'AdmiralMarkets-Demo' },
    { label: 'AdmiralMarkets-Demo2 (Demo)', value: 'AdmiralMarkets-Demo2' },
    { label: 'AdmiralMarkets-Demo3 (Demo)', value: 'AdmiralMarkets-Demo3' },
    // Live Servers
    { label: 'AdmiralMarkets-MT5 (Live)', value: 'AdmiralMarkets-MT5' },
    { label: 'AdmiralMarkets-MT5-2 (Live)', value: 'AdmiralMarkets-MT5-2' },
    { label: 'AdmiralMarkets-MT5-3 (Live)', value: 'AdmiralMarkets-MT5-3' },
    { label: 'AdmiralMarkets-MT5-4 (Live)', value: 'AdmiralMarkets-MT5-4' },
  ],
  octafx: [
    // Demo Servers
    { label: 'OctaFX-Demo (Demo)', value: 'OctaFX-Demo' },
    { label: 'OctaFX-Demo2 (Demo)', value: 'OctaFX-Demo2' },
    { label: 'OctaFX-Demo3 (Demo)', value: 'OctaFX-Demo3' },
    // Live Servers
    { label: 'OctaFX-Real (Live)', value: 'OctaFX-Real' },
    { label: 'OctaFX-Real2 (Live)', value: 'OctaFX-Real2' },
    { label: 'OctaFX-Real3 (Live)', value: 'OctaFX-Real3' },
    { label: 'OctaFX-Real4 (Live)', value: 'OctaFX-Real4' },
    { label: 'OctaFX-Real5 (Live)', value: 'OctaFX-Real5' },
  ],
  hfm: [
    // Demo Servers
    { label: 'HFMarketsSV-Demo (Demo)', value: 'HFMarketsSV-Demo' },
    { label: 'HFMarketsSV-Demo2 (Demo)', value: 'HFMarketsSV-Demo2' },
    { label: 'HFMarketsSV-Demo3 (Demo)', value: 'HFMarketsSV-Demo3' },
    { label: 'HFMarketsSV-Demo4 (Demo)', value: 'HFMarketsSV-Demo4' },
    // Live Servers
    { label: 'HFMarketsSV-Live (Live)', value: 'HFMarketsSV-Live' },
    { label: 'HFMarketsSV-Live2 (Live)', value: 'HFMarketsSV-Live2' },
    { label: 'HFMarketsSV-Live3 (Live)', value: 'HFMarketsSV-Live3' },
    { label: 'HFMarketsSV-Live4 (Live)', value: 'HFMarketsSV-Live4' },
    { label: 'HFMarketsSV-Live5 (Live)', value: 'HFMarketsSV-Live5' },
  ],
  fxpro: [
    // Demo Servers
    { label: 'FxPro-MT5 Demo (Demo)', value: 'FxPro-MT5 Demo' },
    { label: 'FxPro-MT5 Demo2 (Demo)', value: 'FxPro-MT5 Demo2' },
    { label: 'FxPro-MT5 Demo3 (Demo)', value: 'FxPro-MT5 Demo3' },
    // Live Servers
    { label: 'FxPro-MT5 (Live)', value: 'FxPro-MT5' },
    { label: 'FxPro-MT5-02 (Live)', value: 'FxPro-MT5-02' },
    { label: 'FxPro-MT5-03 (Live)', value: 'FxPro-MT5-03' },
    { label: 'FxPro-MT5-04 (Live)', value: 'FxPro-MT5-04' },
  ],
  avatrade: [
    // Demo Servers
    { label: 'AvaTrade-Demo (Demo)', value: 'AvaTrade-Demo' },
    { label: 'AvaTrade-Demo-EU (Demo)', value: 'AvaTrade-Demo-EU' },
    { label: 'AvaTrade-Demo-UK (Demo)', value: 'AvaTrade-Demo-UK' },
    // Live Servers
    { label: 'AvaTrade-MT5 (Live)', value: 'AvaTrade-MT5' },
    { label: 'AvaTrade-MT5-EU (Live)', value: 'AvaTrade-MT5-EU' },
    { label: 'AvaTrade-MT5-UK (Live)', value: 'AvaTrade-MT5-UK' },
    { label: 'AvaTrade-MT5-02 (Live)', value: 'AvaTrade-MT5-02' },
  ],
  oanda: [
    // Demo Servers
    { label: 'OANDA-Demo-1 (Demo)', value: 'OANDA-Demo-1' },
    { label: 'OANDA-Demo-2 (Demo)', value: 'OANDA-Demo-2' },
    { label: 'OANDA-Demo-3 (Demo)', value: 'OANDA-Demo-3' },
    // Live Servers
    { label: 'OANDA-MT5-1 (Live)', value: 'OANDA-MT5-1' },
    { label: 'OANDA-MT5-2 (Live)', value: 'OANDA-MT5-2' },
    { label: 'OANDA-MT5-3 (Live)', value: 'OANDA-MT5-3' },
  ],
  xtb: [
    // Demo Servers
    { label: 'XTB-Demo (Demo)', value: 'XTB-Demo' },
    { label: 'XTB-Demo2 (Demo)', value: 'XTB-Demo2' },
    // Live Servers
    { label: 'XTB-Real (Live)', value: 'XTB-Real' },
    { label: 'XTB-Real2 (Live)', value: 'XTB-Real2' },
    { label: 'XTB-Real3 (Live)', value: 'XTB-Real3' },
  ],
  plus500: [
    // Demo Servers
    { label: 'Plus500-Demo (Demo)', value: 'Plus500-Demo' },
    { label: 'Plus500-Demo2 (Demo)', value: 'Plus500-Demo2' },
    // Live Servers
    { label: 'Plus500-Real (Live)', value: 'Plus500-Real' },
    { label: 'Plus500-Real2 (Live)', value: 'Plus500-Real2' },
  ],
  etoro: [
    // Demo Servers
    { label: 'eToro-Demo (Demo)', value: 'eToro-Demo' },
    { label: 'eToro-Demo2 (Demo)', value: 'eToro-Demo2' },
    // Live Servers
    { label: 'eToro-Real (Live)', value: 'eToro-Real' },
    { label: 'eToro-Real2 (Live)', value: 'eToro-Real2' },
  ],
  fxcm: [
    // Demo Servers
    { label: 'FXCM-Demo01 (Demo)', value: 'FXCM-Demo01' },
    { label: 'FXCM-Demo02 (Demo)', value: 'FXCM-Demo02' },
    { label: 'FXCM-Demo03 (Demo)', value: 'FXCM-Demo03' },
    // Live Servers
    { label: 'FXCM-MT5 (Live)', value: 'FXCM-MT5' },
    { label: 'FXCM-MT5-02 (Live)', value: 'FXCM-MT5-02' },
    { label: 'FXCM-MT5-03 (Live)', value: 'FXCM-MT5-03' },
  ],
  axi: [
    // Demo Servers
    { label: 'AxiTrader-Demo (Demo)', value: 'AxiTrader-Demo' },
    { label: 'AxiTrader-Demo02 (Demo)', value: 'AxiTrader-Demo02' },
    // Live Servers
    { label: 'AxiTrader-MT5-Live (Live)', value: 'AxiTrader-MT5-Live' },
    { label: 'AxiTrader-MT5-Live02 (Live)', value: 'AxiTrader-MT5-Live02' },
    { label: 'AxiTrader-MT5-Live03 (Live)', value: 'AxiTrader-MT5-Live03' },
  ],
  vantage: [
    // Demo Servers
    { label: 'VantageFX-Demo (Demo)', value: 'VantageFX-Demo' },
    { label: 'VantageFX-Demo2 (Demo)', value: 'VantageFX-Demo2' },
    { label: 'VantageFX-Demo3 (Demo)', value: 'VantageFX-Demo3' },
    // Live Servers
    { label: 'VantageFX-Live (Live)', value: 'VantageFX-Live' },
    { label: 'VantageFX-Live2 (Live)', value: 'VantageFX-Live2' },
    { label: 'VantageFX-Live3 (Live)', value: 'VantageFX-Live3' },
    { label: 'VantageFX-Live4 (Live)', value: 'VantageFX-Live4' },
  ],
};

// Helper to find broker from server value
const findBrokerFromServer = (serverValue: string): string => {
  for (const [broker, servers] of Object.entries(MT5_SERVERS_BY_BROKER)) {
    if (servers.some(s => s.value === serverValue)) {
      return broker;
    }
  }
  return BROKERS[0].value;
};

export default function MT5ConnectionCard({ 
  connection, 
  userId, 
  isSubscriptionActive,
  onUpdate 
}: MT5ConnectionCardProps) {
  const [isEditing, setIsEditing] = useState(!connection);
  const [isLoading, setIsLoading] = useState(false);

  const initialBroker = connection?.mt5_server ? findBrokerFromServer(connection.mt5_server) : BROKERS[0].value;
  const [selectedBroker, setSelectedBroker] = useState(initialBroker);
  const [mt5Login, setMt5Login] = useState(connection?.mt5_login || '');
  const [mt5Password, setMt5Password] = useState('');
  const [mt5Server, setMt5Server] = useState(connection?.mt5_server || MT5_SERVERS_BY_BROKER[BROKERS[0].value][0].value);
  const [tradingMode, setTradingMode] = useState<'demo' | 'live'>(connection?.trading_mode || 'demo');

  // Get servers for selected broker
  const availableServers = MT5_SERVERS_BY_BROKER[selectedBroker] || [];

  // Handle broker change - reset server to first of new broker
  const handleBrokerChange = (broker: string) => {
    setSelectedBroker(broker);
    const brokerServers = MT5_SERVERS_BY_BROKER[broker] || [];
    if (brokerServers.length > 0) {
      setMt5Server(brokerServers[0].value);
    }
  };

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
              <Label htmlFor="broker">Broker</Label>
              <Select value={selectedBroker} onValueChange={handleBrokerChange}>
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue placeholder="Select broker" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] bg-background">
                  {BROKERS.map((broker) => (
                    <SelectItem key={broker.value} value={broker.value}>
                      {broker.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mt5-server">MT5 Server</Label>
              <Select value={mt5Server} onValueChange={setMt5Server}>
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue placeholder="Select server" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] bg-background">
                  {availableServers.map((server) => (
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
                    const broker = connection.mt5_server ? findBrokerFromServer(connection.mt5_server) : BROKERS[0].value;
                    setSelectedBroker(broker);
                    setMt5Login(connection.mt5_login);
                    setMt5Password('');
                    setMt5Server(connection.mt5_server || MT5_SERVERS_BY_BROKER[broker][0].value);
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
