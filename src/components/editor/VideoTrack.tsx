import React, { useEffect, useState } from 'react';
import { Trash2, Video as VideoIcon } from 'lucide-react';

interface VideoTrackProps {
    file: File;
    index: number;
    text: string;
    onTextChange: (text: string) => void;
    onTrimChange: (index: number, start: number, end: number) => void;
    onDurationChange: (index: number, duration: number) => void;
    onRemove: (index: number) => void;
}

export const VideoTrack: React.FC<VideoTrackProps> = ({ file, index, text, onTextChange, onTrimChange, onDurationChange, onRemove }) => {
    const [duration, setDuration] = useState<number>(0);
    const [videoUrl, setVideoUrl] = useState<string>('');

    useEffect(() => {
        const url = URL.createObjectURL(file);
        setVideoUrl(url);

        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
            setDuration(video.duration);
            onTrimChange(index, 0, video.duration);
            onDurationChange(index, video.duration);
        };
        video.src = url;

        return () => {
            URL.revokeObjectURL(url);
        };
    }, [file]);

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        const milliseconds = Math.floor((time % 1) * 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
    };

    return (
        <div className="bg-gray-800 p-4 rounded-lg mb-4 border border-gray-800 hover:border-gray-700 transition-colors shadow-xl">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center shrink-0 overflow-hidden relative border border-gray-800">
                        {videoUrl ? (
                            <video src={videoUrl} className="w-full h-full object-cover opacity-50" />
                        ) : (
                            <VideoIcon size={20} className="text-gray-500" />
                        )}
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white bg-black/40">
                            {index + 1}
                        </span>
                    </div>
                    <div className="overflow-hidden">
                        <div className="text-white text-sm font-bold truncate w-40" title={file.name}>
                            {file.name}
                        </div>
                        <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest">
                            {formatTime(duration)}
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => onRemove(index)}
                    className="p-2 hover:bg-red-500 text-gray-500 hover:text-white rounded-xl transition-all shadow-lg"
                >
                    <Trash2 size={16} />
                </button>
            </div>

            <div className="mt-2">
                <input
                    type="text"
                    value={text}
                    onChange={(e) => onTextChange(e.target.value)}
                    placeholder={`e.g. "Wait for it... 👀"`}
                    className="w-full bg-gray-900 border border-gray-800 text-gray-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder-gray-600 font-medium"
                />
            </div>
        </div>
    );
};
