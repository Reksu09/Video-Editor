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
                                const command = `npx remotion render src/index.ts TrendingRankings "${outPath}" --props "${propsPath}" --force`;

                                console.log('Executing:', command);
                                exec(command, (error, stdout, stderr) => {
                                    if (error) {
                                        console.error('Render Error:', stderr);
                                        res.statusCode = 500;
                                        res.end(JSON.stringify({ error: stderr }));
                                        return;
                                    }
                                    console.log('Render Success:', stdout);
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
