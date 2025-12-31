# Table Booking Integration - Quick Start

## ✅ Status: DATABASE READY!

The table booking database is set up and working. Now you need to add the UI components to your pages.

---

## 🎯 Integration Points

### 1. Event Creation/Editing (Admin)

Add the **TableManager** component to your event management page:

```tsx
// In your event edit/customization page
import { TableManager } from '@/components/TableManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Inside your component
<Tabs defaultValue="basic">
  <TabsList>
    <TabsTrigger value="basic">Basic Info</TabsTrigger>
    <TabsTrigger value="tables">Table Management</TabsTrigger>
    <TabsTrigger value="gallery">Gallery</TabsTrigger>
  </TabsList>
  
  <TabsContent value="tables">
    <TableManager eventId={eventId} />
  </TabsContent>
</Tabs>
```

---

### 2. Public Event Page (Customers)

Add the **TableBookingSelector** to show tables for booking:

```tsx
// In src/pages/PublicEvent.tsx
import { TableBookingSelector } from '@/components/TableBookingSelector';

// Inside your component, replace or supplement ticket booking
{event.booking_type === 'table' ? (
  <TableBookingSelector eventId={eventId} />
) : (
  // Your existing ticket booking component
  // ... normal ticket tiers ...
)}
```

---

## 📝 Booking Type Selection

You also need to let event creators choose between "Ticket" and "Table" modes:

```tsx
// In CreateEvent or EventEdit form
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

<div className="space-y-2">
  <Label>Booking Type</Label>
  <RadioGroup 
    value={bookingType} 
    onValueChange={setBookingType}
    defaultValue="ticket"
  >
    <div className="flex items-center space-x-2">
      <RadioGroupItem value="ticket" id="ticket" />
      <Label htmlFor="ticket">Individual Tickets</Label>
    </div>
    <div className="flex items-center space-x-2">
      <RadioGroupItem value="table" id="table" />
      <Label htmlFor="table">Table Booking (Restaurants/Clubs)</Label>
    </div>
  </RadioGroup>
</div>

// Then when creating event:
const { error } = await supabase
  .from('events')
  .insert({
    ...eventData,
    booking_type: bookingType, // 'ticket' or 'table'
  });
```

---

## 🧪 Quick Test

### Test Admin Side:

1. Go to any existing event
2. Navigate to "Table Management" or create new tab
3. Import and add `<TableManager eventId={event.id} />`
4. You should see "Add Table" button
5. Click and fill in table details
6. Table should appear in grid

### Test Customer Side:

1. Set an event's `booking_type` to 'table' in database:
   ```sql
   UPDATE events SET booking_type = 'table' WHERE id = 'your-event-id';
   ```
2. Go to that event's public page
3. Import and add `<TableBookingSelector eventId={eventId} />`
4. You should see tables grid
5. Click to book → Fill form → Confirm
6. Should get booking code!

---

## 🎨 Example Full Integration

```tsx
// src/pages/PublicEvent.tsx
import { TableBookingSelector } from '@/components/TableBookingSelector';
import { TierSelector } from '@/components/TierSelector'; // Your existing component

// Inside component:
const [event, setEvent] = useState<any>(null);

// ... fetch event data ...

return (
  <div>
    <h1>{event.title}</h1>
    <p>{event.description}</p>
    
    {/* Conditional rendering based on booking type */}
    {event.booking_type === 'table' ? (
      <div className="mt-8">
        <TableBookingSelector eventId={event.id} />
      </div>
    ) : (
      <div className="mt-8">
        {/* Your existing ticket booking UI */}
        <TierSelector eventId={event.id} />
      </div>
    )}
  </div>
);
```

---

## 📊 Database Quick Reference

### Check booking type:
```sql
SELECT id, title, booking_type FROM events WHERE id = 'your-event-id';
```

### View all tables for an event:
```sql
SELECT * FROM event_tables WHERE event_id = 'your-event-id';
```

### View all bookings:
```sql
SELECT 
  tb.*,
  et.table_name,
  et.capacity
FROM table_bookings tb
JOIN event_tables et ON et.id = tb.table_id
WHERE tb.event_id = 'your-event-id';
```

### Manually set booking type:
```sql
UPDATE events SET booking_type = 'table' WHERE id = 'your-event-id';
```

---

## ✅ Checklist

- [ ] TableManager component integrated in admin page
- [ ] TableBookingSelector component integrated in public page
- [ ] Booking type selector added to event creation
- [ ] Test creating tables as admin
- [ ] Test booking table as customer
- [ ] Verify booking codes generate
- [ ] Verify table availability updates

---

## 🆘 Need Help?

**Can't find where to integrate?**
- Search for "EventCustomization" or "CreateEvent" in your codebase
- Look for existing ticket/tier management
- Add TableManager in the same area

**Components not showing?**
- Check imports are correct
- Verify eventId is being passed
- Check browser console for errors

**Still stuck?**
- Share the file path where you want to integrate
- I'll provide exact code for that file!

---

**All code is ready - just needs integration into your pages!** 🚀
