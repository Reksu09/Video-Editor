import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';

const COLORS = [
    '#FFFF00', // 1. Yellow
    '#00FF00', // 2. Green
    '#FFA500', // 3. Orange
    '#808080', // 4. Grey
    '#FFFFFF', // 5. White
];

interface ListItemProps {
    index: number;
    text: string;
    startFrame: number;
    displayRank?: number;
    duration?: number;
}

export const ListItem: React.FC<ListItemProps> = ({ index, text, startFrame, displayRank, duration = 90 }) => {
    const frame = useCurrentFrame();
    const rankToDisplay = displayRank !== undefined ? displayRank : index + 1;

    // Typing animation
    const typingDuration = 30;
    const progress = interpolate(frame - startFrame, [0, typingDuration], [0, 1], {
        extrapolateRight: 'clamp',
        extrapolateLeft: 'clamp',
    });

    // Use Array.from to correctly handle emojis (surrogate pairs)
    const textChars = Array.from(text);
    const charsToShow = Math.floor(progress * textChars.length);
    const visibleText = textChars.slice(0, charsToShow).join('');

    // Cursor logic: show cursor while typing or if just finished and still active
    const isTyping = frame >= startFrame && frame < startFrame + typingDuration;
    const cursor = isTyping ? '|' : '';

    // "only change the current text to white when the clip ends"
    // The clip for THIS specific item starts at startFrame and lasts for 'duration'.
    const isActive = (frame >= startFrame) && (frame < startFrame + duration);
    const textColor = isActive ? '#FFCC99' : '#FFFFFF';
    // Number styling
    const numberColor = COLORS[index % COLORS.length];
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: 45,
            fontWeight: 900,
            fontFamily: 'Inter',
            color: 'white',
            marginBottom: 30,
        }}>
            <span style={{
                color: numberColor,
                marginRight: 10,
                fontSize: 70,
                // WebkitTextStroke: '4px black' // Outline for number too?
                textShadow: '8px 8px 10px rgba(0,0,0,1)',
            }}>
                {rankToDisplay}.
            </span>
            <span style={{
                color: textColor,
                // textShadow: '2px 2px 4px rgba(0,0,0,0.5)', // Removed standard shadow in favor of stroke?
                // "add outline on the letters except the emojis"
                // CSS text-stroke adds outline.
                WebkitTextStroke: '5px black',
                paintOrder: 'stroke fill'
            }}>
                {visibleText}
                <span style={{
                    color: 'lightgray',
                    // textShadow: '2px 2px 4px rgba(0,0,0,0.5)', // Removed standard shadow in favor of stroke?
                    // "add outline on the letters except the emojis"
                    // CSS text-stroke adds outline.
                    WebkitTextStroke: '0px black',
                    fontWeight: 200,
                    paintOrder: 'stroke fill'
                }}>{cursor}</span>
            </span>
        </div>
    );
};
