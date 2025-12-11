import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ClaimBody = {
  eventId: string;
  name: string;
  phone: string;
  tierId?: string;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
    const body = (await req.json()) as ClaimBody;
    const { eventId, name, phone, tierId } = body;

    // Basic input validation
    if (!eventId || !name || !phone) {
      return new Response(
        JSON.stringify({ error: 'missing_fields', message: 'Required fields are missing.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedPhone = phone.trim();
    // Generate email from phone for database compatibility
    const generatedEmail = `${normalizedPhone.replace(/[^0-9]/g, '')}@inhouse.local`;
    const now = new Date();
    const windowStart = new Date(now.getTime() - 30_000); // 30s cooldown per IP

    // Capacity check via RPC if available
    const { data: availabilityData, error: availabilityError } = await supabase
      .rpc('check_ticket_availability', { event_id_input: eventId });
    if (availabilityError) {
      // Soft-fail to avoid leaking internal details
      console.error('Availability check failed', availabilityError);
    }
    if (availabilityData === false) {
      return new Response(
        JSON.stringify({ error: 'sold_out', message: 'This event is sold out.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check tier availability if tier is specified
    if (tierId) {
      const { data: tierAvailable, error: tierError } = await supabase
        .rpc('check_tier_availability', { tier_id_input: tierId });
      
      if (tierError) {
        console.error('Tier availability check failed', tierError);
      }
      
      if (tierAvailable === false) {
        return new Response(
          JSON.stringify({ error: 'tier_sold_out', message: 'This ticket tier is sold out.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Rate limiting by IP (simple sliding window)
    const { data: recentClaims } = await supabase
      .from('ticket_claim_logs')
      .select('id')
      .eq('ip_address', ip)
      .eq('event_id', eventId)
      .gte('created_at', windowStart.toISOString())
      .limit(1);

    if (recentClaims && recentClaims.length > 0) {
      return new Response(
        JSON.stringify({ error: 'rate_limited', message: 'Please wait a few seconds before trying again.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enforce one ticket per phone per event
    const { data: existing } = await supabase
      .from('tickets')
      .select('id')
      .eq('event_id', eventId)
      .eq('attendee_phone', normalizedPhone)
      .limit(1);
    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({ error: 'duplicate_phone', message: 'A ticket for this phone number has already been issued for this event.' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate ticket code
    const codePart = crypto.randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase();
    const ticketCode = `${codePart}-${crypto.randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase()}`;

    // Insert ticket
    const { data: ticket, error: insertError } = await supabase
      .from('tickets')
      .insert({
        event_id: eventId,
        attendee_name: name.trim(),
        attendee_phone: normalizedPhone,
        attendee_email: generatedEmail,
        ticket_code: ticketCode,
        tier_id: tierId || null,
      })
      .select('*, events(*), ticket_tiers(*)')
      .single();

    if (insertError || !ticket) {
      console.error('Ticket insert failed', insertError);
      return new Response(
        JSON.stringify({ error: 'insert_failed', message: 'Failed to issue ticket. Please try again later.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log claim
    await supabase.from('ticket_claim_logs').insert({
      event_id: eventId,
      email: generatedEmail,
      ip_address: ip,
    });

    // Send ticket confirmation email (inlined to avoid exposed endpoint)
    try {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (resendApiKey) {
        const resend = new Resend(resendApiKey);
        const ticketUrl = `${req.headers.get('origin') || 'https://app.example.com'}/ticket/${ticket.id}`;
        const eventDateFormatted = new Date(ticket.events.event_date).toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        // Escape HTML to prevent injection
        const escapeHtml = (str: string): string => {
          return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        };
        
        const safeAttendeeName = escapeHtml(name.trim());
        const safeEventTitle = escapeHtml(ticket.events.title);
        const safeEventVenue = escapeHtml(ticket.events.venue);

        await resend.emails.send({
          from: "EventTix <onboarding@resend.dev>",
          to: [generatedEmail],
          subject: `Your Ticket for ${safeEventTitle}`,
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                  <h1 style="margin: 0; font-size: 28px;">🎫 Your Ticket is Ready!</h1>
                </div>
                <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
                  <p>Hello ${safeAttendeeName},</p>
                  <p>Thank you for registering! Your ticket for <strong>${safeEventTitle}</strong> has been confirmed.</p>
                  
                  <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h2 style="margin-top: 0;">Event Details</h2>
                    <p><strong>📅 Date:</strong> ${eventDateFormatted}</p>
                    <p><strong>📍 Venue:</strong> ${safeEventVenue}</p>
                  </div>

                  <div style="text-align: center;">
                    <p><strong>Your Ticket Code:</strong></p>
                    <div style="font-size: 32px; font-weight: bold; color: #667eea; text-align: center; padding: 20px; background: white; border-radius: 8px; letter-spacing: 4px; margin: 20px 0;">${ticketCode}</div>
                    <p style="font-size: 14px; color: #6b7280;">Present this code at the venue for entry</p>
                  </div>

                  <div style="text-align: center;">
                    <a href="${ticketUrl}" style="display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0;">View Your Ticket</a>
                  </div>

                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                    <p style="font-size: 14px; color: #6b7280;">
                      <strong>Important:</strong> Please save this email or screenshot your ticket code. 
                      You'll need it for entry to the event.
                    </p>
                  </div>
                </div>
                <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 14px;">
                  <p>This email was sent by EventTix</p>
                </div>
              </body>
            </html>
          `,
        });
        
        console.log('Ticket confirmation email sent to:', generatedEmail);
      } else {
        console.log('RESEND_API_KEY not configured, skipping email');
      }
    } catch (emailError) {
      // Log error but don't fail the ticket creation
      console.error('Failed to send ticket email:', emailError);
    }

    return new Response(
      JSON.stringify({ ticket }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('public-claim-ticket error', e);
    return new Response(
      JSON.stringify({ error: 'server_error', message: 'Unexpected error. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
