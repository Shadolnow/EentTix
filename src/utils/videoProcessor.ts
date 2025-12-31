/**
 * Video Processing Utility
 * Automatically trims videos to 15 seconds and converts to MP4
 */

export interface VideoProcessingResult {
    blob: Blob;
    duration: number;
    size: number;
    width: number;
    height: number;
}

/**
 * Get video metadata (duration, dimensions)
 */
export const getVideoMetadata = (file: File): Promise<{
    duration: number;
    width: number;
    height: number;
}> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';

        video.onloadedmetadata = () => {
            window.URL.revokeObjectURL(video.src);
            resolve({
                duration: video.duration,
                width: video.videoWidth,
                height: video.videoHeight,
            });
        };

        video.onerror = () => {
            reject(new Error('Failed to load video metadata'));
        };

        video.src = URL.createObjectURL(file);
    });
};

/**
 * Trim video to 15 seconds using Canvas API (browser-based, no external dependencies)
 * This is a lightweight solution that works client-side
 */
export const trimVideoTo15Seconds = async (
    file: File,
    onProgress?: (progress: number) => void
): Promise<VideoProcessingResult> => {
    try {
        // Get video metadata first
        const metadata = await getVideoMetadata(file);

        // If video is already 15 seconds or less, return as-is
        if (metadata.duration <= 15) {
            return {
                blob: file,
                duration: metadata.duration,
                size: file.size,
                width: metadata.width,
                height: metadata.height,
            };
        }

        // Create video element for processing
        const video = document.createElement('video');
        video.src = URL.createObjectURL(file);
        video.muted = true;

        await new Promise((resolve) => {
            video.onloadeddata = resolve;
        });

        // Create canvas for frame capture
        const canvas = document.createElement('canvas');
        canvas.width = metadata.width;
        canvas.height = metadata.height;
        const ctx = canvas.getContext('2d')!;

        // Set up MediaRecorder to record trimmed video
        const stream = canvas.captureStream(30); // 30 FPS

        // Get audio track if available
        const audioContext = new AudioContext();
        const videoElement = document.createElement('video');
        videoElement.src = URL.createObjectURL(file);
        await videoElement.play();

        const mediaStream = (videoElement as any).captureStream ?
            (videoElement as any).captureStream() :
            new MediaStream();

        // Add audio track if available
        if (mediaStream.getAudioTracks().length > 0) {
            stream.addTrack(mediaStream.getAudioTracks()[0]);
        }

        const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9', // WebM for better browser support
            videoBitsPerSecond: 2500000, // 2.5 Mbps for good quality
        });

        const chunks: Blob[] = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                chunks.push(e.data);
            }
        };

        // Start recording
        mediaRecorder.start(100); // Capture every 100ms

        // Play and capture frames
        video.currentTime = 0;
        await video.play();

        let frameCount = 0;
        const maxFrames = 15 * 30; // 15 seconds at 30 FPS

        const captureFrame = () => {
            if (frameCount >= maxFrames || video.currentTime >= 15) {
                mediaRecorder.stop();
                video.pause();
                URL.revokeObjectURL(video.src);
                return;
            }

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            frameCount++;

            if (onProgress) {
                onProgress((frameCount / maxFrames) * 100);
            }

            requestAnimationFrame(captureFrame);
        };

        return new Promise((resolve, reject) => {
            mediaRecorder.onstop = async () => {
                const trimmedBlob = new Blob(chunks, { type: 'video/webm' });

                // Convert WebM to MP4 if needed (fallback to WebM if conversion fails)
                try {
                    const mp4Blob = await convertToMP4(trimmedBlob);
                    resolve({
                        blob: mp4Blob,
                        duration: 15,
                        size: mp4Blob.size,
                        width: metadata.width,
                        height: metadata.height,
                    });
                } catch (error) {
                    console.warn('MP4 conversion failed, using WebM:', error);
                    resolve({
                        blob: trimmedBlob,
                        duration: 15,
                        size: trimmedBlob.size,
                        width: metadata.width,
                        height: metadata.height,
                    });
                }
            };

            mediaRecorder.onerror = (error) => {
                reject(error);
            };

            captureFrame();
        });
    } catch (error) {
        console.error('Video trimming error:', error);
        throw new Error('Failed to trim video. Please try a different file.');
    }
};

/**
 * Simple MP4 conversion (uses browser's native video encoder)
 * Note: This creates an MP4 container but actual codec support depends on browser
 */
const convertToMP4 = async (blob: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.src = URL.createObjectURL(blob);

        video.onloadedmetadata = async () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d')!;

            const stream = canvas.captureStream(30);

            // Try to use MP4 if supported, otherwise fall back to WebM
            let mimeType = 'video/mp4;codecs=avc1';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'video/webm;codecs=vp9';
            }

            const recorder = new MediaRecorder(stream, {
                mimeType,
                videoBitsPerSecond: 2500000,
            });

            const chunks: Blob[] = [];
            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = () => {
                const outputBlob = new Blob(chunks, {
                    type: mimeType.includes('mp4') ? 'video/mp4' : 'video/webm'
                });
                URL.revokeObjectURL(video.src);
                resolve(outputBlob);
            };

            recorder.onerror = reject;

            recorder.start();
            video.currentTime = 0;
            await video.play();

            const drawFrame = () => {
                if (video.ended || video.paused) {
                    recorder.stop();
                    return;
                }
                ctx.drawImage(video, 0, 0);
                requestAnimationFrame(drawFrame);
            };

            drawFrame();
        };

        video.onerror = reject;
    });
};

/**
 * Validate video file
 */
export const validateVideoFile = (file: File): { valid: boolean; error?: string } => {
    const validTypes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'];

    if (!validTypes.includes(file.type)) {
        return {
            valid: false,
            error: 'Invalid video format. Please use MP4, MOV, WebM, or AVI.',
        };
    }

    // Max 500MB before trimming
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
        return {
            valid: false,
            error: 'Video file is too large. Maximum size is 500MB.',
        };
    }

    return { valid: true };
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};
