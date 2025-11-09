import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { TicketCard } from '@/components/TicketCard';
import { SocialShare } from '@/components/SocialShare';
import { ArrowLeft, Download, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import html2canvas from 'html2canvas';

const TicketViewer = () => {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<any>(null);

  useEffect(() => {
    if (!ticketId) return;

    const fetchTicket = async () => {
      const { data, error } = await (supabase as any)
        .from('tickets')
        .select('*, events(*)')
        .eq('id', ticketId)
        .single();

      if (error || !data) {
        toast.error('Ticket not found');
        navigate('/');
        return;
      }

      setTicket(data);
    };

    fetchTicket();

    // Subscribe to ticket updates (validation status)
    const channel = supabase
      .channel('ticket-viewer')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tickets',
          filter: `id=eq.${ticketId}`
        },
        (payload) => {
          setTicket((prev: any) => ({ ...prev, ...payload.new }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, navigate]);

  const handleDownload = async () => {
    const ticketElement = document.getElementById('ticket-card');
    if (!ticketElement) return;

    try {
      toast.info('Generating ticket image...');
      const canvas = await html2canvas(ticketElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
      });
      
      const link = document.createElement('a');
      link.download = `ticket-${ticket.ticket_code}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast.success('Ticket downloaded!');
    } catch (error) {
      toast.error('Failed to download ticket. Try taking a screenshot instead.');
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    const text = `My ticket for ${ticket.events.title}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Ticket: ${ticket.events.title}`,
          text,
          url
        });
      } catch (error) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      toast.success('Link copied to clipboard!');
    }
  };

  if (!ticket) return null;

  return (
    <div className="min-h-screen p-8">
      {/* Animated background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-20 left-10 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-accent/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
      </div>

      <div className="container mx-auto max-w-2xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="space-y-6">
          <div id="ticket-card">
            <TicketCard ticket={ticket} />
          </div>

          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Save & Share
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={handleDownload}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={handleShare}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
              
              <SocialShare 
                url={window.location.href}
                title={`Ticket for ${ticket.events.title}`}
                description={`Check out my ticket for ${ticket.events.title}!`}
              />
            </CardContent>
          </Card>

          {ticket.is_validated && (
            <div className="p-4 rounded-lg border-2 border-primary/30 bg-primary/10 text-center">
              <p className="text-sm text-primary font-semibold">
                ✓ This ticket has been validated and used for entry
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketViewer;