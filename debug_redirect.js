const https = require('https');

const url = 'https://archive.toonworld4all.me/redirect/c35ff3ed60a6c9e47765e3ba868a9d2516e76cbccbc86b4a4e6db7f78db813f596023bfa56a2a58d07347a3759775756d7d71497ddf0cb9d1bd9c128b492aca54fc4fdbf1e9064f8a65f7da6950505d59ab1c5';

https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html,*/*', 'Referer': 'https://archive.toonworld4all.me/episode/jujutsu-kaisen-3x1' } }, (res) => {
  let data = '';
  res.on('data', (d) => { data += d; });
  res.on('end', () => {
    // Search for code tags or any visible links
    const codeMatch = data.match(/<code[^>]*>([\s\S]*?)<\/code>/gi);
    console.log('--- Code tags ---');
    console.log(codeMatch);
    
    const allLinks = data.match(/https?:\/\/[^"'\s]+/gi);
    console.log('\n--- All URLs found ---');
    console.log([...new Set(allLinks)].filter(u => u.includes('hubcloud')));
  });
}).on('error', (e) => console.error(e));
