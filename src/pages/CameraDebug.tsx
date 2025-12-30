import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const CameraDebug = () => {
    const [log, setLog] = useState<string[]>([]);
    const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);

    const addLog = (msg: string) => {
        console.log(msg);
        setLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
    };

    const checkSupport = () => {
        addLog('--- CHECKING BROWSER SUPPORT ---');

        // Check if mediaDevices exists
        if (!navigator.mediaDevices) {
            addLog('❌ navigator.mediaDevices is NOT available');
            addLog('This usually means:');
            addLog('  - Not using HTTPS');
            addLog('  - Very old browser');
            return false;
        }
        addLog('✅ navigator.mediaDevices exists');

        // Check if getUserMedia exists
        if (!navigator.mediaDevices.getUserMedia) {
            addLog('❌ getUserMedia is NOT available');
            return false;
        }
        addLog('✅ getUserMedia exists');

        // Check if enumerateDevices exists
        if (!navigator.mediaDevices.enumerateDevices) {
            addLog('❌ enumerateDevices is NOT available');
            return false;
        }
        addLog('✅ enumerateDevices exists');

        addLog('✅ All camera APIs are supported');
        return true;
    };

    const listDevices = async () => {
        addLog('--- LISTING ALL DEVICES ---');
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(d => d.kind === 'videoinput');

            addLog(`Found ${videoDevices.length} video input devices:`);
            videoDevices.forEach((device, i) => {
                addLog(`  ${i + 1}. ${device.label || 'Unnamed Device'} (${device.deviceId.slice(0, 8)}...)`);
            });

            if (videoDevices.length === 0) {
                addLog('❌ NO CAMERAS FOUND ON THIS DEVICE');
            }

            return videoDevices;
        } catch (err: any) {
            addLog(`❌ Error listing devices: ${err.message}`);
            return [];
        }
    };

    const requestPermission = async () => {
        addLog('--- REQUESTING CAMERA PERMISSION ---');
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
            });

            addLog('✅ PERMISSION GRANTED!');
            addLog(`Stream has ${mediaStream.getVideoTracks().length} video track(s)`);

            const track = mediaStream.getVideoTracks()[0];
            addLog(`Track: ${track.label}`);
            addLog(`Track enabled: ${track.enabled}`);
            addLog(`Track state: ${track.readyState}`);

            // Show in video element
            if (videoRef) {
                videoRef.srcObject = mediaStream;
                await videoRef.play();
                addLog('✅ Video is playing!');
            }

            setStream(mediaStream);
            return mediaStream;
        } catch (err: any) {
            addLog(`❌ PERMISSION ERROR: ${err.name}`);
            addLog(`   Message: ${err.message}`);

            if (err.name === 'NotAllowedError') {
                addLog('📌 USER DENIED CAMERA ACCESS');
                addLog('   Solution: Click camera icon in address bar → Allow');
            } else if (err.name === 'NotFoundError') {
                addLog('📌 NO CAMERA FOUND');
                addLog('   Solution: Connect a camera or use a different device');
            } else if (err.name === 'NotReadableError') {
                addLog('📌 CAMERA IS BUSY');
                addLog('   Solution: Close other apps using camera');
            } else if (err.name === 'OverconstrainedError') {
                addLog('📌 CAMERA SETTINGS NOT SUPPORTED');
            } else if (err.name === 'SecurityError') {
                addLog('📌 SECURITY ERROR - NOT HTTPS?');
            }

            return null;
        }
    };

    const tryBackCamera = async () => {
        addLog('--- TRYING BACK CAMERA ---');
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false
            });

            addLog('✅ BACK CAMERA STARTED!');

            if (videoRef) {
                videoRef.srcObject = mediaStream;
                await videoRef.play();
            }

            setStream(mediaStream);
            return mediaStream;
        } catch (err: any) {
            addLog(`❌ Back camera error: ${err.name} - ${err.message}`);
            return null;
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
            addLog('Camera stopped');
        }
    };

    const runFullDiagnostic = async () => {
        setLog([]);
        addLog('========================================');
        addLog('   CAMERA DIAGNOSTIC TEST');
        addLog('========================================');
        addLog(`URL: ${window.location.href}`);
        addLog(`Protocol: ${window.location.protocol}`);
        addLog(`User Agent: ${navigator.userAgent.slice(0, 50)}...`);
        addLog('');

        // Step 1: Check support
        const supported = checkSupport();
        if (!supported) {
            addLog('❌ DIAGNOSIS: Camera APIs not supported');
            return;
        }

        addLog('');

        // Step 2: List devices (before permission)
        addLog('Listing devices BEFORE permission request:');
        await listDevices();

        addLog('');

        // Step 3: Request permission
        const permStream = await requestPermission();

        if (permStream) {
            permStream.getTracks().forEach(t => t.stop());
        }

        addLog('');

        // Step 4: List devices (after permission - should have labels now)
        addLog('Listing devices AFTER permission request:');
        await listDevices();

        addLog('');
        addLog('========================================');
        addLog('   DIAGNOSTIC COMPLETE');
        addLog('========================================');
    };

    return (
        <div className="min-h-screen bg-background p-4">
            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle>📷 Camera Diagnostic Tool</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Video Preview */}
                    <div className="bg-black rounded-lg overflow-hidden aspect-video">
                        <video
                            ref={setVideoRef}
                            className="w-full h-full object-cover"
                            autoPlay
                            playsInline
                            muted
                        />
                    </div>

                    {/* Control Buttons */}
                    <div className="flex flex-wrap gap-2">
                        <Button onClick={runFullDiagnostic} className="bg-blue-600">
                            🔍 Run Full Diagnostic
                        </Button>
                        <Button onClick={requestPermission} variant="secondary">
                            🎥 Request Permission
                        </Button>
                        <Button onClick={tryBackCamera} variant="secondary">
                            📷 Try Back Camera
                        </Button>
                        <Button onClick={listDevices} variant="outline">
                            📋 List Devices
                        </Button>
                        <Button onClick={stopCamera} variant="destructive">
                            ⏹️ Stop
                        </Button>
                    </div>

                    {/* Log Output */}
                    <div className="bg-gray-900 text-green-400 font-mono text-xs p-4 rounded-lg h-80 overflow-y-auto">
                        {log.length === 0 ? (
                            <p className="text-gray-500">Click "Run Full Diagnostic" to start...</p>
                        ) : (
                            log.map((line, i) => (
                                <div key={i} className={
                                    line.includes('❌') ? 'text-red-400' :
                                        line.includes('✅') ? 'text-green-400' :
                                            line.includes('📌') ? 'text-yellow-400' :
                                                ''
                                }>
                                    {line}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Instructions */}
                    <div className="text-sm text-muted-foreground space-y-2">
                        <p><strong>How to use:</strong></p>
                        <ol className="list-decimal list-inside space-y-1">
                            <li>Click "Run Full Diagnostic"</li>
                            <li>When browser asks for camera permission → Click "Allow"</li>
                            <li>Share the log output with support</li>
                        </ol>
                        <p className="text-yellow-500 mt-2">
                            ⚠️ If you never see a permission popup, camera might be permanently blocked.
                            Click the lock icon 🔒 in address bar → Camera → Allow
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default CameraDebug;
