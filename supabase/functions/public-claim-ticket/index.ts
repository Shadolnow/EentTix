// Deno Deploy / Supabase Edge Function: Public ticket claim with rate limiting and per-email limit
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type ClaimBody = {
  eventId: string;
  name: string;
  email: string;
  phone: string;
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const respond = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

Deno.serve(async (req) => {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
    const body = (await req.json()) as ClaimBody;
    const { eventId, name, email, phone } = body;

    // Basic input validation
    if (!eventId || !name || !email || !phone) {
      return respond(400, { error: 'missing_fields', message: 'Required fields are missing.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
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
      return respond(400, { error: 'sold_out', message: 'This event is sold out.' });
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
      return respond(429, { error: 'rate_limited', message: 'Please wait a few seconds before trying again.' });
    }

    // Enforce one ticket per email per event
    const { data: existing } = await supabase
      .from('tickets')
      .select('id')
      .eq('event_id', eventId)
      .eq('attendee_email', normalizedEmail)
      .limit(1);
    if (existing && existing.length > 0) {
      return respond(409, { error: 'duplicate_email', message: 'A ticket for this email has already been issued for this event.' });
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
        attendee_phone: phone.trim(),
        attendee_email: normalizedEmail,
        ticket_code: ticketCode,
      })
      .select('*, events(*)')
      .single();

    if (insertError || !ticket) {
      console.error('Ticket insert failed', insertError);
      return respond(500, { error: 'insert_failed', message: 'Failed to issue ticket. Please try again later.' });
    }

    // Log claim
    await supabase.from('ticket_claim_logs').insert({
      event_id: eventId,
      email: normalizedEmail,
      ip_address: ip,
    });

    return respond(200, { ticket });
  } catch (e) {
    console.error('public-claim-ticket error', e);
    return respond(500, { error: 'server_error', message: 'Unexpected error. Please try again.' });
  }
});