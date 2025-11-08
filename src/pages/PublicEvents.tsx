import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Ticket, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

const PublicEvents = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true });
      
      if (data) setEvents(data);
      setLoading(false);
    };
    
    fetchEvents();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading events...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gradient-cyber mb-4">Upcoming Events</h1>
          <p className="text-xl text-muted-foreground">Discover and claim your tickets</p>
        </div>
        
        {events.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground text-lg">No upcoming events at the moment</p>
              <p className="text-sm text-muted-foreground mt-2">Check back soon!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <Card 
                key={event.id} 
                className="border-2 border-primary/20 hover:border-primary/40 transition-all hover:shadow-neon-cyan cursor-pointer"
                onClick={() => navigate(`/e/${event.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-xl">{event.title}</CardTitle>
                    {event.is_free ? (
                      <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                        FREE
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {event.ticket_price} {event.currency}
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(event.event_date), 'PPP')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4" />
                    {event.venue}
                  </p>
                  {event.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {event.description}
                    </p>
                  )}
                  {event.promotion_text && (
                    <div className="bg-primary/10 border border-primary/20 rounded p-2">
                      <p className="text-xs text-primary font-semibold">🎉 {event.promotion_text}</p>
                    </div>
                  )}
                  <Button 
                    variant={event.is_free ? "default" : "outline"} 
                    className="w-full mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/e/${event.id}`);
                    }}
                  >
                    <Ticket className="w-4 h-4 mr-2" />
                    {event.is_free ? 'Get Free Ticket' : 'Buy Tickets'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicEvents;