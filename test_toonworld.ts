/**
 * Quick smoke-test for the ToonWorld4All source.
 * Requires TMDB_ACCESS_TOKEN env var.
 * Run:  $env:TMDB_ACCESS_TOKEN="<your_token>" ; npx ts-node --project tsconfig.dev.json test_toonworld.ts
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

// Jujutsu Kaisen (TMDB series id: 95479), Season 3, Episode 1
const id = new TmdbId(95479, 3, 1);

async function main() {
  console.log('=== ToonWorld4All Smoke Test ===\n');

  const logger = winston.createLogger({ transports: [new winston.transports.Console()] });
  const axiosInstance = axios.create();
  const fetcher = new Fetcher(axiosInstance, logger);
  const source = new ToonWorld4All(fetcher);

  console.log(`Testing: ${source.label} (id=${source.id})`);
  console.log(`Looking up: Jujutsu Kaisen S03E01 (TMDB: ${id})\n`);

  try {
    const results = await source.handle(ctx as any, 'series', id);
    if (!results.length) {
      console.log('⚠️  No results returned (source returned empty array)');
      return;
    }
    console.log(`✅ Got ${results.length} result(s):`);
    for (const r of results) {
      console.log(`  - URL : ${r.url?.href}`);
      console.log(`    meta: height=${r.meta?.height}, langs=${r.meta?.countryCodes?.join(',')}, title="${r.meta?.title}"`);
    }
  } catch (e) {
    console.error('❌ Error:', e);
  }
}

main();

