const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const BASE_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json'
};

function getLocalIPAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

const server = http.createServer((req, res) => {
  // CORS & PWA headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  // Prevent directory traversal
  const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(BASE_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found: ' + reqPath);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  const ips = getLocalIPAddresses();
  console.log('======================================================================');
  console.log('🚀 DANH HỌC IELTS & TOEIC - LOCALHOST SERVER ĐÃ KHỞI CHẠY!');
  console.log('======================================================================');
  console.log(`\n💻 Máy tính (Localhost):`);
  console.log(`   👉 http://localhost:${PORT}`);
  console.log(`   👉 http://127.0.0.1:${PORT}`);
  
  console.log(`\n📱 Điện thoại iPhone 17 Pro Max (Cùng mạng Wi-Fi):`);
  ips.forEach(ip => {
    console.log(`   👉 http://${ip}:${PORT}`);
  });

  console.log('\n📲 Hướng dẫn cài đặt App lên iPhone:');
  console.log('   1. Mở trình duyệt Safari trên iPhone.');
  console.log(`   2. Nhập địa chỉ: http://${ips[0] || '192.168.100.163'}:${PORT}`);
  console.log('   3. Bấm icon Chia sẻ (hình vuông có mũi tên lên ⎋ ở cạnh dưới).');
  console.log('   4. Chọn "Thêm vào MH chính" (Add to Home Screen).');
  console.log('   5. App sẽ xuất hiện trên màn hình chính và chạy toàn màn hình mượt mà!\n');
  console.log('======================================================================');
});
