import React, { useMemo } from 'react';
import { AbsoluteFill, Audio, Video, staticFile, Sequence } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { flip } from '@remotion/transitions/flip';
import { Title } from '../components/Title';
import { ListItem } from '../components/ListItem';

import transition1 from '../sfx/Transition 1.mp3';
import transition2 from '../sfx/Transition 2.mp3';
import transition3 from '../sfx/Transition 3.mp3';
import transition4 from '../sfx/Transition 4.mp3';
import transition5 from '../sfx/Transition 5.mp3';

export interface TrendingRankingsProps {
    readonly title1?: string;
    readonly color1?: string;
    readonly title2?: string;
    readonly color2?: string;
    readonly title3?: string;
    readonly color3?: string;
    readonly title4?: string;
    readonly color4?: string;
    readonly title5?: string;
    readonly color5?: string;
    readonly listItems?: {
        text: string;
        start: number;
        duration?: number;
        rank?: number;
    }[];
    readonly videos?: {
        url: string;
        trimStart: number;
        trimEnd: number;
    }[];
}

const transitionComponents = [slide, wipe, flip];
const transitionSfxAssets = [
    transition1,
    transition2,
    transition3,
    transition4,
    transition5,
];

export const TrendingRankings: React.FC<TrendingRankingsProps> = ({
    title1,
    color1,
    title2,
    color2,
    title3,
    color3,
    title4,
    color4,
    title5,
    color5,
    listItems,
    videos,
}) => {
    // Fallback for listItems
    const items = listItems || [
        { text: 'Waiting for AI...', start: 10 },
        { text: 'Waiting for AI...', start: 130 },
        { text: 'Waiting for AI...', start: 250 },
        { text: 'Waiting for AI...', start: 370 },
        { text: 'Waiting for AI...', start: 490 },
    ];

    const transitionFrames = 5;

    const { transitions } = useMemo(() => {
        if (!videos || videos.length === 0) return { transitions: [], totalDuration: 1 };

        const mappedTransitions = videos.slice(0, -1).map((_, i) => {
            const comp = transitionComponents[i % transitionComponents.length];
            return {
                presentation: comp(),
                sfx: transitionSfxAssets[i % transitionSfxAssets.length],
            };
        });

        const fps = 30;
        let duration = 0;
        videos.forEach((v, i) => {
            const startFrame = Math.floor(v.trimStart * fps);
            const rawEndFrame = Math.floor((v.trimEnd || 10) * fps);
            const endFrame = Math.max(startFrame + 1, rawEndFrame);
            const videoDuration = endFrame - startFrame;

            duration += videoDuration;
            if (i < videos.length - 1) {
                duration -= transitionFrames;
            }
        });

        return { transitions: mappedTransitions, totalDuration: Math.max(1, duration) };
    }, [videos, transitionFrames]);

    return (
        <AbsoluteFill style={{ backgroundColor: 'black' }}>
            {/* Render Videos Background Sequentially with Transitions */}
            {videos && videos.length > 0 ? (
                <AbsoluteFill>
                    <TransitionSeries>
                        {videos.map((v, i) => {
                            const fps = 30;
                            const startFrame = Math.floor(v.trimStart * fps);
                            const rawEndFrame = Math.floor((v.trimEnd || 10) * fps);
                            const endFrame = Math.max(startFrame + 1, rawEndFrame);
                            const durationInFrames = endFrame - startFrame;

                            let videoSrc = v.url;
                            if (videoSrc && !videoSrc.startsWith('blob:') && !videoSrc.startsWith('http')) {
                                videoSrc = staticFile(videoSrc);
                            }

                            const transition = transitions[i];

                            return (
                                <React.Fragment key={i}>
                                    <TransitionSeries.Sequence durationInFrames={durationInFrames}>
                                        <AbsoluteFill style={{
                                            height: '75%',
                                            top: title5 ? '14.5%' : '12.5%',
                                            overflow: 'hidden',
                                            backgroundColor: '#000'
                                        }}>
                                            <Video
                                                src={videoSrc}
                                                startFrom={startFrame}
                                                endAt={endFrame}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                volume={1}
                                            />
                                        </AbsoluteFill>
                                    </TransitionSeries.Sequence>
                                    {transition && (
                                        <TransitionSeries.Transition
                                            presentation={transition.presentation as any}
                                            timing={linearTiming({ durationInFrames: transitionFrames })}
                                        />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </TransitionSeries>
                    {/* Render Transition SFX */}
                    {(() => {
                        let currentOffset = 0;
                        const fps = 30;
                        return videos.map((v, i) => {
                            const startFrame = Math.floor(v.trimStart * fps);
                            const rawEndFrame = Math.floor((v.trimEnd || 10) * fps);
                            const endFrame = Math.max(startFrame + 1, rawEndFrame);
                            const durationInFrames = endFrame - startFrame;

                            const transition = transitions[i];
                            const sfxStart = currentOffset + durationInFrames - transitionFrames;

                            currentOffset += durationInFrames - (transition ? transitionFrames : 0);

                            if (!transition) return null;

                            return (
                                <Sequence
                                    key={`sfx-${i}`}
                                    from={sfxStart}
                                    durationInFrames={60}
                                >
                                    <Audio
                                        src={transition.sfx}
                                        startFrom={0}
                                        volume={0.25}
                                    />
                                </Sequence>
                            );
                        });
                    })()}
                </AbsoluteFill>
            ) : null}

            <div style={{ position: 'absolute', top: 0, width: '100%', zIndex: 10 }}>
                <Title
                    title1={title1} color1={color1}
                    title2={title2} color2={color2}
                    title3={title3} color3={color3}
                    title4={title4} color4={color4}
                    title5={title5} color5={color5}
                />
            </div>
            <AbsoluteFill style={{ top: title5 ? 460 : 420, paddingLeft: 10 }}>
                {items.map((item, i) => (
                    <ListItem key={i} index={i} text={item.text} startFrame={item.start} displayRank={item.rank} duration={item.duration} />
                ))}
            </AbsoluteFill>
        </AbsoluteFill>
    );
};
