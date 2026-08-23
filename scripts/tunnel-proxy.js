const http = require('http');

/**
 * Tunnel Proxy for Expo
 * Routes:
 *  - 9081 -> 8081 (Merchant)
 *  - 9082 -> 8082 (Customer)
 *  - 9083 -> 8083 (Rider)
 *
 * Strips internal dev ports (:8081, :8082, :8083, :9081, :9082, :9083)
 * from all manifest responses so Expo Go fetches bundles cleanly over Cloudflare Tunnel (port 443).
 */

function createProxy(listenPort, targetPort, name) {
  const server = http.createServer((clientReq, clientRes) => {
    const options = {
      hostname: '127.0.0.1',
      port: targetPort,
      path: clientReq.url,
      method: clientReq.method,
      headers: {
        ...clientReq.headers,
        host: clientReq.headers.host || `localhost:${targetPort}`,
      },
    };

    const proxyReq = http.request(options, (targetRes) => {
      const contentType = targetRes.headers['content-type'] || '';
      const isJsonOrText = contentType.includes('json') || contentType.includes('text') || contentType.includes('application/javascript');

      // If it is binary or bundle stream, stream directly
      if (!isJsonOrText && !clientReq.headers['expo-platform']) {
        clientRes.writeHead(targetRes.statusCode, targetRes.headers);
        targetRes.pipe(clientRes);
        return;
      }

      // Collect body chunks to rewrite any tunnel URLs with port
      const chunks = [];
      targetRes.on('data', (chunk) => chunks.push(chunk));
      targetRes.on('end', () => {
        let body = Buffer.concat(chunks);

        // If JSON manifest or text, rewrite any embedded ports in the tunnel hostname
        if (contentType.includes('json') || contentType.includes('text') || clientReq.headers['expo-platform'] || clientReq.url === '/' || clientReq.url.startsWith('/_expo/')) {
          let text = body.toString('utf8');
          // Replace domain:8081 or domain:9081 with domain
          text = text.replace(/([a-zA-Z0-9-]+\.trycloudflare\.com):[0-9]+/g, '$1');
          text = text.replace(/([a-zA-Z0-9-]+\.localtunnel\.me):[0-9]+/g, '$1');
          text = text.replace(/([a-zA-Z0-9-]+\.ngrok-free\.app):[0-9]+/g, '$1');
          // Also ensure scheme in launchAsset url is https
          text = text.replace(/http:\/\/([a-zA-Z0-9-]+\.trycloudflare\.com)/g, 'https://$1');
          body = Buffer.from(text, 'utf8');
        }

        const headers = { ...targetRes.headers };
        headers['content-length'] = body.length;
        // Strip transfer-encoding if we set content-length
        delete headers['transfer-encoding'];

        clientRes.writeHead(targetRes.statusCode, headers);
        clientRes.end(body);
      });
    });

    proxyReq.on('error', (err) => {
      console.error(`[${name}] Proxy error to port ${targetPort}:`, err.message);
      clientRes.writeHead(502, { 'Content-Type': 'text/plain' });
      clientRes.end(`Proxy error: ${err.message}`);
    });

    clientReq.pipe(proxyReq);
  });

  server.listen(listenPort, () => {
    console.log(`✅ [${name}] Proxy listening on port ${listenPort} -> target Expo port ${targetPort}`);
  });

  return server;
}

createProxy(9081, 8081, 'Merchant App');
createProxy(9082, 8082, 'Customer App');
createProxy(9083, 8083, 'Rider App');
