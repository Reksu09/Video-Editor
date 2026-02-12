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
        fps={60}
        width={1080}
        height={1920}
        calculateMetadata={async ({ props }) => {
          const fps = 60;
          const transitionFrames = 5;
          const videos = (props as any).videos || [];

          let duration = 0;
          videos.forEach((v: any, i: number) => {
            const startFrame = Math.floor(v.trimStart * fps);
            const rawEndFrame = Math.floor((v.trimEnd || 10) * fps);
            const endFrame = Math.max(startFrame + 1, rawEndFrame);
            const videoDuration = endFrame - startFrame;

            duration += videoDuration;
            if (i < videos.length - 1) {
              duration -= transitionFrames;
            }
          });

          return {
            durationInFrames: Math.max(1, Math.floor(duration)),
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
