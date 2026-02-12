import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Player } from '@remotion/player';
import { TrendingRankings } from './compositions/TrendingRankings';
import { VideoTrack } from './components/editor/VideoTrack';
import { Sparkles, Upload, Play, Type, Pause, RotateCcw, Copy, Check, Hash, FileText, Info, Search, Download, GripVertical } from 'lucide-react';
import { extractFramesFromVideo } from './utils/videoProcessor';
import { generateOverlays, GeminiSEOOutput } from './utils/gemini';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import './index.css';

// DND Kit Imports
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const VideoIconWrapper = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 7l-7 5 7 5V7z" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
);

interface VideoData {
    file: File;
    id: string;
    url: string;
    trimStart: number;
    trimEnd: number;
    duration: number;
    text: string;
}

// Sortable Wrapper for VideoTrack
interface SortableVideoTrackProps {
    video: VideoData;
    index: number;
    isSelected: boolean;
    onSelect: (index: number) => void;
    onTextChange: (text: string) => void;
    onTrimChange: (index: number, start: number, end: number) => void;
    onDurationChange: (index: number, duration: number) => void;
    onRemove: () => void;
}

const SortableVideoTrack = ({ video, index, isSelected, onSelect, ...props }: SortableVideoTrackProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: video.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 100 : 0,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`relative group transition-all ${isSelected ? 'ring-2 ring-emerald-500 rounded-lg' : ''}`}
        >
            <div
                className="absolute left-1 top-1/2 -translate-y-1/2 z-30 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 bg-gray-800/80 rounded-md border border-gray-700"
                {...attributes}
                {...listeners}
            >
                <GripVertical size={16} className="text-gray-400" />
            </div>
            <div onClick={() => onSelect(index)} className="cursor-pointer">
                <VideoTrack
                    file={video.file}
                    index={index}
                    text={video.text}
                    {...props}
                />
            </div>
        </div>
    );
};

const App: React.FC = () => {
    const [title1, setTitle1] = useState("Ranking The");
    const [title2, setTitle2] = useState("Best");
    const [title3, setTitle3] = useState("Make a Word");
    const [title4, setTitle4] = useState("Challenge");
    const [videos, setVideos] = useState<VideoData[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [selectedVidIndex, setSelectedVidIndex] = useState<number | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [seoData, setSeoData] = useState<GeminiSEOOutput | null>(null);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const focusVideoRef = useRef<HTMLVideoElement>(null);

    const selectedVideo = selectedVidIndex !== null ? videos[selectedVidIndex] : null;

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setVideos((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);
                const rearranged = arrayMove(items, oldIndex, newIndex);

                // Keep selection in sync with the moved item
                if (selectedVidIndex === oldIndex) {
                    setSelectedVidIndex(newIndex);
                } else if (selectedVidIndex !== null) {
                    // Logic to adjust selection if another item moved around it
                    if (oldIndex < selectedVidIndex && newIndex >= selectedVidIndex) {
                        setSelectedVidIndex(selectedVidIndex - 1);
                    } else if (oldIndex > selectedVidIndex && newIndex <= selectedVidIndex) {
                        setSelectedVidIndex(selectedVidIndex + 1);
                    }
                }

                return rearranged;
            });
        }
    };

    // Seek video when trimStart or selected video changes
    useEffect(() => {
        if (focusVideoRef.current && selectedVideo) {
            focusVideoRef.current.currentTime = selectedVideo.trimStart;
            focusVideoRef.current.volume = 1;
        }
    }, [selectedVideo?.id]);

    // Playback sync
    useEffect(() => {
        if (!focusVideoRef.current) return;
        if (isPlaying) {
            focusVideoRef.current.play().catch(console.error);
        } else {
            focusVideoRef.current.pause();
        }
    }, [isPlaying]);

    // Range constraint and loop logic
    useEffect(() => {
        const video = focusVideoRef.current;
        if (!video || !selectedVideo) return;

        const handleTimeUpdate = () => {
            if (video.currentTime >= selectedVideo.trimEnd) {
                video.currentTime = selectedVideo.trimStart;
            }
        };

        video.addEventListener('timeupdate', handleTimeUpdate);
        return () => video.removeEventListener('timeupdate', handleTimeUpdate);
    }, [selectedVideo?.trimEnd, selectedVideo?.trimStart, selectedVideo?.id]);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            const newFiles = Array.from(event.target.files).slice(0, 5 - videos.length);
            const newVideos = newFiles.map(file => ({
                file,
                id: Math.random().toString(36).substr(2, 9),
                url: URL.createObjectURL(file),
                trimStart: 0,
                trimEnd: 0,
                duration: 0,
                text: ''
            }));
            const updated = [...videos, ...newVideos];
            setVideos(updated);
            if (selectedVidIndex === null && updated.length > 0) {
                setSelectedVidIndex(updated.length - 1);
            }
        }
    };

    const handleTrimChange = useCallback((index: number, start: number, end: number) => {
        setVideos(prev => {
            const next = [...prev];
            next[index] = { ...next[index], trimStart: start, trimEnd: end };
            return next;
        });
    }, []);

    const handleDurationChange = useCallback((index: number, duration: number) => {
        setVideos(prev => {
            const next = [...prev];
            next[index] = { ...next[index], duration };
            return next;
        });
    }, []);

    const removeVideo = (index: number) => {
        setVideos(prev => {
            const next = prev.filter((_, i) => i !== index);
            if (selectedVidIndex === index) setSelectedVidIndex(null);
            else if (selectedVidIndex !== null && selectedVidIndex > index) setSelectedVidIndex(selectedVidIndex - 1);
            return next;
        });
    };

    const handleTextChange = (index: number, text: string) => {
        setVideos(prev => {
            const next = [...prev];
            next[index] = { ...next[index], text };
            return next;
        });
    };

    const copyToClipboard = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleGenerate = async () => {
        if (videos.length === 0) return;
        setIsGenerating(true);
        try {
            const allFrames: string[][] = [];
            for (const video of videos) {
                const frames = await extractFramesFromVideo(video.file, 3);
                allFrames.push(frames);
            }

            const output = await generateOverlays(allFrames);
            setSeoData(output);

            setVideos(prev => prev.map((v, i) => ({
                ...v,
                text: output.textOverlays[i] || v.text || "AI Error"
            })));
        } catch (error) {
            console.error("Generation failed:", error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleExport = async () => {
        if (videos.length === 0) return;
        setIsExporting(true);

        try {
            // 1. Prepare video files data
            const videoFilesData = await Promise.all(videos.map(async (v) => {
                const base64 = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(v.file);
                    reader.onload = () => resolve(reader.result as string);
                });
                return {
                    name: v.file.name,
                    data: base64,
                    meta: {
                        trimStart: v.trimStart,
                        trimEnd: v.trimEnd || 10,
                        text: v.text
                    }
                };
            }));

            // 2. Prepare props
            const props = {
                title1,
                title2,
                title3,
                title4,
                listItems: finalItems,
            };

            // 3. Call local render API
            const response = await fetch('/api/render', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ props, videoFiles: videoFilesData })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }));
                throw new Error(errorData.details || errorData.error || 'Export failed');
            }

            const result = await response.json();

            // 4. Download final video
            if (result.success) {
                const link = document.createElement('a');
                link.href = result.url;
                link.download = 'viral-meme.mp4';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (error: any) {
            console.error("Export failed:", error);
            alert(`Export failed: ${error.message}\n\nCheck the terminal for more details.`);
        } finally {
            setIsExporting(false);
        }
    };

    const fps = 30;
    let currentFrameCount = 0;
    const videoTimings = videos.map(v => {
        const start = currentFrameCount;
        const duration = Math.max(0, Math.floor(((v.trimEnd || 0) - v.trimStart) * fps));
        currentFrameCount += duration;
        return { ...v, calculatedStart: start };
    });

    const finalItems = Array.from({ length: videoTimings.length }).map((_, i) => {
        const rank = i + 1;
        const v = videoTimings[videoTimings.length - 1 - i];
        const duration = Math.max(0, Math.floor(((v.trimEnd || 0) - v.trimStart) * fps));
        return { text: v.text || "Type here...", start: v.calculatedStart, rank, duration };
    });

    const totalDurationInFrames = Math.max(1, videos.reduce((acc, v) => {
        const dur = Math.max(0, Math.floor(((v.trimEnd || 10) - v.trimStart) * fps));
        return acc + dur;
    }, 0));

    return (
        <div className="flex h-screen bg-gray-950 text-white font-sans overflow-hidden">
            {/* Sidebar - LEFT */}
            <div className="w-96 flex-shrink-0 border-r border-gray-800 bg-gray-900 flex flex-col z-20">
                <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
                        Trending Rankings AI
                    </h1>
                </div>

                <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-700">
                    <div className="mb-6">
                        <label className="flex items-center gap-2 text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-widest">
                            <Type size={12} /> TITLE
                        </label>
                        <div className='grid grid-cols-3 gap-2 mb-2'>
                            <input
                                value={title1}
                                onChange={(e) => setTitle1(e.target.value)}
                                className="w-full bg-gray-800 border col-span-2 border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                                placeholder="Enter video title..."
                            />
                            <input
                                value={title2}
                                onChange={(e) => setTitle2(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-yellow-300 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                                placeholder="Enter video title..."
                            />
                        </div>
                        <div className='grid grid-cols-3 gap-2'>
                            <input
                                value={title3}
                                onChange={(e) => setTitle3(e.target.value)}
                                className="w-full bg-gray-800 border col-span-2 border-gray-700 rounded-lg px-3 py-2 text-sm text-[#FFCC99] focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                                placeholder="Enter video title..."
                            />
                            <input
                                value={title4}
                                onChange={(e) => setTitle4(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                                placeholder="Enter video title..."
                            />
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="flex items-center gap-2 text-[10px] font-bold text-gray-500 mb-3 uppercase tracking-widest">
                            <VideoIconWrapper /> SOURCE CLIPS
                        </label>

                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={videos.map(v => v.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="space-y-3">
                                    {videos.map((video, idx) => (
                                        <SortableVideoTrack
                                            key={video.id}
                                            video={video}
                                            index={idx}
                                            isSelected={selectedVidIndex === idx}
                                            onSelect={() => { setSelectedVidIndex(idx); setIsPlaying(false) }}
                                            onTextChange={(text: string) => handleTextChange(idx, text)}
                                            onTrimChange={handleTrimChange}
                                            onDurationChange={handleDurationChange}
                                            onRemove={() => removeVideo(idx)}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>

                        {videos.length < 5 && (
                            <label className="mt-4 flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-800 rounded-lg cursor-pointer hover:border-emerald-500/50 hover:bg-gray-800/30 transition-all group">
                                <Upload className="w-6 h-6 mb-2 text-gray-600 group-hover:text-emerald-500 transition-colors" />
                                <p className="text-[10px] font-bold text-gray-600 group-hover:text-gray-400 uppercase tracking-tighter">Add Clip</p>
                                <input type="file" className="hidden" multiple accept="video/*" onChange={handleFileUpload} />
                            </label>
                        )}
                    </div>

                    <div className="sticky bottom-0 bg-gray-900 pt-4 pb-2 border-t border-gray-800">
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating || videos.length === 0}
                            className={`w-full py-4 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-3 transition-all ${isGenerating || videos.length === 0
                                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:scale-[1.02] active:scale-95 text-white shadow-xl shadow-emerald-500/20'
                                }`}
                        >
                            <Sparkles size={18} />
                            {isGenerating ? 'ANALYZING...' : 'GENERATE AI DATA'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Editor Section - CENTER */}
            <div className={`flex-1 bg-gray-950 flex flex-col relative transition-all ${seoData ? 'mr-0' : ''}`}>
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_40%,_#064e3b15_0%,_transparent_70%)] pointer-events-none" />

                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    {selectedVidIndex === null ? (
                        <div className="flex flex-col items-center gap-12 w-full">
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-b from-emerald-500/20 to-transparent blur-2xl opacity-50" />
                                <div className="relative z-10 shadow-[0_0_80px_rgba(0,0,0,0.9)] rounded-3xl overflow-hidden border border-gray-800/50">
                                    <Player
                                        component={TrendingRankings}
                                        durationInFrames={totalDurationInFrames}
                                        fps={30}
                                        compositionWidth={1080}
                                        compositionHeight={1920}
                                        inputProps={{
                                            title1,
                                            title2,
                                            title3,
                                            title4,
                                            listItems: finalItems,
                                            videos: videos.map(v => ({
                                                url: v.url,
                                                trimStart: v.trimStart,
                                                trimEnd: v.trimEnd || 10
                                            }))
                                        }}
                                        style={{
                                            width: '38vh',
                                            height: '67.5vh',
                                        }}
                                        controls
                                    />
                                </div>
                                <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-2 text-[10px] font-bold text-gray-500 tracking-widest whitespace-nowrap">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    FINAL SEQUENCE PREVIEW
                                </div>
                            </div>

                            <button
                                onClick={handleExport}
                                disabled={isExporting || videos.length === 0}
                                className={`group relative py-4 px-12 rounded-2xl font-black text-sm flex items-center gap-3 transition-all ${isExporting || videos.length === 0
                                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                    : 'bg-white text-black hover:scale-105 active:scale-95 shadow-2xl'
                                    }`}
                            >
                                {isExporting ? (
                                    <div className="flex items-center gap-3">
                                        <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                        RENDERING...
                                    </div>
                                ) : (
                                    <>
                                        <Download size={20} className="group-hover:translate-y-0.5 transition-transform" />
                                        EXPORT HIGH-QUALITY VIDEO
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-8">
                            <div
                                className="relative z-10 shadow-2xl rounded-2xl overflow-hidden border border-gray-800 bg-black cursor-pointer group"
                                onClick={() => setIsPlaying(!isPlaying)}
                            >
                                <video
                                    ref={focusVideoRef}
                                    src={selectedVideo?.url}
                                    className="h-[60vh] object-contain"
                                    key={selectedVideo?.id}
                                    playsInline
                                />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                                    <div className="w-16 h-16 bg-emerald-500/80 rounded-full flex items-center justify-center text-black backdrop-blur-sm">
                                        {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                                    </div>
                                </div>
                                <div className="absolute top-4 left-4 bg-emerald-500 text-black px-3 py-1 rounded-full text-xs font-black shadow-lg">
                                    EDITING CLIP {(selectedVidIndex ?? 0) + 1}
                                </div>
                            </div>

                            <div className="w-full max-w-3xl bg-gray-900/80 backdrop-blur-xl p-8 rounded-3xl border border-gray-800 shadow-2xl">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-6">
                                        <button
                                            onClick={() => setIsPlaying(!isPlaying)}
                                            className="w-14 h-14 bg-emerald-500 hover:bg-emerald-400 text-black rounded-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/20"
                                        >
                                            {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                                        </button>
                                        <div className="space-y-1">
                                            <h2 className="text-xl font-bold flex items-center gap-2">Fine-Tune Cut</h2>
                                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Preview loops between start and end</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => {
                                                if (focusVideoRef.current && selectedVideo) {
                                                    focusVideoRef.current.currentTime = selectedVideo.trimStart;
                                                    setIsPlaying(true);
                                                }
                                            }}
                                            className="p-3 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-xl"
                                        >
                                            <RotateCcw size={20} />
                                        </button>
                                        <button
                                            onClick={() => setSelectedVidIndex(null)}
                                            className="bg-white hover:bg-gray-200 text-black px-8 py-3 rounded-xl text-sm font-black transition-all"
                                        >
                                            DONE
                                        </button>
                                    </div>
                                </div>

                                {selectedVideo && (
                                    <div className="px-4 py-2">
                                        <Slider
                                            range
                                            min={0}
                                            max={selectedVideo.duration || 100}
                                            step={0.001}
                                            value={[selectedVideo.trimStart, selectedVideo.trimEnd]}
                                            onChange={(val: number | number[]) => {
                                                const idx = selectedVidIndex;
                                                if (Array.isArray(val) && idx !== null) {
                                                    handleTrimChange(idx, val[0], val[1]);
                                                    if (focusVideoRef.current) {
                                                        if (val[0] !== selectedVideo.trimStart) {
                                                            focusVideoRef.current.currentTime = val[0];
                                                        }
                                                        setIsPlaying(true);
                                                    }
                                                }
                                            }}
                                            trackStyle={[{ height: 12, backgroundColor: '#10b981', borderRadius: 6 }]}
                                            handleStyle={[
                                                { width: 32, height: 32, marginTop: -10, backgroundColor: '#fff', border: '6px solid #059669', opacity: 1 },
                                                { width: 32, height: 32, marginTop: -10, backgroundColor: '#fff', border: '6px solid #059669', opacity: 1 }
                                            ]}
                                            railStyle={{ height: 12, backgroundColor: '#1f2937', borderRadius: 6 }}
                                        />
                                        <div className="grid grid-cols-3 mt-10 font-mono">
                                            <div className="flex flex-col gap-1 pl-2">
                                                <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">In Point</span>
                                                <span className="text-emerald-400 text-2xl font-black">{selectedVideo.trimStart.toFixed(3)}s</span>
                                            </div>
                                            <div className="flex flex-col items-center gap-1 border-x border-gray-800">
                                                <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Total</span>
                                                <span className="text-white text-2xl font-black">{(selectedVideo.trimEnd - selectedVideo.trimStart).toFixed(3)}s</span>
                                            </div>
                                            <div className="flex flex-col items-end gap-1 pr-2">
                                                <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Out Point</span>
                                                <span className="text-emerald-400 text-2xl font-black">{selectedVideo.trimEnd.toFixed(3)}s</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* SEO Panel - RIGHT */}
            {seoData && (
                <div className="w-80 flex-shrink-0 border-l border-gray-800 bg-gray-900 flex flex-col z-20 overflow-hidden animate-in slide-in-from-right duration-500">
                    <div className="p-6 border-b border-gray-800 flex items-center justify-between bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
                        <h2 className="text-sm font-black flex items-center gap-2 uppercase tracking-widest text-emerald-400">
                            <Sparkles size={16} /> SEO PACKAGE
                        </h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-8 scrollbar-thin scrollbar-thumb-gray-800">
                        {/* Title Copy */}
                        <div className="space-y-3 group">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                    <Search size={12} /> Viral Title
                                </label>
                                <button
                                    onClick={() => seoData && copyToClipboard(seoData.title, 'title')}
                                    className="p-1.5 hover:bg-emerald-500/10 text-gray-500 hover:text-emerald-400 rounded-md transition-all"
                                >
                                    {copiedField === 'title' ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                            </div>
                            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 text-sm font-medium leading-relaxed group-hover:border-emerald-500/30 transition-colors">
                                {seoData?.title}
                            </div>
                        </div>

                        {/* Description Copy */}
                        <div className="space-y-3 group">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                    <FileText size={12} /> Shorts Description
                                </label>
                                <button
                                    onClick={() => seoData && copyToClipboard(seoData.description, 'description')}
                                    className="p-1.5 hover:bg-emerald-500/10 text-gray-500 hover:text-emerald-400 rounded-md transition-all"
                                >
                                    {copiedField === 'description' ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                            </div>
                            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 text-xs font-medium leading-loose text-gray-300 group-hover:border-emerald-500/30 transition-colors max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 whitespace-pre-wrap">
                                {seoData?.description}
                            </div>
                        </div>

                        {/* Tags Copy */}
                        <div className="space-y-3 group">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                    <Hash size={12} /> Optimization Tags
                                </label>
                                <button
                                    onClick={() => seoData && copyToClipboard(Array.isArray(seoData.tags) ? seoData.tags.join(', ') : String(seoData.tags || ''), 'tags')}
                                    className="p-1.5 hover:bg-emerald-500/10 text-gray-500 hover:text-emerald-400 rounded-md transition-all"
                                >
                                    {copiedField === 'tags' ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                            </div>
                            <div className="bg-gray-950/50 border border-gray-800 rounded-xl p-4 group-hover:border-white/10 transition-colors">
                                <div className="flex flex-wrap gap-2">
                                    {seoData && Array.isArray(seoData.tags) ? seoData.tags.map((tag, i) => (
                                        <span key={i} className="text-[10px] bg-gray-800 text-gray-400 px-2 py-1 rounded-md border border-gray-700/50">
                                            #{tag.replace(/\s+/g, '')}
                                        </span>
                                    )) : (
                                        <span className="text-[10px] text-gray-500 italic">No tags generated</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex gap-3 items-start">
                            <Info size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                            <p className="text-[9px] leading-relaxed text-emerald-500/70 font-medium uppercase tracking-wider">
                                Click the copy icon to quickly grab your metadata for YouTube Studio or TikTok.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
