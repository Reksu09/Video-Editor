import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

export default defineConfig({
    plugins: [
        react(),
        {
            name: 'remotion-render-api',
            configureServer(server) {
                server.middlewares.use(async (req, res, next) => {
                    if (req.url === '/api/render' && req.method === 'POST') {
                        let body = '';
                        req.on('data', chunk => { body += chunk; });
                        req.on('end', async () => {
                            try {
                                const data = JSON.parse(body);
                                const { props, videoFiles } = data;

                                // 1. Setup directories
                                const publicDir = path.resolve(__dirname, 'public');
                                const exportsDir = path.resolve(publicDir, 'exports');
                                const sourceDir = path.resolve(exportsDir, 'source');
                                if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir, { recursive: true });
                                if (!fs.existsSync(sourceDir)) fs.mkdirSync(sourceDir, { recursive: true });

                                // 2. Save video files
                                const updatedVideos = [];
                                for (const v of videoFiles) {
                                    const fileName = `${Date.now()}-${v.name}`;
                                    const filePath = path.resolve(sourceDir, fileName);
                                    // Remove data:video/mp4;base64, prefix
                                    const base64Data = v.data.split(',')[1];
                                    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

                                    // Attempt to reduce resolution using ffmpeg (max width 720px, preserve aspect ratio).
                                    // If ffmpeg isn't available or fails, keep the original file.
                                    const resizedPath = `${filePath}.resized.mp4`;
                                    const ffmpegCmd = `ffmpeg -y -fflags +genpts -i "${filePath}" -vf "scale='if(gt(iw,720),720,iw)':'-2'" -r 60 -c:v libx264 -crf 18 -preset fast -g 60 -keyint_min 60 -b:v 2500k -pix_fmt yuv420p -movflags +faststart -c:a copy "${resizedPath}"`;
                                    try {
                                        console.log('Running ffmpeg:', ffmpegCmd);
                                        await new Promise((resolve, reject) => {
                                            exec(ffmpegCmd, (error, stdout, stderr) => {
                                                if (error) {
                                                    console.warn('ffmpeg error:', stderr || error);
                                                    return reject(stderr || error);
                                                }
                                                try {
                                                    fs.renameSync(resizedPath, filePath);
                                                } catch (renameErr) {
                                                    try {
                                                        fs.copyFileSync(resizedPath, filePath);
                                                        fs.unlinkSync(resizedPath);
                                                    } catch (copyErr) {
                                                        console.warn('Rename/copy failed, keeping original file:', copyErr);
                                                    }
                                                }
                                                resolve(null);
                                            });
                                        });
                                    } catch (e) {
                                        console.warn('FFmpeg resize failed or not available, keeping original video:', e);
                                    }

                                    updatedVideos.push({
                                        ...v.meta,
                                        url: `/exports/source/${fileName}` // Relative URL for browser preview
                                    });
                                }

                                // 3. Prepare props
                                const finalProps = { ...props, videos: updatedVideos };
                                const propsPath = path.resolve(exportsDir, 'input-props.json');
                                fs.writeFileSync(propsPath, JSON.stringify(finalProps, null, 2));

                                // 4. Run Render
                                const outPath = path.resolve(publicDir, 'output.mp4');
                                const command = `npx remotion render src/index.ts TrendingRankings "${outPath}" --props "${propsPath}" --fps 60 --codec h264 --force`;

                                console.log('Executing:', command);
                                exec(command, (error, stdout, stderr) => {
                                    if (error) {
                                        console.error('Render Error:', stderr);
                                        res.statusCode = 500;
                                        res.end(JSON.stringify({ error: stderr }));
                                        return;
                                    }
                                    console.log('Render Success:', stdout);
                                    // Clean up exports/source after successful render
                                    try {
                                        const files = fs.readdirSync(sourceDir);
                                        for (const file of files) {
                                            fs.unlinkSync(path.join(sourceDir, file));
                                        }
                                        console.log('Cleaned up exports/source/');
                                    } catch (cleanupErr) {
                                        console.warn('Failed to cleanup exports/source:', cleanupErr);
                                    }
                                    res.end(JSON.stringify({ success: true, url: '/output.mp4' }));
                                });
                            } catch (err) {
                                res.statusCode = 500;
                                res.end(JSON.stringify({ error: String(err) }));
                            }
                        });
                        return;
                    }
                    next();
                });
            }
        }
    ],
    server: {
        allowedHosts: true
    }
});
