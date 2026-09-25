const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Permite cuerpos de peticiones Binance sin alterarlos
app.use(express.raw({ type: '*/*', limit: '10mb' }));

// Healthcheck cuando abras la URL en el navegador
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    servicio: 'Proxy Binance - Render Frankfurt',
    region: 'Frankfurt (Alemania)',
    activo: true,
    testTime: '/api/v3/time'
  });
});

// Proxy inverso para endpoints de Binance (/api/*, /sapi/*)
app.all('*', async (req, res) => {
  try {
    const targetUrl = 'https://api.binance.com' + req.originalUrl;
    
    // Filtramos encabezados de red interna para que Binance vea únicamente la IP de Frankfurt
    const headers = {};
    for (const [key, value] of Object.entries(req.headers)) {
      const lower = key.toLowerCase();
      if (!['host', 'connection', 'content-length', 'cf-connecting-ip', 'x-forwarded-for'].includes(lower)) {
        headers[key] = value;
      }
    }
    headers['Host'] = 'api.binance.com';

    const options = {
      method: req.method,
      headers: headers
    };

    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body && req.body.length > 0) {
      options.body = req.body;
    }

    const binanceRes = await fetch(targetUrl, options);

    res.status(binanceRes.status);
    binanceRes.headers.forEach((val, key) => {
      const lower = key.toLowerCase();
      if (!['content-encoding', 'transfer-encoding', 'connection'].includes(lower)) {
        res.setHeader(key, val);
      }
    });

    const buffer = await binanceRes.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Proxy error', message: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Binance Proxy escuchando en puerto ${PORT}`);
});
