import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, AlertTriangle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

interface Subscription {
  status: 'active' | 'suspended' | 'expired';
  activation_date: string;
  expiry_date: string;
}

interface SubscriptionCardProps {
  subscription: Subscription | null;
  isActive: boolean;
}

export default function SubscriptionCard({ subscription, isActive }: SubscriptionCardProps) {
  const daysRemaining = subscription 
    ? differenceInDays(new Date(subscription.expiry_date), new Date())
    : 0;

  const getStatusColor = () => {
    if (!subscription) return 'bg-muted';
    if (subscription.status === 'active' && daysRemaining > 7) return 'bg-success';
    if (subscription.status === 'active' && daysRemaining > 0) return 'bg-warning';
    if (subscription.status === 'suspended') return 'bg-warning';
    return 'bg-destructive';
  };

  return (
    <Card className="card-trading border-glow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Subscription
            </CardTitle>
            <CardDescription>Your account subscription status</CardDescription>
          </div>
          <Badge 
            variant={isActive ? 'default' : 'destructive'}
            className={isActive ? 'glow-success' : ''}
          >
            {subscription?.status?.toUpperCase() || 'NO SUBSCRIPTION'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {subscription ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-secondary/50">
                <p className="text-sm text-muted-foreground mb-1">Activated</p>
                <p className="font-semibold">
                  {format(new Date(subscription.activation_date), 'MMM dd, yyyy')}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/50">
                <p className="text-sm text-muted-foreground mb-1">Expires</p>
                <p className="font-semibold">
                  {format(new Date(subscription.expiry_date), 'MMM dd, yyyy')}
                </p>
              </div>
            </div>

            <div className={`p-4 rounded-lg ${daysRemaining <= 7 && daysRemaining > 0 ? 'bg-warning/10 border border-warning/30' : 'bg-secondary/30'}`}>
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full ${getStatusColor()} flex items-center justify-center`}>
                  {daysRemaining <= 7 && daysRemaining > 0 ? (
                    <AlertTriangle className="h-5 w-5 text-warning-foreground" />
                  ) : (
                    <Clock className="h-5 w-5 text-primary-foreground" />
                  )}
                </div>
                <div>
                  <p className="font-semibold">
                    {daysRemaining > 0 
                      ? `${daysRemaining} days remaining`
                      : 'Subscription expired'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isActive 
                      ? 'Trading is enabled'
                      : 'Trading is disabled'}
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No subscription found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Contact support to activate your account
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
