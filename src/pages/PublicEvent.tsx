import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, MapPin, Download, Share2, ArrowLeft, DollarSign, Ticket } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { z } from 'zod';
import { TicketCard } from '@/components/TicketCard';

const claimSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  phone: z.string().trim().min(10, "Valid phone number required").max(20)
});

const PublicEvent = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<any>(null);
  const [claimedTicket, setClaimedTicket] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    
    const fetchEvent = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .maybeSingle();
      
      if (error || !data) {
        toast.error('Event not found');
        navigate('/public-events');
        return;
      }
      
      setEvent(data);
    };
    
    fetchEvent();
  }, [eventId, navigate]);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validated = claimSchema.parse(formData);
      setLoading(true);
      
      // Generate ticket code
      const ticketCode = `${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      
      const { data: ticket, error } = await supabase
        .from('tickets')
        .insert({
          event_id: eventId,
          attendee_name: validated.name,
          attendee_phone: validated.phone,
          attendee_email: '',
          ticket_code: ticketCode
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setClaimedTicket({ ...ticket, events: event });
      toast.success('Ticket claimed successfully!');
      
      // Open WhatsApp - provide alternative if blocked
      const ticketUrl = `${window.location.origin}/ticket/${ticket.id}`;
      const message = `🎫 Your ticket for ${event.title}\n\nEvent: ${event.title}\nDate: ${format(new Date(event.event_date), 'PPP')}\nVenue: ${event.venue}\nTicket Code: ${ticketCode}\n\nView your ticket: ${ticketUrl}`;
      
      // Copy to clipboard as fallback
      navigator.clipboard.writeText(`${message}\n\nManually open WhatsApp and send this to ${validated.phone}`);
      
      // Try to open WhatsApp
      const cleanPhone = validated.phone.replace(/\D/g, '');
      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      
      const popup = window.open(whatsappUrl, '_blank');
      if (!popup) {
        toast.info('Ticket link copied to clipboard! Please manually send to WhatsApp', {
          duration: 5000
        });
      }
      
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error('Failed to claim ticket');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    toast.info('To save your ticket, take a screenshot of this page or use the share button');
  };

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading event...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="container mx-auto max-w-4xl">
        <Button variant="ghost" onClick={() => navigate('/public-events')} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Events
        </Button>

        {/* Event Details */}
        <Card className="mb-8">
          {event.image_url && (
            <div className="w-full h-64 md:h-80 overflow-hidden rounded-t-lg">
              <img 
                src={event.image_url} 
                alt={event.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <CardHeader>
            <CardTitle className="text-3xl">{event.title}</CardTitle>
            <CardDescription className="flex items-center gap-2 text-lg">
              <Calendar className="w-5 h-5" />
              {format(new Date(event.event_date), 'PPP')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {event.venue}
              </a>
            </p>
            {event.description && (
              <p className="text-muted-foreground">{event.description}</p>
            )}
            {event.promotion_text && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                <p className="text-primary font-semibold">🎉 {event.promotion_text}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ticket Claiming or Display */}
        {!event.is_free ? (
          <Card>
            <CardHeader>
              <CardTitle>Paid Event</CardTitle>
              <CardDescription>This is a paid event - ticket purchase coming soon!</CardDescription>
            </CardHeader>
            <CardContent className="text-center py-8">
              <DollarSign className="w-16 h-16 mx-auto mb-4 text-primary" />
              <p className="text-2xl font-bold mb-2">
                {event.ticket_price} {event.currency}
              </p>
              <p className="text-muted-foreground mb-6">
                Online ticket purchase will be available soon
              </p>
              <Button variant="outline" disabled>
                <Ticket className="w-4 h-4 mr-2" />
                Purchase Ticket (Coming Soon)
              </Button>
            </CardContent>
          </Card>
        ) : !claimedTicket ? (
          <Card>
            <CardHeader>
              <CardTitle>Claim Your Free Ticket</CardTitle>
              <CardDescription>Enter your details to receive your ticket</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleClaim} className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter your name"
                    required
                    maxLength={100}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number (with country code) *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1234567890"
                    required
                    maxLength={20}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    We'll send your ticket link to this number
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Claiming...' : 'Claim Free Ticket'}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Your Ticket</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  const ticketUrl = `${window.location.origin}/ticket/${claimedTicket.id}`;
                  if (navigator.share) {
                    navigator.share({ url: ticketUrl });
                  } else {
                    navigator.clipboard.writeText(ticketUrl);
                    toast.success('Ticket link copied!');
                  }
                }}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
            <TicketCard ticket={claimedTicket} />
            <p className="text-sm text-muted-foreground text-center">
              Your ticket has been sent to WhatsApp. Please present this ticket and your ID card at entry.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicEvent;