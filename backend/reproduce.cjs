const http = require('http');

const req = http.request({
  method: 'DELETE',
  hostname: 'localhost',
  port: 5002,
  path: '/api/task-types/TT1',
  headers: {
    'x-user-id': 'E006'
  }
}, res => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Body: ${data}`);
  });
});

req.on('error', console.error);
req.end();
