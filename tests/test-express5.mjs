import express from 'express';
import http from 'http';

const app = express();

const results = [];

function makeRequest(path) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 34567,
      path,
      method: 'GET'
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, body: data, headers: res.headers });
      });
    });
    req.on('error', err => resolve({ error: err.message }));
    req.end();
  });
}

const server = http.createServer(app);

app.use((req, res, next) => {
  console.log('REQUEST:', req.method, req.path);
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({ name: 'Test API', version: '1.0.0' });
});

app.get('/test', (req, res) => {
  res.json({ test: true });
});

app.use('/api/v1', (req, res, next) => {
  next();
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

app.use((err, req, res, next) => {
  res.status(500).json({ error: 'Internal Server Error' });
});

async function runTests() {
  await new Promise(resolve => server.listen(34567, resolve));
  
  console.log('Testing Express 5.2.1 route behavior...\n');
  
  const tests = [
    { path: '/', desc: 'Root route' },
    { path: '/health', desc: 'Health route' },
    { path: '/test', desc: 'Test route' },
    { path: '/api/v1', desc: 'API mount point' },
    { path: '/nonexistent', desc: 'Non-existent route' },
    { path: '/api/v1/unknown', desc: 'Unknown API route' },
  ];
  
  for (const { path, desc } of tests) {
    const result = await makeRequest(path);
    const passed = result.status === (path === '/nonexistent' || path === '/api/v1/unknown' ? 404 : 200);
    console.log(`${passed ? '✓' : '✗'} ${desc} (${path}) -> ${result.status} ${result.body.substring(0, 80)}`);
    results.push({ path, desc, status: result.status, passed });
  }
  
  server.close();
  
  console.log('\n--- Summary ---');
  const failed = results.filter(r => !r.passed);
  if (failed.length === 0) {
    console.log('All tests passed!');
  } else {
    console.log(`${failed.length} test(s) failed:`);
    failed.forEach(f => console.log(`  - ${f.desc} (${f.path}): got ${f.status}, expected ${f.path.includes('nonexistent') || f.path.includes('unknown') ? 404 : 200}`));
  }
}

runTests().catch(console.error);