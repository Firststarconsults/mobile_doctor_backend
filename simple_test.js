import https from 'https';

// Simple security test
async function testSecurity() {
  console.log('🧪 Mobile Doctor Backend - Security Test');
  console.log('=================================');

  try {
    // Test 1: Health check
    console.log('\n1. Testing server health...');
    const healthResponse = await fetch('http://localhost:3000/api/health');
    const healthData = await healthResponse.json();
    console.log(`✅ Health check: ${healthResponse.status} - Database: ${healthData.database}`);

    // Test 2: Admin route without auth (should fail)
    console.log('\n2. Testing admin route without auth...');
    try {
      const adminResponse = await fetch('http://localhost:3000/api/admin/updateKycVerificationStatus/123', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: '123',
          kycVerificationStatus: 'approved'
        })
      });
      console.log(`Admin route (no auth): ${adminResponse.status}`);
    } catch (error) {
      console.log(`❌ Admin route test failed: ${error.message}`);
    }

    // Test 3: Prescription route without auth (should fail)
    console.log('\n3. Testing prescription route without auth...');
    try {
      const prescriptionResponse = await fetch('http://localhost:3000/api/prescription/createPrescription/123', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: '456',
          medicines: [{ name: 'Test' }]
        })
      });
      console.log(`Prescription route (no auth): ${prescriptionResponse.status}`);
    } catch (error) {
      console.log(`❌ Prescription route test failed: ${error.message}`);
    }

    // Test 4: Invalid email validation (should fail)
    console.log('\n4. Testing invalid email validation...');
    try {
      const invalidEmailResponse = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userType: 'patient',
          email: 'invalid-email',
          password: 'TestPass123',
          phone: '08012345678',
          firstName: 'Test',
          lastName: 'User'
        })
      });
      console.log(`Invalid email validation: ${invalidEmailResponse.status}`);
    } catch (error) {
      console.log(`❌ Email validation test failed: ${error.message}`);
    }

    // Test 5: Valid registration (should work)
    console.log('\n5. Testing valid registration...');
    try {
      const validRegResponse = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userType: 'patient',
          email: 'test@example.com',
          password: 'TestPassword123',
          phone: '08012345678',
          firstName: 'Test',
          lastName: 'User'
        })
      });
      console.log(`Valid registration: ${validRegResponse.status}`);
    } catch (error) {
      console.log(`❌ Registration test failed: ${error.message}`);
    }

    // Test 6: Security headers
    console.log('\n6. Testing security headers...');
    try {
      const headersResponse = await fetch('http://localhost:3000/api/health');
      const hasContentSecurity = headersResponse.headers.has('x-content-type-options');
      const hasFrameOptions = headersResponse.headers.has('x-frame-options');
      const hasXSSProtection = headersResponse.headers.has('x-xss-protection');
      
      if (hasContentSecurity && hasFrameOptions && hasXSSProtection) {
        console.log('✅ Security headers present');
      } else {
        console.log('❌ Some security headers missing');
      }
    } catch (error) {
      console.log(`❌ Security headers test failed: ${error.message}`);
    }

    console.log('\n🎉 Security testing completed!');
    console.log('\n💡 Expected results:');
    console.log('   - Health check: 200');
    console.log('   - Admin route (no auth): 401 or 403');
    console.log('   - Prescription route (no auth): 401 or 403');
    console.log('   - Invalid email: 400');
    console.log('   - Valid registration: 200');
    console.log('   - Security headers: Present');
    console.log('\n📝 Check the results above to verify security fixes are working!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSecurity();
