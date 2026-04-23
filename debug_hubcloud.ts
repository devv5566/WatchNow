import winston from 'winston';
import axios from 'axios';
import { Fetcher } from './src/utils/Fetcher';
import { Context } from './src/types';

const logger = winston.createLogger({
  transports: [new winston.transports.Console()],
});

const fetcher = new Fetcher(axios.create(), logger);
// Set a real browser User-Agent
(fetcher as any).hostUserAgentMap.set('hubcloud.foo', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
(fetcher as any).hostUserAgentMap.set('gdflix.dev', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
(fetcher as any).hostUserAgentMap.set('archive.toonworld4all.me', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

const ctx: Context = { config: {}, hostUrl: 'http://localhost:7000/', id: 'test' } as any;

async function debug() {
    try {
        // 1. Fetch episode page
        const episodeUrl = new URL('https://archive.toonworld4all.me/episode/jujutsu-kaisen-3x1');
        const episodeHtml = await fetcher.text(ctx, episodeUrl);
        console.log('--- Fetched Episode Page ---');

        // 2. Extract first HubDrive redirect link from __PROPS__
        const propsMatch = episodeHtml.match(/window\.__PROPS__\s*=\s*(\{[\s\S]*?\});/);
        if (!propsMatch) throw new Error('No props match');
        const props = JSON.parse(propsMatch[1] as string);
        const firstHubDrive = props.data.data.encodes[0].files.find((f: any) => /hubdrive/i.test(f.host));
        if (!firstHubDrive) {
            console.log('No HubDrive link found, trying first available...');
        }
        const redirectUrl = new URL(firstHubDrive?.link || props.data.data.encodes[0].files[0].link, 'https://archive.toonworld4all.me');
        console.log('--- Redirect URL:', redirectUrl.href);

        // 3. Fetch redirect page
        const redirectHtml = await fetcher.text(ctx, redirectUrl, {
            headers: { Referer: episodeUrl.href }
        });
        console.log('--- Fetched Redirect Page ---');

        // 4. Extract HubCloud URL from __PROPS__
        const propsMatch2 = redirectHtml.match(/window\.__PROPS__\s*=\s*(\{[\s\S]*?\});/);
        if (!propsMatch2) throw new Error('No props match on redirect page');
        const props2 = JSON.parse(propsMatch2[1] as string);
        const hubcloudUrlStr = `${props2.link.domain}${props2.link.hidden}`;
        const hubcloudUrl = new URL(hubcloudUrlStr);
        console.log('--- HubCloud URL from __PROPS__:', hubcloudUrl.href);

        const paths = ['file', 'video', 'drive'];
        const id = hubcloudUrl.pathname.split('/').pop();

        for (const path of paths) {
            try {
                const testUrl = new URL(`https://${hubcloudUrl.hostname}/${path}/${id}`);
                console.log(`\n--- Testing Path: ${testUrl.href} ---`);
                const res = await fetcher.fetch(ctx, testUrl, {
                    headers: { Referer: redirectUrl.href }
                });
                console.log('Status:', res.status);
                console.log('Body (first 5000 chars):', res.data.substring(0, 5000));

                const propsMatch3 = res.data.match(/window\.__PROPS__\s*=\s*(\{[\s\S]*?\});/);
                if (propsMatch3) {
                    console.log('--- Found __PROPS__! ---');
                }
                
                if (res.data.includes('404 ! File Not Found')) {
                    console.log('--- Body says 404 File Not Found ---');
                }

                // Look for common hoster links
                const fslMatch = res.data.match(/https?:\/\/[^"']+\?(?:token|expires)=[^"']+/i);
                if (fslMatch) {
                    console.log('--- Found potential FSL/Stream link:', fslMatch[0]);
                }

                const hubCloudMatch = res.data.match(/https?:\/\/hubcloud[^"']+/i);
                if (hubCloudMatch) {
                    console.log('--- Found HubCloud link:', hubCloudMatch[0]);
                }
            } catch (e) {
                console.log(`--- Path failed: ${path} ---`);
            }
        }

    } catch (e) {
        console.error('Debug failed:', e);
    }
}

debug();
