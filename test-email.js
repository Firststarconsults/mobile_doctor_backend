// Test script to verify email functionality
import { sendProviderContactEmail } from './utils/nodeMailer.js';
import 'dotenv/config.js';

const testEmailFunctionality = async () => {
  console.log('Testing email functionality...');
  console.log('Environment variables check:');
  console.log('G_MAIL:', process.env.G_MAIL ? 'Set' : 'Not set');
  console.log('GOOGLE_APPPASSWORD:', process.env.GOOGLE_APPPASSWORD ? 'Set' : 'Not set');
  
  // Test data
  const testPatientEmail = 'test@example.com'; // Replace with a real email for testing
  const testPatientName = 'Test Patient';
  const testProviderDetails = {
    name: 'Test Pharmacy',
    phone: '+1234567890',
    address: '123 Test Street, Test City',
    type: 'pharmacy'
  };
  const testPrescriptionDetails = {
    id: '507f1f77bcf86cd799439011',
    totalCost: 50.00
  };

  try {
    console.log('Attempting to send test email...');
    const result = await sendProviderContactEmail(
      testPatientEmail,
      testPatientName,
      testProviderDetails,
      testPrescriptionDetails
    );
    console.log('Email sent successfully:', result);
  } catch (error) {
    console.error('Email sending failed:', error);
    console.error('Error details:', error.message);
  }
};

// Run the test
testEmailFunctionality();