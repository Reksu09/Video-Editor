import "./index.css";
import { Composition } from "remotion";
import { TrendingRankings } from './compositions/TrendingRankings';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="TrendingRankings"
        component={TrendingRankings}
        durationInFrames={600} // Default if metadata fails
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={async ({ props }) => {
          const fps = 30;
          const videos = (props as any).videos || [];
          const duration = videos.reduce((acc: number, v: any) => {
            const dur = Math.max(0, Math.floor(((v.trimEnd || 0) - v.trimStart) * fps));
            return acc + dur;
          }, 0);

          return {
            durationInFrames: Math.max(1, duration),
            props,
          };
        }}
        defaultProps={{
          title: "Ranking The Best",
          videos: [],
          listItems: [
            { text: 'Waiting for content...', start: 0 },
          ]
        }}
      />
    </>
  );
};
