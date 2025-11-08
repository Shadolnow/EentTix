import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { TicketCard } from '@/components/TicketCard';
import { ArrowLeft, Download, Share2, Send } from 'lucide-react';
import { toast } from 'sonner';

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

  const handleShare = async () => {
    const shareUrl = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Ticket for ${ticket.events.title}`,
          text: `Check out my ticket for ${ticket.events.title}!`,
          url: shareUrl
        });
      } catch (error) {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleDownload = () => {
    toast.info('Screenshot this page to save your ticket!');
  };

  const handleWhatsAppShare = () => {
    if (!ticket) return;
    const url = window.location.href;
    const message = `🎫 My ticket for ${ticket.events.title}\n\nView ticket: ${url}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
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
          <TicketCard ticket={ticket} />

          <div className="flex gap-3 flex-wrap">
            <Button variant="default" className="flex-1 min-w-[140px]" onClick={handleWhatsAppShare}>
              <Send className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
            <Button variant="outline" className="flex-1 min-w-[140px]" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" className="flex-1 min-w-[140px]" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>

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