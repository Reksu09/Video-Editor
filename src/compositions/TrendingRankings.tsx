import React from 'react';
import { AbsoluteFill, Sequence, Video, staticFile } from 'remotion';
import { Title } from '../components/Title';
import { ListItem } from '../components/ListItem';

export interface TrendingRankingsProps {
    readonly title1?: string;
    readonly title2?: string;
    readonly title3?: string;
    readonly title4?: string;
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

export const TrendingRankings: React.FC<TrendingRankingsProps> = ({
    title1,
    title2,
    title3,
    title4,
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

    return (
        <AbsoluteFill style={{ backgroundColor: 'black' }}>
            {/* Render Videos Background Sequentially */}
            {videos && videos.length > 0 ? (
                <AbsoluteFill>
                    {(() => {
                        let innerCurrentFrame = 0;
                        return videos.map((v, i) => {
                            const fps = 30;
                            // Trims are in seconds, convert to frames
                            const startFrame = Math.floor(v.trimStart * fps);
                            const rawEndFrame = Math.floor((v.trimEnd || 10) * fps);
                            // Safety: ensure endFrame is at least 1 frame after start
                            const endFrame = Math.max(startFrame + 1, rawEndFrame);
                            const durationInFrames = endFrame - startFrame;

                            const seqStart = innerCurrentFrame;
                            innerCurrentFrame += durationInFrames;

                            // Final URL check
                            let videoSrc = v.url;
                            if (videoSrc && !videoSrc.startsWith('blob:') && !videoSrc.startsWith('http')) {
                                videoSrc = staticFile(videoSrc);
                            }

                            return (
                                <Sequence key={i} from={seqStart} durationInFrames={durationInFrames}>
                                    <AbsoluteFill style={{
                                        height: '75%',
                                        top: '12.5%',
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
                                </Sequence>
                            );
                        });
                    })()}
                </AbsoluteFill>
            ) : null}

            <div style={{ position: 'absolute', top: 0, width: '100%', zIndex: 10 }}>
                <Title title1={title1} title2={title2} title3={title3} title4={title4} />
            </div>
            <AbsoluteFill style={{ top: 420, paddingLeft: 10 }}>
                {items.map((item, i) => (
                    <ListItem key={i} index={i} text={item.text} startFrame={item.start} displayRank={item.rank} duration={item.duration} />
                ))}
            </AbsoluteFill>
        </AbsoluteFill>
    );
};
