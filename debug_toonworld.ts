/**
 * Debug test - bypass Source.handle() caching/filtering, call handleInternal directly
 * Run: $env:TMDB_ACCESS_TOKEN="<token>"; npx ts-node --project tsconfig.dev.json debug_toonworld.ts
 */

import axios from 'axios';
import winston from 'winston';
import { TmdbId } from './src/utils/id/TmdbId';
import { Fetcher } from './src/utils/Fetcher';
import { ToonWorld4All } from './src/source/ToonWorld4All';
import { CountryCode } from './src/types';

const ctx = {
  hostUrl: new URL('http://localhost:7000'),
  id: 'test',
  config: {
    [CountryCode.hi]: 'true',
    [CountryCode.multi]: 'true',
  },
};

const id = new TmdbId(95479, 3, 1); // Jujutsu Kaisen S3E1

async function main() {
  console.log('=== ToonWorld4All DEBUG Test ===\n');

  const logger = winston.createLogger({
    level: 'info',
    format: winston.format.simple(),
    transports: [new winston.transports.Console()],
  });

  const axiosInstance = axios.create();
  const fetcher = new Fetcher(axiosInstance, logger);
  // Access handleInternal directly by casting
  const source = new ToonWorld4All(fetcher) as any;

  console.log('Testing handleInternal directly (bypasses cache+filter)...\n');

  try {
    const results = await source.handleInternal(ctx, 'series', id);
    console.log(`\n✅ handleInternal got ${results.length} result(s):`);
    for (const r of results) {
      console.log(`  URL  : ${r.url?.href}`);
      console.log(`  meta : height=${r.meta?.height}, langs=${r.meta?.countryCodes?.join(',')}, title="${r.meta?.title}"`);
    }
  } catch (e: any) {
    console.error('\n❌ Error from handleInternal:', e?.message ?? e);
  }
}

main();
