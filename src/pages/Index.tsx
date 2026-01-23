import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  TrendingUp, 
  Shield, 
  Zap, 
  BarChart3, 
  Clock, 
  Target,
  ArrowRight,
  Check,
  Activity,
  Wallet
} from 'lucide-react';
import { useEffect } from 'react';

const FEATURES = [
  {
    icon: TrendingUp,
    title: 'Automated Trading',
    description: 'Advanced algorithms execute trades 24/7 on your MT5 account with precision.',
  },
  {
    icon: Shield,
    title: 'Secure & Encrypted',
    description: 'Your MT5 credentials are encrypted at rest. We never expose your data.',
  },
  {
    icon: Target,
    title: 'Custom Take Profit',
    description: 'Set your preferred take profit from preset values or enter custom amounts.',
  },
  {
    icon: Clock,
    title: 'Real-Time Execution',
    description: 'Instant trade execution when market conditions meet your configured parameters.',
  },
  {
    icon: BarChart3,
    title: 'Performance Tracking',
    description: 'Monitor all your trades, profits, and losses in a beautiful dashboard.',
  },
  {
    icon: Activity,
    title: 'Live Monitoring',
    description: 'Watch your bot status and account balance update in real-time.',
  },
];

const INSTRUMENTS = ['USD/JPY', 'CAD/JPY', 'GBP/JPY', 'EUR/JPY', 'AUD/JPY', 'CHF/JPY', 'XAU/USD'];

export default function Index() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen gradient-hero">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center glow-primary animate-pulse-glow">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <span className="text-xl font-bold text-gradient-primary">SUPERJONNIE</span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/auth')}>
                Sign In
              </Button>
              <Button variant="hero" onClick={() => navigate('/auth')}>
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 animate-fade-in">
            <span className="h-2 w-2 rounded-full bg-success pulse-live" />
            <span className="text-sm text-muted-foreground">XM Global MT5 Compatible</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Automated MT5 Trading
            <br />
            <span className="text-gradient-primary">Made Simple</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Connect your MetaTrader 5 account and let our advanced trading bot execute profitable trades 
            on JPY pairs and Gold with configurable take profit and stop loss settings.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <Button variant="hero" size="xl" onClick={() => navigate('/auth')}>
              Start Trading Now
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="lg">
              View Demo
            </Button>
          </div>

          {/* Trading Pairs */}
          <div className="flex flex-wrap items-center justify-center gap-3 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            {INSTRUMENTS.map((pair) => (
              <span
                key={pair}
                className="px-4 py-2 rounded-lg bg-secondary/50 border border-border font-mono text-sm hover:border-primary/50 transition-colors cursor-default"
              >
                {pair}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-6 border-y border-border/50 bg-card/30">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <p className="text-4xl font-bold text-gradient-primary mb-2">7</p>
              <p className="text-muted-foreground">Trading Pairs</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-success mb-2">24/7</p>
              <p className="text-muted-foreground">Bot Uptime</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-warning mb-2">&lt;50ms</p>
              <p className="text-muted-foreground">Execution Speed</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-primary mb-2">100%</p>
              <p className="text-muted-foreground">Secure</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to <span className="text-gradient-primary">Trade Smarter</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Our platform combines powerful automation with intuitive controls to give you 
              the best trading experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, index) => (
              <Card 
                key={feature.title} 
                className="card-trading border-glow hover:border-primary/30 transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-card/30 border-y border-border/50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Get Started in <span className="text-gradient-primary">3 Simple Steps</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Create Account',
                description: 'Sign up and get instant access to your trading dashboard.',
                icon: Wallet,
              },
              {
                step: '02',
                title: 'Connect MT5',
                description: 'Link your XM Global MT5 account securely to our platform.',
                icon: Shield,
              },
              {
                step: '03',
                title: 'Start Trading',
                description: 'Configure your settings and let the bot trade for you.',
                icon: TrendingUp,
              },
            ].map((item, index) => (
              <div key={item.step} className="relative">
                <div className="text-center">
                  <span className="text-6xl font-bold text-primary/20">{item.step}</span>
                  <div className="mt-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto glow-primary">
                    <item.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mt-4 mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/3 right-0 translate-x-1/2 w-12 h-[2px] bg-gradient-to-r from-primary/50 to-transparent" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <Card className="card-trading border-glow overflow-hidden">
            <CardContent className="p-12 text-center relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
              <div className="relative">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Ready to Start <span className="text-gradient-primary">Automated Trading</span>?
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto mb-8">
                  Join traders who trust SUPERJONNIE to manage their MT5 accounts with 
                  precision and security.
                </p>
                <Button variant="hero" size="xl" onClick={() => navigate('/auth')}>
                  Create Free Account
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border/50">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <span className="font-bold text-gradient-primary">SUPERJONNIE</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 SUPERJONNIE. All rights reserved. Trading involves risk.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
