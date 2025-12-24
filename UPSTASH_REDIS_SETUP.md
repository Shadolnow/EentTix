# Upstash Redis Rate Limiting Setup

## Overview
EventTix uses Upstash Redis for rate limiting to protect against abuse and ensure fair usage.

## Features
- **API Rate Limiting**: 10 requests per 10 seconds
- **Ticket Claims**: 5 claims per minute
- **Event Creation**: 10 events per hour
- **Login Attempts**: 5 attempts per 5 minutes

## Setup Instructions

### 1. Create Upstash Account
1. Go to [https://upstash.com](https://upstash.com)
2. Sign up for a free account
3. Create a new Redis database

### 2. Get Credentials
1. In Upstash dashboard, select your database
2. Go to "REST API" section
3. Copy:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### 3. Add Environment Variables

**For Local Development (.env)**
```bash
VITE_UPSTASH_REDIS_REST_URL=https://your-endpoint.upstash.io
VITE_UPSTASH_REDIS_REST_TOKEN=your-token-here
```

**For Vercel Deployment**
1. Go to your Vercel project settings
2. Navigate to Environment Variables
3. Add:
   - `VITE_UPSTASH_REDIS_REST_URL`
   - `VITE_UPSTASH_REDIS_REST_TOKEN`

### 4. Usage in Components

```tsx
import { useRateLimit } from '@/hooks/useRateLimit';

function MyComponent () {
  const { checkLimit, isRateLimited } = useRateLimit('ticket');
  
  const handleAction = async () => {
    const allowed = await checkLimit(user?.id);
    if (!allowed) return; // Rate limited
    
    // Proceed with action
  };
}
```

## Rate Limit Types

### `ticket` - Ticket Claims
- **Limit**: 5 requests per minute
- **Use for**: Claiming tickets, bulk purchases
- **Identifier**: User ID or IP address

### `event` - Event Creation
- **Limit**: 10 requests per hour
- **Use for**: Creating new events
- **Identifier**: User ID

### `login` - Authentication
- **Limit**: 5 attempts per 5 minutes
- **Use for**: Login, signup attempts
- **Identifier**: Email or IP address

### `api` - General API Calls
- **Limit**: 10 requests per 10 seconds
- **Use for**: General API protection
- **Identifier**: User ID or IP address

## Error Handling
- When rate limited, users see friendly error message
- Shows time until reset (e.g., "Try again in 2 minutes")
- Fails open (allows request) if Redis is unavailable

## Analytics
Upstash provides built-in analytics to monitor:
- Request patterns
- Peak usage times
- Blocked requests
- Top users

Access analytics at: https://console.upstash.com

## Free Tier Limits
- 10,000 requests per day
- 256 MB storage
- Global replication
- Sufficient for most small-medium apps

## Testing

```bash
# Test rate limiting locally
curl -X POST http://localhost:8080/api/test-endpoint \
  -H "Content-Type: application/json" \
  -d '{"action":"test"}'
```

Repeat the request 11 times quickly to trigger rate limit.

## Troubleshooting

**Issue**: "Rate limit check failed"
- Check environment variables are set
- Verify Upstash credentials are correct
- Ensure Redis instance is active

**Issue**: All requests blocked
- Check if you've exceeded free tier
- Verify rate limits are configured correctly
- Check Upstash dashboard for errors

## Cost Estimation
- Free tier: $0/month (10K requests/day)
- Pay-as-you-go: $0.20 per 100K requests
- Pro plan: $10/month (1M requests/day)

For most EventTix deployments, free tier is sufficient.
