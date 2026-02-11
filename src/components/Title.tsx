import React from 'react';

export interface TitleProps {
    readonly title1?: string;
    color1?: string;
    readonly title2?: string;
    color2?: string;
    readonly title3?: string;
    color3?: string;
    readonly title4?: string;
    color4?: string;
    readonly title5?: string;
    color5?: string;
}

export const Title: React.FC<TitleProps> = ({
    title1, color1 = 'white',
    title2, color2 = '#F6D555',
    title3, color3 = '#FFCC99',
    title4, color4 = 'white',
    title5, color5 = '#00de3b'
}) => {

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            paddingTop: 40,
            fontFamily: 'Inter',
            fontWeight: 900,
            gap: 10,
        }}>
            <div style={{
                fontSize: 70,
                fontWeight: '900',
                color: color1,
                textTransform: 'capitalize',
                display: 'flex',
                gap: 10,
            }}>
                {title1}
                <span style={{ color: color2 }}>{title2}</span>
            </div>

            <div style={{
                fontSize: 70,
                fontWeight: '900',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginTop: -40,
            }}>
                <span style={{ color: color3 }}>{title3}</span>
                <span style={{ color: color4 }}>
                    {title4}
                </span>
            </div>
            <div style={{
                fontSize: 50,
                fontWeight: '900',
                color: color5,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginTop: -40,
            }}>
                {title5}
            </div>
        </div>
    );
};
