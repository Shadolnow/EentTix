import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Ticket, QrCode, Sparkles, LogOut, ExternalLink } from 'lucide-react';
import heroImage from '@/assets/eventtix-hero.jpg';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const Index = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-primary/20 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Ticket className="w-8 h-8 text-primary" />
            <span className="text-2xl font-bold text-gradient-cyber">EventTix</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link to="/events">
              <Button variant="ghost">My Events</Button>
            </Link>
            <Link to="/create-event">
              <Button variant="neon">Create Event</Button>
            </Link>
            <Link to="/scan">
              <Button variant="ghost">
                <QrCode className="w-4 h-4" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={() => signOut()}>
              <LogOut className="w-4 h-4" />
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-10 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
        </div>

        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-5xl md:text-7xl font-bold leading-tight">
                <span className="text-gradient-cyber">Digital Tickets</span>
                <br />
                <span className="text-foreground">For The Future</span>
              </h1>
              <p className="text-xl text-muted-foreground">
                Create stunning event tickets with QR codes. Secure, beautiful, and easy to validate.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/create-event">
                  <Button variant="cyber" size="xl" className="group">
                    <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    Create Event
                  </Button>
                </Link>
                <Link to="/events">
                  <Button variant="neon" size="xl">
                    View Events
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-accent/30 to-secondary/30 blur-3xl animate-pulse-slow" />
              <img
                src={heroImage}
                alt="Digital event tickets"
                className="relative rounded-xl shadow-neon-cyan border-2 border-primary/30 animate-float"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 border-t border-primary/20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">
            <span className="text-gradient-cyber">Features</span>
          </h2>
          
          {/* Public Events QR Code Card */}
          <Card className="max-w-md mx-auto mb-12 border-2 border-primary/30 bg-gradient-to-br from-card to-card/80">
            <CardHeader>
              <CardTitle className="text-center text-2xl">Share Public Events Page</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <QRCodeSVG 
                value={`${window.location.origin}/public-events`}
                size={200}
                level="H"
                className="border-4 border-primary/20 rounded-lg p-2 bg-white"
              />
              <p className="text-center text-sm text-muted-foreground">
                Anyone can scan this QR code to view all your events
              </p>
              <div className="flex gap-2 w-full">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    const url = `${window.location.origin}/public-events`;
                    navigator.clipboard.writeText(url);
                    toast.success('Link copied to clipboard!');
                  }}
                >
                  Copy Link
                </Button>
                <Link to="/public-events" className="flex-1">
                  <Button variant="default" className="w-full">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Page
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-xl border-2 border-primary/20 hover:border-primary/40 transition-colors hover:shadow-neon-cyan">
              <Ticket className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-2">Custom Tickets</h3>
              <p className="text-muted-foreground">
                Design beautiful digital tickets with your event details, dates, and promotions.
              </p>
            </div>
            <div className="p-6 rounded-xl border-2 border-accent/20 hover:border-accent/40 transition-colors hover:shadow-neon-cyan">
              <QrCode className="w-12 h-12 text-accent mb-4" />
              <h3 className="text-xl font-bold mb-2">QR Validation</h3>
              <p className="text-muted-foreground">
                Secure QR codes that can be validated instantly at your event entrance.
              </p>
            </div>
            <div className="p-6 rounded-xl border-2 border-secondary/20 hover:border-secondary/40 transition-colors hover:shadow-neon-magenta">
              <Sparkles className="w-12 h-12 text-secondary mb-4" />
              <h3 className="text-xl font-bold mb-2">Global Ready</h3>
              <p className="text-muted-foreground">
                Create events for any location worldwide with full customization options.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;