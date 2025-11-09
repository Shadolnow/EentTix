import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FAQ {
  question: string;
  answer: string;
}

interface ScheduleItem {
  time: string;
  title: string;
  description: string;
}

interface EventCustomizationProps {
  eventId: string;
  userId: string;
  initialData?: {
    galleryImages?: string[];
    faq?: FAQ[];
    schedule?: ScheduleItem[];
    additionalInfo?: string;
  };
}

export const EventCustomization = ({ eventId, userId, initialData }: EventCustomizationProps) => {
  const [galleryImages, setGalleryImages] = useState<string[]>(initialData?.galleryImages || []);
  const [faq, setFaq] = useState<FAQ[]>(initialData?.faq || []);
  const [schedule, setSchedule] = useState<ScheduleItem[]>(initialData?.schedule || []);
  const [additionalInfo, setAdditionalInfo] = useState(initialData?.additionalInfo || '');
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Limit total gallery images to 10
    const maxGalleryImages = 10;
    if (galleryImages.length + files.length > maxGalleryImages) {
      toast.error(`Maximum ${maxGalleryImages} gallery images allowed`);
      return;
    }

    // Validate file size and type
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > maxSize) {
        toast.error(`File "${file.name}" is too large. Maximum size is 5MB`);
        return;
      }
      if (!allowedTypes.includes(file.type)) {
        toast.error(`File "${file.name}" has invalid type. Only JPEG, PNG, GIF, and WebP images are allowed`);
        return;
      }
    }

    setUploading(true);
    try {
      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Use random UUID for filename to prevent enumeration
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        const fileName = `${userId}/gallery/${crypto.randomUUID()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('event-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('event-images')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      setGalleryImages([...galleryImages, ...uploadedUrls]);
      toast.success(`${uploadedUrls.length} image(s) uploaded!`);
    } catch (error: any) {
      toast.error('Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setGalleryImages(galleryImages.filter((_, i) => i !== index));
  };

  const addFAQ = () => {
    setFaq([...faq, { question: '', answer: '' }]);
  };

  const updateFAQ = (index: number, field: 'question' | 'answer', value: string) => {
    const updated = [...faq];
    updated[index][field] = value;
    setFaq(updated);
  };

  const removeFAQ = (index: number) => {
    setFaq(faq.filter((_, i) => i !== index));
  };

  const addScheduleItem = () => {
    setSchedule([...schedule, { time: '', title: '', description: '' }]);
  };

  const updateScheduleItem = (index: number, field: keyof ScheduleItem, value: string) => {
    const updated = [...schedule];
    updated[index][field] = value;
    setSchedule(updated);
  };

  const removeScheduleItem = (index: number) => {
    setSchedule(schedule.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('events')
        .update({
          gallery_images: galleryImages,
          faq: faq.filter(f => f.question && f.answer) as any,
          schedule: schedule.filter(s => s.time && s.title) as any,
          additional_info: additionalInfo
        })
        .eq('id', eventId);

      if (error) throw error;
      toast.success('Event customization saved!');
    } catch (error: any) {
      toast.error('Failed to save customization');
    }
  };

  return (
    <div className="space-y-6">
      {/* Gallery */}
      <Card>
        <CardHeader>
          <CardTitle>Event Gallery</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="gallery">Upload Images</Label>
            <Input
              id="gallery"
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              disabled={uploading}
            />
          </div>
          
          {galleryImages.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {galleryImages.map((url, index) => (
                <div key={index} className="relative group">
                  <img 
                    src={url} 
                    alt={`Gallery ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border-2 border-border"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeImage(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>FAQ</CardTitle>
            <Button variant="outline" size="sm" onClick={addFAQ}>
              <Plus className="w-4 h-4 mr-2" />
              Add FAQ
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {faq.map((item, index) => (
            <div key={index} className="space-y-2 p-4 border rounded-lg">
              <div className="flex justify-between items-start">
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Question"
                    value={item.question}
                    onChange={(e) => updateFAQ(index, 'question', e.target.value)}
                  />
                  <Textarea
                    placeholder="Answer"
                    value={item.answer}
                    onChange={(e) => updateFAQ(index, 'answer', e.target.value)}
                    rows={2}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFAQ(index)}
                  className="ml-2"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Schedule */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Event Schedule</CardTitle>
            <Button variant="outline" size="sm" onClick={addScheduleItem}>
              <Plus className="w-4 h-4 mr-2" />
              Add Schedule Item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {schedule.map((item, index) => (
            <div key={index} className="space-y-2 p-4 border rounded-lg">
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 space-y-2">
                  <Input
                    type="time"
                    placeholder="Time"
                    value={item.time}
                    onChange={(e) => updateScheduleItem(index, 'time', e.target.value)}
                  />
                  <Input
                    placeholder="Title"
                    value={item.title}
                    onChange={(e) => updateScheduleItem(index, 'title', e.target.value)}
                  />
                  <Textarea
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => updateScheduleItem(index, 'description', e.target.value)}
                    rows={2}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeScheduleItem(index)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Additional Info */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Add any additional information about the event..."
            value={additionalInfo}
            onChange={(e) => setAdditionalInfo(e.target.value)}
            rows={5}
          />
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full" size="lg" variant="cyber">
        Save Customization
      </Button>
    </div>
  );
};