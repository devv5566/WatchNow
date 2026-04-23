import winston from 'winston';
import axios from 'axios';
import { Fetcher } from './src/utils/Fetcher';
import { Context } from './src/types';
import * as cheerio from 'cheerio';

const logger = winston.createLogger({
  transports: [new winston.transports.Console()],
});

const fetcher = new Fetcher(axios.create(), logger);
const ctx: Context = { config: {}, hostUrl: 'http://localhost:7000/', id: 'test' } as any;

async function list() {
    try {
        const html = await fetcher.text(ctx, new URL('https://toonworld4all.me/'));
        const $ = cheerio.load(html);
        console.log('--- Recent Posts ---');
        $('h2.entry-title a').each((_i, el) => {
            console.log($(el).text().trim(), '->', $(el).attr('href'));
        });
    } catch (e) {
        console.error('Failed to fetch home page:', e);
    }
}

list();
