import React, { useState } from 'react';
import { Upload, Film, Loader2, CheckCircle, AlertCircle, Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    trimVideoTo15Seconds,
    validateVideoFile,
    formatFileSize,
    getVideoMetadata,
} from '@/utils/videoProcessor';

interface VideoUploadWithTrimProps {
    onVideoProcessed: (file: File | Blob, metadata: {
        duration: number;
        width: number;
        height: number;
        originalSize: number;
        processedSize: number;
    }) => void;
    maxSizeBytes?: number;
}

export const VideoUploadWithTrim: React.FC<VideoUploadWithTrimProps> = ({
    onVideoProcessed,
    maxSizeBytes = 500 * 1024 * 1024, // 500MB default
}) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState<{
        type: 'idle' | 'processing' | 'success' | 'error';
        message: string;
    }>({ type: 'idle', message: '' });
    const [videoPreview, setVideoPreview] = useState<string | null>(null);

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Reset state
        setProgress(0);
        setStatus({ type: 'idle', message: '' });

        // Validate file
        const validation = validateVideoFile(file);
        if (!validation.valid) {
            setStatus({ type: 'error', message: validation.error || 'Invalid file' });
            return;
        }

        setSelectedFile(file);
        setVideoPreview(URL.createObjectURL(file));

        // Get metadata to show user
        try {
            const metadata = await getVideoMetadata(file);
            const durationText = metadata.duration > 15
                ? `This video is ${Math.round(metadata.duration)}s. It will be auto-trimmed to 15s.`
                : `Video duration: ${Math.round(metadata.duration)}s - No trimming needed.`;

            setStatus({
                type: 'idle',
                message: durationText
            });
        } catch (error) {
            console.error('Failed to get metadata:', error);
        }
    };

    const handleProcessAndUpload = async () => {
        if (!selectedFile) return;

        setProcessing(true);
        setStatus({ type: 'processing', message: 'Processing video...' });
        setProgress(0);

        try {
            const originalSize = selectedFile.size;

            // Trim video to 15 seconds
            const result = await trimVideoTo15Seconds(selectedFile, (progressPercent) => {
                setProgress(progressPercent);
            });

            // Create a File object from the processed blob
            const processedFile = new File(
                [result.blob],
                selectedFile.name.replace(/\.[^/.]+$/, '_trimmed.mp4'),
                { type: 'video/mp4' }
            );

            setStatus({
                type: 'success',
                message: `Video processed! Duration: ${result.duration}s, Size: ${formatFileSize(result.size)}`
            });

            // Call parent callback with processed video
            onVideoProcessed(processedFile, {
                duration: result.duration,
                width: result.width,
                height: result.height,
                originalSize,
                processedSize: result.size,
            });

            setProgress(100);
        } catch (error) {
            console.error('Video processing error:', error);
            setStatus({
                type: 'error',
                message: error instanceof Error ? error.message : 'Failed to process video'
            });
        } finally {
            setProcessing(false);
        }
    };

    const handleCancel = () => {
        setSelectedFile(null);
        setVideoPreview(null);
        setProgress(0);
        setStatus({ type: 'idle', message: '' });
    };

    return (
        <div className="space-y-4">
            {/* File Input */}
            {!selectedFile && (
                <div className="border-2 border-dashed border-primary/20 rounded-lg p-8 text-center hover:border-primary/40 transition-colors">
                    <input
                        type="file"
                        accept="video/mp4,video/quicktime,video/webm,video/x-msvideo"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="video-upload"
                    />
                    <label htmlFor="video-upload" className="cursor-pointer">
                        <Film className="w-12 h-12 mx-auto mb-4 text-primary" />
                        <p className="text-lg font-semibold mb-2">Upload Event Video</p>
                        <p className="text-sm text-muted-foreground mb-4">
                            MP4, MOV, WebM, or AVI (max 500MB)
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
                            <Scissors className="w-4 h-4" />
                            Videos will be automatically trimmed to 15 seconds
                        </p>
                        <Button className="mt-4" type="button">
                            <Upload className="w-4 h-4 mr-2" />
                            Select Video
                        </Button>
                    </label>
                </div>
            )}

            {/* Video Preview & Processing */}
            {selectedFile && (
                <div className="space-y-4">
                    {/* Preview */}
                    {videoPreview && (
                        <div className="relative rounded-lg overflow-hidden bg-black">
                            <video
                                src={videoPreview}
                                controls
                                className="w-full max-h-96 object-contain"
                            />
                        </div>
                    )}

                    {/* File Info */}
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div>
                            <p className="font-medium">{selectedFile.name}</p>
                            <p className="text-sm text-muted-foreground">
                                {formatFileSize(selectedFile.size)}
                            </p>
                        </div>
                        {status.type === 'success' && (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                        )}
                    </div>

                    {/* Status Messages */}
                    {status.message && (
                        <Alert variant={status.type === 'error' ? 'destructive' : 'default'}>
                            {status.type === 'error' && <AlertCircle className="h-4 w-4" />}
                            {status.type === 'success' && <CheckCircle className="h-4 w-4" />}
                            {status.type === 'processing' && <Loader2 className="h-4 w-4 animate-spin" />}
                            <AlertDescription>{status.message}</AlertDescription>
                        </Alert>
                    )}

                    {/* Progress Bar */}
                    {processing && (
                        <div className="space-y-2">
                            <Progress value={progress} className="w-full" />
                            <p className="text-sm text-center text-muted-foreground">
                                {Math.round(progress)}% complete
                            </p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <Button
                            onClick={handleProcessAndUpload}
                            disabled={processing || status.type === 'success'}
                            className="flex-1"
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Processing...
                                </>
                            ) : status.type === 'success' ? (
                                <>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Processed
                                </>
                            ) : (
                                <>
                                    <Scissors className="w-4 h-4 mr-2" />
                                    Process & Trim to 15s
                                </>
                            )}
                        </Button>

                        <Button
                            variant="outline"
                            onClick={handleCancel}
                            disabled={processing}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
