# Free Email Sending Setup with Resend

## Overview
Send ticket emails for **FREE** using Resend (3,000 emails/month on free tier)

## Step 1: Create Resend Account

1. Go to https://resend.com
2. Sign up for a free account
3. Verify your email address

## Step 2: Get API Key

1. In Resend dashboard, go to **API Keys**
2. Click **Create API Key**
3. Name it "EventTix Tickets"
4. Copy the API key (starts with `re_`)

## Step 3: Verify Domain (or use Resend's test domain)

### Option A: Use Resend Test Domain (Quick Start)
- Use `onboarding@resend.dev` as sender
- Limited to 100 emails/day
- Good for testing

### Option B: Verify Your Own Domain (Recommended)
1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `yourdomain.com`)
4. Add the DNS records shown to your domain provider
5. Wait for verification (usually 5-15 minutes)
6. Use `tickets@yourdomain.com` as sender

## Step 4: Add API Key to Supabase

### Via Supabase Dashboard:
1. Go to your Supabase project
2. Settings → Edge Functions
3. Click **Add Secret**
4. Name: `RESEND_API_KEY`
5. Value: `re_your_api_key_here`
6. Save

### Via CLI:
```bash
supabase secrets set RESEND_API_KEY=re_your_api_key_here
```

## Step 5: Update Edge Function

Edit `supabase/functions/send-ticket-email/index.ts`:

```typescript
// Change line 148 (the 'from' field):
from: 'EventTix <tickets@yourdomain.com>', // Or onboarding@resend.dev for testing
```

## Step 6: Deploy Edge Function

```bash
# Deploy the function
supabase functions deploy send-ticket-email

# Test it
supabase functions invoke send-ticket-email --body '{
  "to": "your@email.com",
  "ticketCode": "TEST123",
  "attendeeName": "Test User",
  "eventTitle": "Test Event",
  "eventDate": "2024-12-31T20:00:00Z",
  "eventVenue": "Test Venue",
  "ticketUrl": "https://eventtix-psi.vercel.app/ticket/123"
}'
```

## Alternative FREE Email Services

### 1. Resend (RECOMMENDED)
- ✅ 3,000 emails/month FREE
- ✅ Best developer experience
- ✅ Excellent deliverability
- ✅ Simple API

### 2. SendGrid
- ✅ 100 emails/day FREE
- ✅ 3,000 emails/month
- More complex setup

### 3. Mailgun
- ✅ 5,000 emails/month FREE (first 3 months)
- Then 1,000/month free
- More features but complex

### 4. Supabase Auth Emails (Simplest)
- ✅ Built into Supabase
- ❌ Limited customization
- ❌ Requires user to be authenticated

## Testing Email Sending

### Test the function locally:
```bash
# Start Supabase locally
supabase start

# Serve the function
supabase functions serve send-ticket-email --env-file supabase/.env.local

# Test with curl
curl -X POST \
  http://localhost:54321/functions/v1/send-ticket-email \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "ticketCode": "ABC123",
    "attendeeName": "John Doe",
    "eventTitle": "Concert 2024",
    "eventDate": "2024-12-31T20:00:00Z",
    "eventVenue": "Madison Square Garden",
    "ticketUrl": "https://eventtix-psi.vercel.app/ticket/123"
  }'
```

## Email Template Preview

The email includes:
- 🎫 Beautiful gradient header
- 📅 Event details (date, time, venue)
- 🔢 Large ticket code display
- 🔗 Button to view full ticket
- 💡 Important instructions
- 📧 Link to retrieve tickets later

## Cost Breakdown

| Service | Free Tier | Cost After |
|---------|-----------|------------|
| **Resend** | 3,000/month | $10/month for 50k |
| SendGrid | 100/day (3k/month) | $15/month for 40k |
| Mailgun | 5,000/month (3mo) | $35/month for 50k |
| Postmark | 100/month | $10/month for 10k |

**Recommendation: Start with Resend's free tier!**

## Fallback Strategy

Even if emails fail, users can:
1. Visit `/my-tickets`
2. Enter their email or phone
3. See all their tickets
4. Download them

This ensures **zero ticket loss**!

## Troubleshooting

### Emails not sending?
1. Check API key is set correctly
2. Verify domain in Resend
3. Check Supabase Edge Function logs
4. Test with `onboarding@resend.dev` first

### Emails going to spam?
1. Verify your domain
2. Add SPF/DKIM records (Resend provides these)
3. Warm up your domain slowly
4. Use a recognizable sender name

### Rate limits hit?
1. Upgrade Resend plan ($10/month)
2. Or batch emails (send 1 email with all tickets)
3. Or use multiple services as fallback

## Complete Setup Time
- **5 minutes** with test domain
- **20 minutes** with custom domain (including DNS propagation)

Ready to send emails! 📧✨
