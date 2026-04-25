
import { Fetcher, TmdbId } from './src/utils';
import { FourKHDHub } from './src/source/FourKHDHub';
import axios from 'axios';
import winston from 'winston';

async function test() {
  const fetcher = new Fetcher(axios, winston.createLogger());
  const source = new FourKHDHub(fetcher);
  
  const ctx = {
    config: { 'hi': 'true', 'multi': 'true' },
    ip: '127.0.0.1',
    useragent: 'test'
  } as any;

  // Mocking the TMDB access token if needed, or just hardcoding the name/year
  // But wait, the source uses getTmdbNameAndYear which needs it.
  
  // I'll try to use a real ID if possible.
  
  try {
    const results = await source.handleInternal(ctx, 'movie' as any, new TmdbId(475557, undefined, undefined)); // Joker (2019)
    console.log('Results count:', results.length);
    results.forEach((r, i) => {
        console.log(`Result ${i}: ${r.meta.title} - ${r.url.href}`);
    });
  } catch(e) {
    console.error('Err:', e);
  }
}
test();
