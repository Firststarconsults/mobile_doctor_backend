import twilio from 'twilio';
import 'dotenv/config.js';

// Lazy initialization of Twilio client
let client = null;

const getTwilioClient = () => {
  if (!client) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken) {
      console.warn('⚠️  Twilio credentials not configured. SMS features will be disabled.');
      return null;
    }
    
    client = twilio(accountSid, authToken);
  }
  return client;
};

// Enhanced SMS service
export class SMSService {
  static async sendSMS(to, message, options = {}) {
    try {
      const client = getTwilioClient();
      if (!client) {
        console.warn('⚠️  SMS service disabled - Twilio not configured');
        return { success: false, error: 'SMS service not configured' };
      }
      
      const smsOptions = {
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: to,
        ...options,
      };

      const response = await client.messages.create(smsOptions);
      console.log(`📱 SMS sent to ${to}: ${response.sid}`);
      
      return {
        success: true,
        sid: response.sid,
        status: response.status,
        to: response.to,
        from: response.from,
      };
    } catch (error) {
      console.error(`❌ Failed to send SMS to ${to}:`, error);
      return { success: false, error: error.message };
    }
  }

  static async sendVerificationCode(phoneNumber, code) {
    const message = `Your Mobile Doctor verification code is: ${code}. This code expires in 10 minutes.`;
    return this.sendSMS(phoneNumber, message, {
      priority: 'high',
    });
  }

  static async sendPasswordResetOTP(phoneNumber, otp) {
    const message = `Your Mobile Doctor password reset OTP is: ${otp}. This OTP expires in 5 minutes. Do not share this code.`;
    return this.sendSMS(phoneNumber, message, {
      priority: 'high',
    });
  }

  static async sendAppointmentReminder(phoneNumber, patientName, dateTime, doctorName) {
    const message = `Hi ${patientName}, this is a reminder for your appointment with Dr. ${doctorName} on ${dateTime}. Please be ready 10 minutes before.`;
    return this.sendSMS(phoneNumber, message, {
      priority: 'normal',
    });
  }

  static async sendPrescriptionReady(phoneNumber, patientName, pharmacyName) {
    const message = `Hi ${patientName}, your prescription is ready for pickup at ${pharmacyName}. Please bring your ID.`;
    return this.sendSMS(phoneNumber, message, {
      priority: 'normal',
    });
  }

  static async sendEmergencyAlert(phoneNumber, message) {
    const emergencyMessage = `🚨 MOBILE DOCTOR ALERT: ${message}`;
    return this.sendSMS(phoneNumber, emergencyMessage, {
      priority: 'urgent',
    });
  }

  static async sendConsultationInvitation(phoneNumber, doctorName, consultationLink) {
    const message = `Dr. ${doctorName} has invited you to a consultation. Join here: ${consultationLink}`;
    return this.sendSMS(phoneNumber, message, {
      priority: 'high',
    });
  }

  static async sendPaymentConfirmation(phoneNumber, amount, transactionId) {
    const message = `Mobile Doctor: Payment of $${amount} confirmed. Transaction ID: ${transactionId}. Thank you!`;
    return this.sendSMS(phoneNumber, message, {
      priority: 'normal',
    });
  }

  static async sendTestResultsAvailable(phoneNumber, patientName, testType) {
    const message = `Hi ${patientName}, your ${testType} test results are now available. Please check your Mobile Doctor app.`;
    return this.sendSMS(phoneNumber, message, {
      priority: 'normal',
    });
  }

  static async sendMedicationReminder(phoneNumber, patientName, medicationName, dosage, time) {
    const message = `Hi ${patientName}, reminder: Take ${medicationName} (${dosage}) at ${time}. Mobile Doctor`;
    return this.sendSMS(phoneNumber, message, {
      priority: 'normal',
    });
  }

  static async sendBulkSMS(recipients, message, options = {}) {
    const results = [];
    
    for (const recipient of recipients) {
      const result = await this.sendSMS(recipient, message, options);
      results.push({ recipient, result });
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
  }

  static async getDeliveryStatus(messageSid) {
    try {
      const client = getTwilioClient();
      if (!client) {
        console.warn('⚠️  SMS status check disabled - Twilio not configured');
        return { success: false, error: 'SMS service not configured' };
      }
      
      const message = await client.messages(messageSid).fetch();
      return {
        success: true,
        sid: message.sid,
        status: message.status,
        to: message.to,
        from: message.from,
        dateCreated: message.dateCreated,
        dateUpdated: message.dateUpdated,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
      };
    } catch (error) {
      console.error(`❌ Failed to get SMS status for ${messageSid}:`, error);
      return { success: false, error: error.message };
    }
  }

  static async validatePhoneNumber(phoneNumber) {
    try {
      const client = getTwilioClient();
      if (!client) {
        console.warn('⚠️  Phone validation disabled - Twilio not configured');
        return { valid: false, error: 'SMS service not configured' };
      }
      
      const validation = await client.lookups.v1.phoneNumbers(phoneNumber).fetch();
      return {
        valid: true,
        phoneNumber: validation.phoneNumber,
        countryCode: validation.countryCode,
        nationalFormat: validation.nationalFormat,
      };
    } catch (error) {
      console.error(`❌ Phone number validation failed for ${phoneNumber}:`, error);
      return { valid: false, error: error.message };
    }
  }

  static async getAccountInfo() {
    try {
      const client = getTwilioClient();
      if (!client) {
        console.warn('⚠️  Account info disabled - Twilio not configured');
        return { success: false, error: 'SMS service not configured' };
      }
      
      const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
      return {
        friendlyName: account.friendlyName,
        status: account.status,
        type: account.type,
        dateCreated: account.dateCreated,
      };
    } catch (error) {
      console.error('❌ Failed to get Twilio account info:', error);
      return { success: false, error: error.message };
    }
  }
}

// SMS templates
export const SMSTemplates = {
  VERIFICATION_CODE: (code) => `Your Mobile Doctor verification code is: ${code}. Valid for 10 minutes.`,
  PASSWORD_RESET: (otp) => `Your Mobile Doctor password reset OTP is: ${otp}. Valid for 5 minutes.`,
  APPOINTMENT_REMINDER: (dateTime, doctorName) => `Reminder: Appointment with Dr. ${doctorName} on ${dateTime}. Be ready 10 minutes early.`,
  PRESCRIPTION_READY: (pharmacyName) => `Your prescription is ready for pickup at ${pharmacyName}.`,
  EMERGENCY_ALERT: (message) => `🚨 MOBILE DOCTOR ALERT: ${message}`,
  CONSULTATION_INVITATION: (doctorName, link) => `Dr. ${doctorName} invites you to consultation: ${link}`,
  PAYMENT_CONFIRMATION: (amount, transactionId) => `Payment $${amount} confirmed. ID: ${transactionId}.`,
  TEST_RESULTS: (testType) => `Your ${testType} test results are available in Mobile Doctor app.`,
  MEDICATION_REMINDER: (medication, dosage, time) => `Reminder: Take ${medication} (${dosage}) at ${time}.`,
};

export default SMSService;
