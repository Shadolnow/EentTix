# 🍽️ Table Booking System - Setup Guide

## ✅ What's Been Added

A complete table booking system for restaurants, clubs, lounges, and weekend shows where customers book tables instead of individual tickets!

---

## 🎯 Features

### For Event Creators:
- ✅ Switch between **Ticket Mode** and **Table Mode**
- ✅ Add/edit/delete tables
- ✅ Set capacity (2-20 seats per table)
- ✅ Set price per table
- ✅ Add location (Near Stage, VIP Section, etc.)
- ✅ Add features (AC, Window View, Near Bar, etc.)
- ✅ View real-time availability
- ✅ See all bookings

### For Customers:
- ✅ View available tables in a beautiful grid
- ✅ See capacity, price, location, features
- ✅ Book tables with personal details
- ✅ Specify number of guests
- ✅ Add special requests
- ✅ Get booking confirmation code
- ✅ Confetti celebration on booking! 🎉

---

## 📋 Database Setup (REQUIRED)

### Step 1: Run Migration

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Click **"New Query"**
3. Copy the contents of `supabase/migrations/20250101_table_booking.sql`
4. Click **"Run"**

This creates:
- `event_tables` table - Stores table information
- `table_bookings` table - Stores customer bookings
- Automatic booking code generation
- Automatic availability updates
- RLS policies for security

---

## 🎨 Using the System

### For Event Creators

#### Step 1: Choose Booking Type (When Creating Event)

When creating or editing an event, select:
- **"Ticket Booking"** - Traditional individual tickets (default)
- **"Table Booking"** - For restaurants, clubs, weekend shows

#### Step 2: Add Tables (If Table Booking Mode)

```tsx
// In EventCustomization page, use TableManager component
import { TableManager } from '@/components/TableManager';

<Tabs>
  <TabsList>
    <TabsTrigger value="tables">Tables</TabsTrigger>
  </TabsList>
  <TabsContent value="tables">
    <TableManager eventId={eventId} />
  </TabsContent>
</Tabs>
```

Fill in table details:
- **Table Name**: "Table 1", "VIP Booth A", "Window Side 5"
- **Table Number**: 1, 2, 3, etc.
- **Capacity**: 2-20 seats
- **Price**: ₹2000, ₹5000, etc.
- **Location** (optional): "Near Stage", "Rooftop", "VIP Section"
- **Features** (optional): "AC, Window View, Premium Setup"

#### Step 3: View Bookings

All bookings appear in your event management panel with:
- Customer details
- Booking code
- Payment status
- Number of guests
- Special requests

---

### For Customers

#### Step 1: Browse Available Tables

On the public event page, they see a grid of tables showing:
- Table name & number
- Capacity (seats)
- Price
- Location
- Features (AC, Window View, etc.)
- Availability status

#### Step 2: Book a Table

Click on any available table → Fill in details:
- Name
- Email
- Phone
- Number of guests (max = table capacity)
- Special requests (dietary restrictions, etc.)

#### Step 3: Confirm Booking

- Receive booking confirmation code
- Get email confirmation
- See confetti celebration! 🎉

---

## 💻 Code Integration

### In Public Event Page

```tsx
// src/pages/PublicEvent.tsx
import { TableBookingSelector } from '@/components/TableBookingSelector';

// Inside the component
{event.booking_type === 'table' ? (
  <TableBookingSelector eventId={eventId} />
) : (
  <TierSelector eventId={eventId} /> // Regular tickets
)}
```

### In Event Customization Page

```tsx
// src/components/EventCustomization.tsx
import { TableManager } from '@/components/TableManager';

// Add a new tab
<TabsContent value="tables">
  <TableManager eventId={eventId} />
</TabsContent>
```

---

## 🗃️ Database Schema

### event_tables
```sql
id                UUID (PK)
event_id          UUID (FK → events)
table_name        TEXT
table_number      INTEGER
capacity          INTEGER (1-20)
price             DECIMAL
location          TEXT
features          JSONB (array of strings)
is_available      BOOLEAN
booked_by         UUID (FK → users)
booked_at         TIMESTAMPTZ
sort_order        INTEGER
```

### table_bookings
```sql
id                UUID (PK)
table_id          UUID (FK → event_tables)
event_id          UUID (FK → events)
user_id           UUID (FK → users)
customer_name     TEXT
customer_email    TEXT
customer_phone    TEXT
number_of_guests  INTEGER
total_price       DECIMAL
payment_status    TEXT (pending/paid/failed)
payment_method    TEXT (upi/cash/card)
booking_code      TEXT (auto-generated)
special_requests  TEXT
status            TEXT (confirmed/cancelled/completed)
```

---

## 📊 Example Use Cases

### 1. Restaurant Weekend Show
```
Event: "Saturday Night Live Music"
Booking Type: Table
Tables:
  - Window Table 1: 4 seats, ₹3000, Near Window
  - Stage Front 2: 6 seats, ₹5000, Near Stage
  - VIP Booth A: 8 seats, ₹8000, Private Booth, AC
```

### 2. Rooftop Club Night
```
Event: "NYE Rooftop Party"
Booking Type: Table
Tables:
  - Premium 1: 4 seats, ₹10000, Sky View, VIP Service
  - Regular 5: 6 seats, ₹6000, Dance Floor Access
  - Lounge 3: 8 seats, ₹8000, Sofa Seating, AC
```

### 3. Fine Dining Event
```
Event: "Chef's Special Dinner"
Booking Type: Table
Tables:
  - Couple's Corner: 2 seats, ₹2500, Romantic Setup
  - Family Table: 6 seats, ₹6000, Spacious
  - Group Dining: 10 seats, ₹10000, Round Table
```

---

## 🎯 Customer Experience Flow

1. **Browse Event** → See "Table Booking Available"
2. **View Tables** → Grid of available tables with all details
3. **Select Table** → Click on preferred table
4. **Enter Details** → Name, email, phone, guests, requests
5. **Confirm** → Get booking code instantly
6. **Receive Email** → Booking confirmation sent
7. **Celebrate** → Confetti animation! 🎉

---

## 🔧 Admin Features

### View Bookings
```tsx
// Get all bookings for an event
const { data } = await supabase
  .from('table_bookings')
  .select('*, event_tables(*)')
  .eq('event_id', eventId);
```

### Cancel Booking
```tsx
// Cancel and free up table
const { error } = await supabase
  .from('table_bookings')
  .update({ status: 'cancelled' })
  .eq('id', bookingId);
// Table automatically becomes available
```

### Update Table
```tsx
// Change price, capacity, features
const { error } = await supabase
  .from('event_tables')
  .update({
    price: 5000,
    capacity: 6,
    features: ['AC', 'Premium']
  })
  .eq('id', tableId);
```

---

## 🚀 Going Live

### Before Your First Table Booking Event:

1. ✅ Run database migration
2. ✅ Create test event in "Table" mode
3. ✅ Add 2-3 test tables
4. ✅ Test booking flow
5. ✅ Verify email confirmations
6. ✅ Check table availability updates

---

## 💡 Pro Tips

1. **Pricing Strategy**:
   - Prime location = Higher price
   - Larger capacity = Better value per seat
   - Add features to justify premium pricing

2. **Table Naming**:
   - Use memorable names ("Romeo's Corner", not "Table 1")
   - Include location in name ("Window Side Premium")
   - Number tables for staff clarity

3. **Capacity Planning**:
   - Most restaurants: 2-4 seat tables
   - Clubs/bars: 6-8 seat tables
   - VIP booths: 8-12 seats

4. **Features That Sell**:
   - AC/Heating
   - Window View
   - Near Stage/DJ
   - Private/Semi-Private
   - Premium Seating
   - Bottle Service

---

## 📈 Analytics

Track these metrics:
- Total tables vs booked tables
- Average booking value
- Most popular table types
- Peak booking times
- Customer preferences (features)

---

## 🐛 Troubleshooting

**Tables not showing?**
- Check `booking_type` = 'table' in events table
- Verify migration ran successfully
- Check RLS policies

**Can't book table?**
- Table might be already booked
- Check `is_available` flag
- Refresh page to see latest status

**Booking code not generated?**
- Check database trigger is active
- Verify booking was inserted successfully

---

## ✅ Checklist

- [ ] Database migration run
- [ ] TableManager component integrated in admin
- [ ] TableBookingSelector component in public page
- [ ] Booking confirmation emails set up
- [ ] Test booking flow works
- [ ] Table availability updates automatically
- [ ] Booking codes generate properly

---

**Perfect for:** Restaurants, Clubs, Lounges, Rooftop Events, Fine Dining, Weekend Shows, NYE Parties, Premium Events

**Ready to use!** 🎉🍽️
