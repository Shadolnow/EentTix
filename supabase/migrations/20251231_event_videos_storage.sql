-- STORAGE SETUP FOR EVENT VIDEOS
-- Allows higher video size limits for event impact videos

-- Create storage bucket for event videos with higher limits
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'event-videos', 
  'event-videos', 
  true,
  524288000, -- 500MB limit for videos
  ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 524288000,
  allowed_mime_types = ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];

-- Create storage policies for event videos
DROP POLICY IF EXISTS "Anyone can view event videos" ON storage.objects;
CREATE POLICY "Anyone can view event videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-videos');

DROP POLICY IF EXISTS "Authenticated users can upload event videos" ON storage.objects;
CREATE POLICY "Authenticated users can upload event videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'event-videos' 
  AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Users can update their own event videos" ON storage.objects;
CREATE POLICY "Users can update their own event videos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'event-videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete their own event videos" ON storage.objects;
CREATE POLICY "Users can delete their own event videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'event-videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
