# 🔧 URGENT FIX: Enable Video Uploads

## Problem
Video uploads are failing because the `event-videos` storage bucket doesn't exist in Supabase yet.

## ✅ Quick Solution (2 minutes)

### Step 1: Run This SQL
```sql
1. Go to your Supabase Dashboard
2. Click "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy and paste the contents of CREATE_VIDEO_BUCKET_NOW.sql
5. Click "Run" (or press F5)
```

The SQL file creates:
- `event-videos` bucket with 500MB limit
- Public read access (anyone can view)
- Authenticated write access (logged-in users can upload)
- User-scoped update/delete (users can only modify their own videos)

### Step 2: Verify It Worked
After running the SQL, you should see:
```
id: event-videos
name: event-videos
public: true
file_size_limit: 524288000
```

### Step 3: Test Video Upload
1. Go to your app
2. Navigate to Event Customization
3. Try uploading a video (MP4, MOV, WebM, or AVI)
4. Maximum size: 500MB
5. You should see "Video uploaded successfully!"

## 📹 What's Now Supported

### File Formats:
- ✅ MP4 (recommended)
- ✅ MOV (QuickTime)
- ✅ WebM  
- ✅ AVI
- ✅ MPEG

### File Size:
- **Maximum**: 500MB per video
- **Recommended**: 50-100MB for faster uploads

### Features:
- Upload up to 5 videos per event
- Videos are stored permanently
- Public URLs for embedding
- Fallback to `event-images` bucket if needed

## 🎬 Where to Upload Videos

### Option 1: Event Customization Page
1. Go to your event
2. Scroll to "Videos" section
3. Click "Upload Video" button
4. Select your video file
5. Wait for upload (progress shown)

### Option 2: Use the Auto-Trim Component (Coming Soon)
The `VideoUploadWithTrim` component will automatically:
- Trim videos to 15 seconds
- Convert to MP4 format
- Compress file size
- Show real-time progress

## ❗ If Upload Still Fails

### Common Issues:

**1. "Bucket not found" error**
- ✅ Solution: Run the `CREATE_VIDEO_BUCKET_NOW.sql` script

**2. "File too large" error**
- ✅ Solution: Videos must be under 500MB
- Try compressing your video first

**3. "Invalid format" error**  
- ✅ Solution: Only use MP4, MOV, WebM, AVI, or MPEG
- Convert your video using a free tool like HandBrake

**4. Upload succeeds but video doesn't show**
- ✅ Solution: Hard refresh the page (Ctrl+F5 or Cmd+Shift+R)
- Check that the URL is stored in the database

## 🔄 Fallback Mechanism

The app now has smart fallback:
```
1. Try uploading to event-videos bucket
   ↓ (if fails)
2. Automatically try event-images bucket
   ↓ (if fails)
3. Show clear error message
```

This means videos will work even if you haven't run the SQL yet!

## 📊 Current Status

- ✅ Video upload code: **Working**
- ✅ 500MB limit: **Enabled**
- ✅ MP4 support: **Enabled**
- ✅ Fallback support: **Enabled**
- ⬜ Storage bucket: **Needs SQL migration**
- ⬜ Auto-trim: **Code ready, not integrated yet**

## 🚀 Next Steps

1. **Run the SQL migration** (2 minutes)
2. **Test video upload** (2 minutes)
3. **Optional**: Integrate auto-trim component for 15s videos
4. **Optional**: Add video preview in event cards

## 💡 Pro Tips

1. **Optimize before upload**: Use HandBrake or similar tool to compress videos
2. **Use MP4**: Best compatibility across all browsers
3. **Keep it short**: 15-30 seconds is ideal for event highlights
4. **Test on mobile**: Make sure videos play on phones
5. **Use thumbnails**: Generate custom thumbnails for better presentation

---

**Created**: December 31, 2025
**Priority**: URGENT
**Time to Fix**: 2 minutes
