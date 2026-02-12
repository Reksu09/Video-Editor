import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

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

                                console.log(`[Render API] Received payload: ${(body.length / (1024 * 1024)).toFixed(2)} MB`);
                                console.log(`[Render API] Starting render for ${videoFiles.length} videos...`);

                                // 1. Setup directories
                                const publicDir = path.resolve(__dirname, 'public');
                                const exportsDir = path.resolve(publicDir, 'exports');
                                const sourceDir = path.resolve(exportsDir, 'source');
                                if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir, { recursive: true });
                                if (!fs.existsSync(sourceDir)) fs.mkdirSync(sourceDir, { recursive: true });

                                // 2. Save video files
                                const updatedVideos = [];
                                for (const v of videoFiles) {
                                    const fileName = `${Date.now()}-${v.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                                    const filePath = path.resolve(sourceDir, fileName);

                                    // Remove data:video/mp4;base64, prefix if present
                                    const base64Data = v.data.includes(',') ? v.data.split(',')[1] : v.data;
                                    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

                                    updatedVideos.push({
                                        ...v.meta,
                                        url: `/exports/source/${fileName}`
                                    });
                                }

                                // 3. Prepare props
                                const finalProps = { ...props, videos: updatedVideos };
                                const propsPath = path.resolve(exportsDir, 'input-props.json');
                                fs.writeFileSync(propsPath, JSON.stringify(finalProps, null, 2));

                                // 4. Run Render using spawn for better stability
                                const outPath = path.resolve(publicDir, 'output.mp4');

                                // Try to find the remotion binary in various locations
                                const possibleBins = [
                                    path.resolve(__dirname, 'node_modules', '.bin', 'remotion.cmd'),
                                    path.resolve(__dirname, 'node_modules', '.bin', 'remotion'),
                                    'npx remotion'
                                ];

                                let remotionBin = 'npx remotion';
                                for (const bin of possibleBins) {
                                    if (bin.includes('node_modules') && fs.existsSync(bin)) {
                                        remotionBin = bin;
                                        break;
                                    }
                                }
                                const args = [
                                    'render',
                                    'src/index.ts',
                                    'TrendingRankings',
                                    outPath,
                                    '--props', propsPath,
                                    '--force',
                                    '--concurrency', '8' // Limit concurrency to prevent crashes on high-end CPUs
                                ];

                                console.log('[Render API] Executing:', remotionBin, args.join(' '));

                                const renderProcess = spawn(remotionBin, args, { shell: true });

                                let stdout = '';
                                let stderr = '';

                                renderProcess.stdout.on('data', (data) => {
                                    stdout += data;
                                    process.stdout.write(data); // Echo to main console
                                });

                                renderProcess.stderr.on('data', (data) => {
                                    stderr += data;
                                    process.stderr.write(data);
                                });

                                renderProcess.on('close', (code) => {
                                    if (code !== 0) {
                                        console.error(`[Render API] Process exited with code ${code}`);
                                        res.statusCode = 500;
                                        res.end(JSON.stringify({
                                            error: 'Rendering failed',
                                            details: stderr || stdout || 'Unknown error during render'
                                        }));
                                    } else {
                                        console.log('[Render API] Render completed successfully');
                                        res.end(JSON.stringify({ success: true, url: '/output.mp4' }));
                                    }
                                });

                            } catch (err) {
                                console.error('[Render API] Fatal Error:', err);
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
