import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EventUpdateRequest {
  eventId: string;
  updateMessage: string;
  updateType: 'time' | 'venue' | 'general';
}

// HTML escape function to prevent injection
const escapeHtml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // ========== AUTHORIZATION CHECK ==========
    // Verify the authenticated user owns this event or is an admin
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      console.error('No authorization token provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No token provided' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    console.log('Authenticated user:', user.id);
    
    const { eventId, updateMessage, updateType }: EventUpdateRequest = await req.json();

    // Get event details and check ownership
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('title, event_date, venue, user_id')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      console.error('Event not found:', eventId);
      return new Response(
        JSON.stringify({ error: 'Event not found' }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if user is admin
    const { data: isAdmin } = await supabase.rpc('has_role', { 
      _user_id: user.id, 
      _role: 'admin' 
    });

    // Verify user owns the event or is admin
    if (event.user_id !== user.id && !isAdmin) {
      console.error('Forbidden - User', user.id, 'does not own event', eventId, 'and is not admin');
      return new Response(
        JSON.stringify({ error: 'Forbidden - You do not have permission to send updates for this event' }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    console.log('Authorization passed for event:', eventId);
    // ========== END AUTHORIZATION CHECK ==========

    console.log('Sending event update notification for event:', eventId);

    // Get all tickets for this event
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('attendee_email, attendee_name')
      .eq('event_id', eventId);

    if (ticketsError) {
      throw new Error('Failed to fetch ticket holders');
    }

    if (!tickets || tickets.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No ticket holders to notify' }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get update type emoji and title
    const updateInfo = {
      time: { emoji: '⏰', title: 'Event Time Update' },
      venue: { emoji: '📍', title: 'Venue Change' },
      general: { emoji: '📢', title: 'Event Update' },
    }[updateType];

    // Escape user-provided content to prevent HTML injection
    const safeEventTitle = escapeHtml(event.title);
    const safeUpdateMessage = escapeHtml(updateMessage);
    const safeVenue = escapeHtml(event.venue);

    // Send email to all ticket holders
    const emailPromises = tickets.map((ticket) => {
      const safeAttendeeName = escapeHtml(ticket.attendee_name);
      
      return resend.emails.send({
        from: "EventTix <onboarding@resend.dev>",
        to: [ticket.attendee_email],
        subject: `${updateInfo.emoji} ${updateInfo.title}: ${safeEventTitle}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
                  line-height: 1.6;
                  color: #333;
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                }
                .header {
                  background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
                  color: white;
                  padding: 30px;
                  border-radius: 10px 10px 0 0;
                  text-align: center;
                }
                .header h1 {
                  margin: 0;
                  font-size: 28px;
                }
                .content {
                  background: #ffffff;
                  padding: 30px;
                  border: 1px solid #e5e7eb;
                  border-top: none;
                }
                .alert-box {
                  background: #fef3c7;
                  border-left: 4px solid #f59e0b;
                  padding: 20px;
                  border-radius: 8px;
                  margin: 20px 0;
                }
                .event-info {
                  background: #f9fafb;
                  padding: 20px;
                  border-radius: 8px;
                  margin: 20px 0;
                }
                .footer {
                  text-align: center;
                  padding: 20px;
                  color: #6b7280;
                  font-size: 14px;
                }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>${updateInfo.emoji} ${updateInfo.title}</h1>
              </div>
              <div class="content">
                <p>Hello ${safeAttendeeName},</p>
                <p>There's an important update regarding <strong>${safeEventTitle}</strong>.</p>
                
                <div class="alert-box">
                  <p style="margin: 0;"><strong>Update:</strong></p>
                  <p style="margin: 10px 0 0 0;">${safeUpdateMessage}</p>
                </div>

                <div class="event-info">
                  <h2 style="margin-top: 0;">Current Event Details</h2>
                  <p><strong>📅 Date:</strong> ${new Date(event.event_date).toLocaleString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</p>
                  <p><strong>📍 Venue:</strong> ${safeVenue}</p>
                </div>

                <p>Your ticket is still valid and no action is required from you. We'll see you at the event!</p>
              </div>
              <div class="footer">
                <p>This email was sent by EventTix</p>
                <p>You received this because you have a ticket for this event.</p>
              </div>
            </body>
          </html>
        `,
      });
    });

    const results = await Promise.allSettled(emailPromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`Event update emails sent: ${successful} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Notified ${successful} ticket holders`,
        details: { successful, failed, total: tickets.length }
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending event update emails:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
