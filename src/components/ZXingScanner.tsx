import { useState, useEffect, useRef } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { Button } from '@/components/ui/button';
import { Camera, X, Flashlight, FlashlightOff } from 'lucide-react';
import { toast } from 'sonner';

interface ZXingScannerProps {
    onScan: (code: string) => void;
    onClose: () => void;
}

export const ZXingScanner = ({ onScan, onClose }: ZXingScannerProps) => {
    const [isScanning, setIsScanning] = useState(false);
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDevice, setSelectedDevice] = useState<string>('');
    const [torchOn, setTorchOn] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        initScanner();
        return () => {
            stopScanner();
        };
    }, []);

    const initScanner = async () => {
        try {
            // Create code reader
            const codeReader = new BrowserMultiFormatReader();
            codeReaderRef.current = codeReader;

            // Get all video input devices
            const videoInputDevices = await codeReader.listVideoInputDevices();
            console.log('📷 All cameras found:', videoInputDevices);

            setDevices(videoInputDevices);

            if (videoInputDevices.length === 0) {
                toast.error('No camera found on this device');
                return;
            }

            // Find back camera - try multiple strategies
            let backCamera = videoInputDevices.find(device =>
                /back|rear|environment|traseira|arrière|主摄|后置/i.test(device.label)
            );

            // If no back camera found by label, use the LAST camera (usually back on mobile)
            if (!backCamera && videoInputDevices.length > 1) {
                backCamera = videoInputDevices[videoInputDevices.length - 1];
                console.log('📷 Using last camera as back camera:', backCamera);
            }

            // If still no back camera, use first available
            const cameraToUse = backCamera || videoInputDevices[0];

            console.log('📷 Selected camera:', cameraToUse);
            setSelectedDevice(cameraToUse.deviceId);

            // Start scanning with selected camera
            startScanning(cameraToUse.deviceId);

        } catch (error) {
            console.error('Scanner init error:', error);
            toast.error('Failed to initialize scanner');
        }
    };

    const startScanning = async (deviceId: string) => {
        if (!codeReaderRef.current || !videoRef.current) return;

        try {
            setIsScanning(true);

            // Get constraints for back camera
            const constraints: MediaStreamConstraints = {
                video: {
                    deviceId: deviceId ? { exact: deviceId } : undefined,
                    facingMode: deviceId ? undefined : { ideal: 'environment' },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            };

            console.log('📷 Starting with constraints:', constraints);

            // Start decoding from video device
            await codeReaderRef.current.decodeFromConstraints(
                constraints,
                videoRef.current,
                (result, error) => {
                    if (result) {
                        console.log('✅ QR Code scanned:', result.getText());

                        // Vibrate on success
                        if (navigator.vibrate) {
                            navigator.vibrate(200);
                        }

                        // Call parent handler
                        onScan(result.getText());

                        // Stop scanner after successful scan
                        stopScanner();
                    }

                    if (error && !(error instanceof NotFoundException)) {
                        console.error('Scan error:', error);
                    }
                }
            );

            // Get the stream for torch control
            if (videoRef.current.srcObject) {
                streamRef.current = videoRef.current.srcObject as MediaStream;
            }

            toast.success('Scanner started - Point at QR code');

        } catch (error: any) {
            console.error('Start scanning error:', error);
            setIsScanning(false);

            let errorMsg = 'Failed to start camera';
            if (error.name === 'NotAllowedError') {
                errorMsg = 'Camera permission denied';
            } else if (error.name === 'NotFoundError') {
                errorMsg = 'No camera found';
            } else if (error.name === 'NotReadableError') {
                errorMsg = 'Camera is being used by another app';
            }

            toast.error(errorMsg);
        }
    };

    const stopScanner = () => {
        if (codeReaderRef.current) {
            codeReaderRef.current.reset();
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        setIsScanning(false);
    };

    const toggleTorch = async () => {
        if (!streamRef.current) return;

        try {
            const track = streamRef.current.getVideoTracks()[0];
            const capabilities = track.getCapabilities() as any;

            if (capabilities.torch) {
                await track.applyConstraints({
                    // @ts-ignore
                    advanced: [{ torch: !torchOn }]
                });
                setTorchOn(!torchOn);
            } else {
                toast.error('Flashlight not supported on this device');
            }
        } catch (error) {
            console.error('Torch error:', error);
            toast.error('Failed to toggle flashlight');
        }
    };

    const switchCamera = async () => {
        if (devices.length < 2) {
            toast.error('Only one camera available');
            return;
        }

        stopScanner();

        // Find next camera
        const currentIndex = devices.findIndex(d => d.deviceId === selectedDevice);
        const nextIndex = (currentIndex + 1) % devices.length;
        const nextDevice = devices[nextIndex];

        console.log('📷 Switching to camera:', nextDevice);
        setSelectedDevice(nextDevice.deviceId);
        startScanning(nextDevice.deviceId);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black">
            {/* Video Preview */}
            <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
            />

            {/* Overlay with QR box */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                    {/* QR Code Box */}
                    <div className="w-64 h-64 border-4 border-primary rounded-lg relative">
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg"></div>
                    </div>

                    {/* Instructions */}
                    <p className="text-white text-center mt-4 text-sm">
                        Position QR code within the frame
                    </p>
                </div>
            </div>

            {/* Controls */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4 px-4">
                {/* Close Button */}
                <Button
                    variant="destructive"
                    size="lg"
                    onClick={() => {
                        stopScanner();
                        onClose();
                    }}
                    className="rounded-full w-14 h-14"
                >
                    <X className="w-6 h-6" />
                </Button>

                {/* Switch Camera Button */}
                {devices.length > 1 && (
                    <Button
                        variant="secondary"
                        size="lg"
                        onClick={switchCamera}
                        className="rounded-full w-14 h-14"
                    >
                        <Camera className="w-6 h-6" />
                    </Button>
                )}

                {/* Flashlight Button */}
                <Button
                    variant="secondary"
                    size="lg"
                    onClick={toggleTorch}
                    className="rounded-full w-14 h-14"
                >
                    {torchOn ? (
                        <FlashlightOff className="w-6 h-6" />
                    ) : (
                        <Flashlight className="w-6 h-6" />
                    )}
                </Button>
            </div>

            {/* Camera Info (Debug) */}
            <div className="absolute top-4 left-4 right-4 bg-black/50 text-white p-2 rounded text-xs">
                <p>Camera: {devices.find(d => d.deviceId === selectedDevice)?.label || 'Unknown'}</p>
                <p>Devices: {devices.length}</p>
                <p>Status: {isScanning ? '🟢 Scanning...' : '🔴 Stopped'}</p>
            </div>
        </div>
    );
};
