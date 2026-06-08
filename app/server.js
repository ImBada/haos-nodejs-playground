const http = require('node:http');

const port = Number(process.env.PORT || 3000);

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('HAOS Node.js Playground is running.\n');
});

server.listen(port, '0.0.0.0', () => {
  console.log('Node.js playground listening on port ' + port);
});
