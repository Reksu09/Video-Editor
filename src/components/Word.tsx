import { spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const Word = ({ text }: { text: string }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const scale = spring({
        frame,
        fps,
        from: 0.5,
        to: 1,
        config: { damping: 200 },
    });

    return (
        <div
            style={{
                color: 'white',
                fontSize: 120,
                fontWeight: 'bold',
                textAlign: 'center',
                transform: `scale(${scale})`,
            }}
        >
            {text}
        </div>
    );
};
