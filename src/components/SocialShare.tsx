import { Button } from '@/components/ui/button';
import { 
  Share2, 
  Copy, 
  Facebook, 
  Twitter, 
  Linkedin, 
  MessageCircle,
  Mail
} from 'lucide-react';
import { toast } from 'sonner';

interface SocialShareProps {
  url: string;
  title: string;
  description?: string;
  compact?: boolean;
}

export const SocialShare = ({ url, title, description, compact = false }: SocialShareProps) => {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedDesc = encodeURIComponent(description || title);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url
        });
      } catch (error) {
        // User cancelled or share failed
      }
    } else {
      copyToClipboard();
    }
  };

  const shareLinks = [
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      url: `https://web.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`,
      color: 'hover:text-green-500'
    },
    {
      name: 'Facebook',
      icon: Facebook,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: 'hover:text-blue-600'
    },
    {
      name: 'Twitter',
      icon: Twitter,
      url: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      color: 'hover:text-sky-500'
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      color: 'hover:text-blue-700'
    },
    {
      name: 'Email',
      icon: Mail,
      url: `mailto:?subject=${encodedTitle}&body=${encodedDesc}%20${encodedUrl}`,
      color: 'hover:text-red-500'
    }
  ];

  if (compact) {
    return (
      <div className="flex gap-2 flex-wrap">
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleNativeShare}
          className="flex-1 min-w-[100px]"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={copyToClipboard}
          className="flex-1 min-w-[100px]"
        >
          <Copy className="w-4 h-4 mr-2" />
          Copy Link
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Share</h3>
        <Button variant="outline" size="sm" onClick={copyToClipboard}>
          <Copy className="w-4 h-4 mr-2" />
          Copy Link
        </Button>
      </div>
      
      <div className="grid grid-cols-5 gap-3">
        {shareLinks.map((link) => (
          <button
            key={link.name}
            onClick={() => window.open(link.url, '_blank', 'width=600,height=400')}
            className={`flex flex-col items-center gap-2 p-3 rounded-lg border bg-card hover:bg-accent transition-colors ${link.color}`}
            title={`Share on ${link.name}`}
          >
            <link.icon className="w-6 h-6" />
            <span className="text-xs">{link.name}</span>
          </button>
        ))}
      </div>

      {navigator.share && (
        <Button 
          variant="default" 
          className="w-full"
          onClick={handleNativeShare}
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share via...
        </Button>
      )}
    </div>
  );
};