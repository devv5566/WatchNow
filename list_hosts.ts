import winston from 'winston';
import axios from 'axios';
import { Fetcher } from './src/utils/Fetcher';
import { Context } from './src/types';

const logger = winston.createLogger({
  transports: [new winston.transports.Console()],
});

const fetcher = new Fetcher(axios.create(), logger);
const ctx: Context = { config: {}, hostUrl: 'http://localhost:7000/', id: 'test' } as any;

async function checkHosts() {
    try {
        const url = new URL('https://archive.toonworld4all.me/episode/fullmetal-alchemist-brotherhood-1x1');
        const html = await fetcher.text(ctx, url);
        const propsMatch = html.match(/window\.__PROPS__\s*=\s*(\{[\s\S]*?\});/);
        if (!propsMatch) throw new Error('No props match');
        const props = JSON.parse(propsMatch[1] as string);
        
        console.log('--- Hosts for Fullmetal Alchemist 1x1 ---');
        props.data.data.encodes.forEach((encode: any) => {
            console.log(`\nResolution: ${encode.resolution}`);
            encode.files.forEach((file: any) => {
                console.log(`- ${file.host}: ${file.link}`);
            });
        });
    } catch (e) {
        console.error('Failed:', e);
    }
}

checkHosts();
