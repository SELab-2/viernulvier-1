const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });
    req.on('error', (e) => reject(e));
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function run() {
  const host = 'localhost';
  const port = 3000;
  const apiPath = '/api/v1';
  let token;

  try {
    const loginData = { username: 'admin', password: 'password' };
    const loginRes = await request({
      hostname: host,
      port: port,
      path: `${apiPath}/auth/login`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, loginData);
    
    token = loginRes.data.token;
    if (!token) {
        console.error('No token found in response');
        process.exit(1);
    }
  } catch (err) {
    console.error('Connection failed:', err.message || err);
    process.exit(1);
  }

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const requiredHalls = [
    {
      vendor_id: 0,
      address: 'Mockstraat 1, 9000 Gent',
      capacity: 100,
      name: { nl: 'Mock Hal Arena', en: 'Mock Hall Arena', fr: 'Mock Salle Arena' }
    },
    {
      vendor_id: 0,
      address: 'Mockstraat 1, 9000 Gent',
      capacity: 50,
      name: { nl: 'Mock Hal Studio', en: 'Mock Hall Studio', fr: 'Mock Salle Studio' }
    }
  ];

  try {
    let hallsRes = await request({
      hostname: host,
      port: port,
      path: `${apiPath}/hall`,
      method: 'GET',
      headers: authHeaders
    });

    let currentHalls = Array.isArray(hallsRes.data) ? hallsRes.data : (hallsRes.data.data || []);

    for (const reqHall of requiredHalls) {
      const exists = currentHalls.find(h => h.name && h.name.nl === reqHall.name.nl);
      if (!exists) {
        console.log(`Creating hall: ${reqHall.name.nl}`);
        const createRes = await request({
          hostname: host,
          port: port,
          path: `${apiPath}/hall`,
          method: 'POST',
          headers: authHeaders
        }, reqHall);
        if (createRes.status >= 400) {
            console.error(`Failed to create hall ${reqHall.name.nl}:`, createRes.status, JSON.stringify(createRes.data.details || createRes.data));
        }
      } else {
        console.log(`Hall already exists: ${reqHall.name.nl}`);
      }
    }

    const finalRes = await request({
      hostname: host,
      port: port,
      path: `${apiPath}/hall`,
      method: 'GET',
      headers: authHeaders
    });
    const finalHalls = Array.isArray(finalRes.data) ? finalRes.data : (finalRes.data.data || []);
    console.log('Total hall count:', finalHalls.length);
    console.log('Hall IDs:', finalHalls.map(h => h.id));
  } catch (err) {
    console.error('API Error:', err.message || err);
    process.exit(1);
  }
}

run();
