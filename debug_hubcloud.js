const https = require('https');

const url = 'https://hubcloud.foo/video/555fcaq0mh931gf';

https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html,*/*' } }, (res) => {
  let data = '';
  res.on('data', (d) => { data += d; });
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('\n--- BODY (first 4000 chars) ---');
    console.log(data.substring(0, 4000));
    
    // Check for the pattern expected by hd-hub-helper.ts
    const match = data.match(/'o','(.*?)'/);
    if (match) {
        console.log('\n--- Found "o" pattern! ---');
        console.log(match[1]);
    } else {
        console.log('\n--- "o" pattern NOT found ---');
    }
  });
}).on('error', (e) => console.error(e));
