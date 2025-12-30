# Testing Guide - PWA & UX Enhancements

## Quick Start Testing

### 1. PWA Install Prompt (5-10 seconds after page load)

**Desktop/Android:**
- Open the app
- Wait 5 seconds
- You should see a prompt at bottom-right: "Install EventTix"
- Click "Install" to add to home screen
- OR click "Not now" to dismiss

**iOS (Safari):**
- Open the app in Safari
- Wait 3 seconds
- You should see instructions: "Tap Share → Add to Home Screen"
- Click X to dismiss

### 2. Push Notifications (10 seconds after page load)

- Wait for the bell icon prompt: "Stay Updated"
- Click "Enable" to allow notifications
- OR "No thanks" to dismiss
- Check browser permissions to verify

### 3. Pull-to-Refresh (Mobile only)

**To test locally:**
```typescript
// Add to any page component:
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

usePull ToRefresh(async () => {
  console.log('Refreshing!');
  await new Promise(resolve => setTimeout(resolve, 1000));
});
```

**Then on mobile:**
- Scroll to top of page
- Pull down and hold
- Release when distance > 80px
- Should see "Refreshing..." toast

### 4. Dark Mode

**Add to navbar:**
```typescript
import { ThemeToggle } from '@/components/ThemeToggle';

<ThemeToggle />
```

**Test:**
- Click the sun/moon icon
- Select Light/Dark/System
- Theme should transition smoothly (0.3s)
- Refresh page - theme should persist

### 5. Sound Effects & Haptics

**Example Usage:**
```typescript
import { haptic } from '@/lib/feedback';

<Button onClick={() => {
  haptic.click(); // Light tap + sound
  // ...your code
}}>
  Click Me
</Button>

// On payment success:
haptic.payment(); // Ching sound + medium vibration

// On error:
haptic.error(); // Error sound + heavy vibration pattern
```

**Test:**
1. Add to a button
2. Click it
3. Should hear soft click sound (if enabled)
4. On mobile, should feel vibration

### 6. Settings Panel

**Add to settings page:**
```typescript
import { AppSettings } from '@/components/AppSettings';

<AppSettings />
```

**Test:**
- Toggle sound effects ON/OFF
- Toggle haptic feedback ON/OFF
- Change theme (Light/Dark/System)
- Check notification status
- Preferences should persist after refresh

## Integration Examples

### Complete Button with Feedback:
```typescript
import { haptic } from '@/lib/feedback';

<Button
  onClick={() => {
    haptic.click(); // Sound + vibration
    handleAction();
  }}
  className="..."
>
  Click Me
</Button>
```

### Payment Success:
```typescript
const handlePayment = async () => {
  try {
    await processPayment();
    haptic.payment(); // Ching! 💰
    toast.success('Payment successful!');
  } catch (error) {
    haptic.error(); // Bzzt bzzt
    toast.error('Payment failed');
  }
};
```

### Page with Pull-to-Refresh:
```typescript
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

const MyPage = () => {
  const [data, setData] = useState([]);

  const refreshData = async () => {
    const newData = await fetchData();
    setData(newData);
  };

  usePullToRefresh(refreshData);

  return <div>...</div>;
};
```

## Sound Files Required

Create these in `public/sounds/`:

1. **click.mp3** - Soft tap sound (10-20ms)
2. **success.mp3** - Pleasant chime (200-300ms)
3. **error.mp3** - Subtle error tone (150-250ms)
4. **ching.mp3** - Cash register/payment sound (300-500ms)
5. **notification.mp3** - Gentle alert (200ms)

**Recommendations:**
- Use royalty-free sounds from freesound.org
- Keep file sizes < 20KB each
- Use MP3 format for compatibility
- Volume should be subtle (30% default in code)

## Browser Support

| Feature | Chrome/Edge | Firefox | Safari | Mobile |
|---------|-------------|---------|--------|--------|
| PWA Install | ✅ | ✅ | ⚠️ Manual | ✅ |
| Push Notifications | ✅ | ✅ | ⚠️ iOS 16.4+ | ✅ |
| Haptic Feedback | ✅ | ✅ | ✅ | ✅ |
| Sound Effects | ✅ | ✅ | ✅ | ✅ |
| Dark Mode | ✅ | ✅ | ✅ | ✅ |
| Pull-to-Refresh | N/A | N/A | ✅ | ✅ |

## Troubleshooting

**PWA Install not showing:**
- Check if already installed
- Clear localStorage: `localStorage.removeItem('pwa-install-dismissed')`
- Hard refresh (Ctrl+Shift+R)

**Notifications not working:**
- Check browser permissions
- HTTPS required (localhost is OK for testing)
- Clear: `localStorage.removeItem('push-notification-dismissed')`

**No sound:**
- Check if muted in browser
- Verify sound files exist in `/public/sounds/`
- Check: `localStorage.getItem('sound-effects-enabled')`

**No haptic feedback:**
- Only works on mobile devices
- Check: `'vibrate' in navigator`
- Some browsers block on HTTP (use HTTPS)

**Dark mode not persisting:**
- Check localStorage: `localStorage.getItem('theme')`
- Ensure ThemeProvider wraps entire app

## Production Checklist

- [ ] Sound files uploaded to `/public/sounds/`
- [ ] ThemeProvider wraps App component
- [ ] Theme toggle added to nav/settings
- [ ] Pull-to-refresh integrated on key pages
- [ ] Haptic feedback added to buttons
- [ ] AppSettings page linked in nav
- [ ] Service worker configured for push notifications
- [ ] Test on real iOS device
- [ ] Test on real Android device
- [ ] Verify offline ticket storage works

---

**Status**: Ready for testing  
**Next Steps**: Add sound files, integrate components, test on devices
