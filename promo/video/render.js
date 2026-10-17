// Renders index.html to MP4, one screenshot per frame, piped into ffmpeg.
//
//   node render.js --format 16x9 --cut upwork --out ../out/meo-upwork-intro-16x9.mp4 --audio ../out/music-60.wav
//   node render.js --format 9x16 --hook b --out ../out/meo-ad-b-9x16.mp4 --audio ../out/music-30.wav
//   node render.js --format 9x16 --stills 0,5,12 --out ../out/stills    (PNG frames for checking layout)
//   node render.js --page motion.html --format 16x9 --cta upwork --fps 60 --audio ../out/motion-bed.m4a --out ../out/meo-motion-intro-16x9.mp4
//   node render.js --page motion.html --cues-out ../out/motion-cues.json    (sound cues for music.py)
//
// Needs Node 18+, Playwright with Chromium (npm i playwright && npx playwright install chromium) and ffmpeg.

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { ({ chromium } = require(path.join(require('child_process').execSync('npm root -g').toString().trim(), 'playwright'))); }

const args = {};
for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const format = args.format || '16x9';
const fps = parseInt(args.fps || '30', 10);
const SIZES = { '16x9': [1920, 1080], '9x16': [1080, 1920], '4x5': [1080, 1350] };
const [W, H] = SIZES[format];

const query = new URLSearchParams({ format, grain: args.stills ? '1' : '0' });
for (const k of ['cut', 'hook', 'cta']) if (args[k]) query.set(k, args[k]);
const pageFile = args.page || 'index.html';
const url = 'file://' + path.join(__dirname, pageFile) + '?' + query;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.goto(url);
  await page.evaluate(() => window.ready);
  const duration = await page.evaluate(() => window.DURATION);
  const stage = await page.$('#stage');

  if (args['cues-out']) {
    const cues = await page.evaluate(() => window.CUES || []);
    fs.writeFileSync(args['cues-out'], JSON.stringify({ duration, cues }, null, 1));
    console.log(`${args['cues-out']}: ${cues.length} cues`);
    if (!args.out) { await browser.close(); return; }
  }

  if (args.stills) {
    fs.mkdirSync(args.out, { recursive: true });
    for (const t of args.stills.split(',').map(Number)) {
      await page.evaluate((t) => window.render(t), t);
      const file = path.join(args.out, `${path.basename(pageFile, '.html')}-${format}-${args.cut || args.cta || ''}${args.hook || ''}-${t}.png`);
      await stage.screenshot({ path: file });
      console.log(file);
    }
    await browser.close();
    return;
  }

  // Static film grain, blended in ffmpeg: it keeps the dark gradients from banding once encoded
  const grain = path.join(require('os').tmpdir(), `meo-grain-${W}x${H}-${process.pid}.raw`);
  let seed = 7;
  const noise = Buffer.alloc(W * H);
  for (let i = 0; i < noise.length; i++) { seed = (seed * 16807) % 2147483647; noise[i] = seed % 256; }
  fs.writeFileSync(grain, noise);

  const frames = Math.round(duration * fps);
  const ff = [
    '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-f', 'rawvideo', '-pix_fmt', 'gray', '-s', `${W}x${H}`, '-stream_loop', '-1', '-i', grain,
  ];
  if (args.audio) ff.push('-i', args.audio);
  ff.push(
    '-filter_complex',
    '[0:v]format=gbrp[a];[1:v]format=gbrp[g];[a][g]blend=all_mode=overlay:all_opacity=0.06:shortest=1,' +
      'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p[v]',
    '-map', '[v]',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', args.crf || '18', '-tune', 'animation',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-r', String(fps), '-movflags', '+faststart'
  );
  if (args.audio) ff.push('-map', '2:a', '-c:a', 'aac', '-b:a', '192k', '-shortest');
  ff.push(args.out);
  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  const enc = spawn('ffmpeg', ff, { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => enc.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg exited ' + c)))));

  // Raw CDP capture with optimizeForSpeed: still lossless PNG, about ten times faster than page.screenshot
  const cdp = await page.context().newCDPSession(page);
  const started = Date.now();
  for (let f = 0; f < frames; f++) {
    await page.evaluate((t) => window.render(t), f / fps);
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true });
    const buf = Buffer.from(shot.data, 'base64');
    if (!enc.stdin.write(buf)) await new Promise((r) => enc.stdin.once('drain', r));
    if (f % (fps * 5) === 0) process.stdout.write(`\r${args.out}: ${f}/${frames} frames, ${((Date.now() - started) / 1000).toFixed(0)}s`);
  }
  enc.stdin.end();
  await done;
  await browser.close();
  fs.rmSync(grain, { force: true });
  console.log(`\r${args.out}: ${frames} frames in ${((Date.now() - started) / 1000).toFixed(0)}s`);
})().catch((e) => { console.error(e); process.exit(1); });
