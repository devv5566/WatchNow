const https = require('https');

const url = 'https://archive.toonworld4all.me/episode/jujutsu-kaisen-3x1';

https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html,*/*' } }, (res) => {
  let data = '';
  res.on('data', (d) => { data += d; });
  res.on('end', () => {
    const scripts = [...data.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)];
    console.log(`--- Found ${scripts.length} script tags ---`);
    scripts.forEach((s, i) => {
        if (s[1].includes('HubCloud')) {
            console.log(`Script ${i} contains HubCloud!`);
            console.log(s[1].substring(0, 1000));
        }
    });
    
    // Also check for NEXT_DATA
    if (data.includes('__NEXT_DATA__')) {
        console.log('\n--- Found __NEXT_DATA__ ---');
    }
  });
}).on('error', (e) => console.error(e));
