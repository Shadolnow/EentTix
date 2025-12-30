import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ZXingScanner } from '@/components/ZXingScanner';
import { Camera, Zap, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export const ScannerTest = () => {
    const navigate = useNavigate();
    const [showZXingScanner, setShowZXingScanner] = useState(false);
    const [scannedCode, setScannedCode] = useState<string>('');

    const handleScan = (code: string) => {
        setScannedCode(code);
        setShowZXingScanner(false);
        toast.success('QR Code Scanned!', {
            description: `Code: ${code}`
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(-1)}
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold">Scanner Test Lab</h1>
                        <p className="text-muted-foreground">Test different scanner implementations</p>
                    </div>
                </div>

                {/* Scanner Options */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Old Scanner (html5-qrcode) */}
                    <Card className="border-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Camera className="w-5 h-5" />
                                Old Scanner
                            </CardTitle>
                            <CardDescription>
                                Using html5-qrcode library (current implementation)
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-sm space-y-2">
                                <p><strong>Pros:</strong></p>
                                <ul className="list-disc list-inside text-muted-foreground">
                                    <li>Familiar interface</li>
                                    <li>Existing implementation</li>
                                </ul>
                                <p><strong>Cons:</strong></p>
                                <ul className="list-disc list-inside text-muted-foreground">
                                    <li>Camera selection issues</li>
                                    <li>Front camera opens</li>
                                    <li>Scanning problems</li>
                                </ul>
                            </div>
                            <Button
                                className="w-full"
                                onClick={() => navigate('/scanner/test-event')}
                            >
                                <Camera className="w-4 h-4 mr-2" />
                                Test Old Scanner
                            </Button>
                        </CardContent>
                    </Card>

                    {/* New Scanner (ZXing) */}
                    <Card className="border-2 border-primary">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Zap className="w-5 h-5 text-primary" />
                                NEW Scanner (ZXing)
                            </CardTitle>
                            <CardDescription>
                                Using @zxing/browser library (recommended)
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-sm space-y-2">
                                <p><strong>Pros:</strong></p>
                                <ul className="list-disc list-inside text-muted-foreground">
                                    <li>Better camera control</li>
                                    <li>Automatic back camera</li>
                                    <li>Camera switching</li>
                                    <li>Faster scanning</li>
                                </ul>
                                <p><strong>Features:</strong></p>
                                <ul className="list-disc list-inside text-primary">
                                    <li>✅ Auto back camera</li>
                                    <li>✅ Manual camera switch</li>
                                    <li>✅ Flashlight control</li>
                                </ul>
                            </div>
                            <Button
                                className="w-full"
                                variant="default"
                                onClick={() => setShowZXingScanner(true)}
                            >
                                <Zap className="w-4 h-4 mr-2" />
                                Test NEW Scanner
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Scanned Result */}
                {scannedCode && (
                    <Card className="border-2 border-green-500">
                        <CardHeader>
                            <CardTitle className="text-green-600">✅ Scan Successful!</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-muted p-4 rounded-lg">
                                <p className="text-sm text-muted-foreground mb-1">Scanned Code:</p>
                                <p className="font-mono text-lg font-bold break-all">{scannedCode}</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Instructions */}
                <Card>
                    <CardHeader>
                        <CardTitle>📋 Testing Instructions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <h3 className="font-semibold mb-2">1. Test on Mobile Phone</h3>
                            <p className="text-sm text-muted-foreground">
                                This test page works best on mobile. Access it from your phone's browser.
                            </p>
                        </div>

                        <div>
                            <h3 className="font-semibold mb-2">2. Grant Camera Permission</h3>
                            <p className="text-sm text-muted-foreground">
                                When prompted, tap "Allow" to grant camera access.
                            </p>
                        </div>

                        <div>
                            <h3 className="font-semibold mb-2">3. Check Which Camera Opens</h3>
                            <p className="text-sm text-muted-foreground">
                                The NEW scanner should automatically open the back camera. If it opens front camera, use the camera switch button.
                            </p>
                        </div>

                        <div>
                            <h3 className="font-semibold mb-2">4. Test Scanning</h3>
                            <p className="text-sm text-muted-foreground">
                                Point the camera at any QR code to test scanning speed and accuracy.
                            </p>
                        </div>

                        <div className="bg-primary/10 p-4 rounded-lg">
                            <p className="text-sm font-semibold">💡 Recommendation:</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                If the NEW scanner works better, we can replace the old scanner throughout the app.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ZXing Scanner Modal */}
            {showZXingScanner && (
                <ZXingScanner
                    onScan={handleScan}
                    onClose={() => setShowZXingScanner(false)}
                />
            )}
        </div>
    );
};
