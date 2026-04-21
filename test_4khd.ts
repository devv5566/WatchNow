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

  try {
    const results = await source.handleInternal(ctx, 'movie', new TmdbId(533535));
    console.log('Results:', JSON.stringify(results.map(r => r.url.href), null, 2));
  } catch(e) {
    console.error('Err:', e);
  }
}
test();
