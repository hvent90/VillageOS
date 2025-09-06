const http = require('http');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Test configuration endpoints
async function testConfigurationEndpoints() {
  const baseUrl = 'http://localhost:3000';

  console.log('Testing Configuration Endpoints...\n');

  try {
    // Test 1: GET /api/configuration (list all)
    console.log('1. Testing GET /api/configuration');
    const response1 = await makeRequest(`${baseUrl}/api/configuration`);
    console.log('   Status:', response1.statusCode);
    console.log('   Response:', response1.data);
    console.log('');

    // Test 2: GET /api/configuration/:key (specific config)
    console.log('2. Testing GET /api/configuration/evolution_egg_time_hours');
    const response2 = await makeRequest(`${baseUrl}/api/configuration/evolution_egg_time_hours`);
    console.log('   Status:', response2.statusCode);
    console.log('   Response:', response2.data);
    console.log('');

    // Test 3: PUT /api/configuration/:key (update config)
    console.log('3. Testing PUT /api/configuration/test_key');
    const response3 = await makeRequest(`${baseUrl}/api/configuration/test_key`, 'PUT', {
      value: 'test_value',
      description: 'Test configuration'
    });
    console.log('   Status:', response3.statusCode);
    console.log('   Response:', response3.data);
    console.log('');

    // Test 4: DELETE /api/configuration/:key (delete config)
    console.log('4. Testing DELETE /api/configuration/test_key');
    const response4 = await makeRequest(`${baseUrl}/api/configuration/test_key`, 'DELETE');
    console.log('   Status:', response4.statusCode);
    console.log('   Response:', response4.data);
    console.log('');

    console.log('✅ All configuration endpoint tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const data = body ? JSON.parse(body) : null;
          resolve({
            statusCode: res.statusCode,
            data: data
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: body
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test configuration initialization
async function testConfigurationInitialization() {
  console.log('\nTesting Configuration Initialization...\n');

  try {
    // Test 0: Check if configurations exist (should be initialized on startup)
    console.log('0. Testing configuration initialization');
    const response0 = await makeRequest(`${baseUrl}/api/configuration`);
    console.log('   Status:', response0.statusCode);
    console.log('   Number of configs:', response0.data ? response0.data.length : 0);
    if (response0.data && response0.data.length > 0) {
      console.log('   Sample configs:');
      response0.data.slice(0, 3).forEach(config => {
        console.log(`     - ${config.key}: ${config.value} (${config.isOverride ? 'Custom' : 'Default'})`);
      });
    }
    console.log('');

  } catch (error) {
    console.error('❌ Initialization test failed:', error.message);
  }
}

// Run the tests
async function runAllTests() {
  await testConfigurationInitialization();
  await testConfigurationEndpoints();
}

runAllTests();