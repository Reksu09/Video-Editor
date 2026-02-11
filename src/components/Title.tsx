import React from 'react';

export interface TitleProps {
    readonly title1?: string;
    readonly title2?: string;
    readonly title3?: string;
    readonly title4?: string;
}

export const Title: React.FC<TitleProps> = ({ title1, title2, title3, title4 }) => {

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            paddingTop: 20,
            fontFamily: 'Inter',
            fontWeight: 900,
            gap: 10,
        }}>
            <div style={{
                fontSize: 70,
                fontWeight: '900',
                color: 'white',
                textTransform: 'capitalize', // Assuming standard title casing
                display: 'flex',
                gap: 10,
            }}>
                {title1}
                <span style={{ color: '#F6D555' }}>{title2}</span>
            </div>

            <div style={{
                fontSize: 70,
                fontWeight: '900',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
            }}>
                <span style={{ color: '#FFCC99' }}>{title3}</span>
                <span style={{ color: 'white' }}>
                    {title4}
                </span>
            </div>
        </div>
    );
};
