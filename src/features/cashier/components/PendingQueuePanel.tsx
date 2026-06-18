import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Clock, RefreshCw, Search, Ticket, User, ChevronRight } from 'lucide-react';
import { usePendingQueue } from '../hooks/usePendingQueue';
import { DispensaryQueueEntry } from '../../dispensary/types/dispensary';

export const PendingQueuePanel = () => {
  const navigate = useNavigate();
  const { queue, isLoading, error, searchTerm, setSearchTerm, refresh } = usePendingQueue();

  const handleSelectTicket = (entry: DispensaryQueueEntry) => {
    // Navigate to NewSale with the queue entry pre-loaded in router state
    navigate('/new-sale', {
      state: {
        fromQueue: true,
        queueEntryId: entry.id,
        queueNumber: entry.queue_number,
        patientName: entry.patient_name || '',
        items: entry.items.map(item => ({
          id: item.id,
          name: item.name,
          sku: item.sku,
          price: item.price,
          quantity: item.quantity,
          unit: item.unit,
        })),
        subtotal: entry.subtotal,
      },
    });
  };

  return (
    <Card className="border-blue-200 dark:border-blue-900">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Ticket className="h-5 w-5 text-blue-500" />
            Dispensary Queue
            {queue.length > 0 && (
              <Badge className="bg-blue-500 text-white ml-1">{queue.length}</Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={refresh}
            disabled={isLoading}
            title="Refresh queue"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search ticket or patient name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {error && (
          <p className="text-xs text-destructive mb-2">{error}</p>
        )}

        {isLoading && queue.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-6">Loading queue...</p>
        ) : queue.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <Ticket className="h-10 w-10 text-muted-foreground/40 mx-auto" />
            <p className="text-muted-foreground text-sm">No pending tickets</p>
            <p className="text-xs text-muted-foreground/60">Tickets from Dispensers will appear here</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {queue.map(entry => (
              <button
                key={entry.id}
                onClick={() => handleSelectTicket(entry)}
                className="w-full text-left rounded-lg border border-border bg-card hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-300 transition-all p-3 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-blue-600 dark:text-blue-400 text-sm tracking-wide">
                        {entry.queue_number}
                      </span>
                      <Badge variant="outline" className="text-xs py-0">
                        {entry.items.length} item{entry.items.length > 1 ? 's' : ''}
                      </Badge>
                    </div>

                    {entry.patient_name && (
                      <div className="flex items-center gap-1 mt-1">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground truncate">
                          {entry.patient_name}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.created_at).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })} • {entry.dispenser_name}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-sm font-semibold">
                      ₦{entry.subtotal.toLocaleString()}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-500 transition-colors" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
