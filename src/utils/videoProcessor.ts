/**
 * Extracts representative frames from a video file.
 * @param file The video file to process
 * @param count Number of frames to extract (default 3: start, middle, end)
 * @returns Array of base64 image strings (image/jpeg)
 */
export const extractFramesFromVideo = async (file: File, count: number = 3): Promise<string[]> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const frames: string[] = [];

        // Create URL for the file
        const url = URL.createObjectURL(file);
        video.src = url;
        video.muted = true; // Required to play/seek without user interaction issues
        video.playsInline = true;

        // Scale down for API efficiency (e.g., max 512px height)
        const MAX_HEIGHT = 512;

        video.onloadedmetadata = async () => {
            canvas.height = Math.min(video.videoHeight, MAX_HEIGHT);
            canvas.width = (video.videoWidth / video.videoHeight) * canvas.height;

            const duration = video.duration;
            // Points to sample: 10%, 50%, 90%
            const timePoints = [
                duration * 0.1,
                duration * 0.5,
                duration * 0.9
            ];

            try {
                for (const time of timePoints) {
                    await seekToTime(video, time);
                    if (ctx) {
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        // Get base64 without the data prefix for Gemini SDK (mostly)
                        // Actually SDK usually expects base64 string.
                        // toDataURL returns "data:image/jpeg;base64,..."
                        // We'll keep the full string here and clean it in the gemini service if needed.
                        frames.push(canvas.toDataURL('image/jpeg', 0.8));
                    }
                }
                URL.revokeObjectURL(url);
                resolve(frames);
            } catch (err) {
                URL.revokeObjectURL(url);
                reject(err);
            }
        };

        video.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Error loading video'));
        };
    });
};

const seekToTime = (video: HTMLVideoElement, time: number): Promise<void> => {
    return new Promise((resolve) => {
        const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            resolve();
        };
        video.addEventListener('seeked', onSeeked);
        video.currentTime = time;
    });
};
