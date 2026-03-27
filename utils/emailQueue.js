import Queue from 'bull';
import 'dotenv/config.js';
import { sendVerificationEmail, sendForgetPasswordEmail, sendNotificationEmail, sendProviderContactEmail } from './nodeMailer.js';

// Create email queue with Redis (fallback to memory for development)
const emailQueue = new Queue('email processing', {
  redis: process.env.REDIS_URL || undefined,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

// Email queue processors
emailQueue.process('verification-email', async (job) => {
  const { to, code } = job.data;
  try {
    await sendVerificationEmail(to, code);
    console.log(`✅ Verification email sent to ${to}`);
  } catch (error) {
    console.error(`❌ Failed to send verification email to ${to}:`, error);
    throw error;
  }
});

emailQueue.process('password-reset-email', async (job) => {
  const { to, otp } = job.data;
  try {
    await sendForgetPasswordEmail(to, otp);
    console.log(`✅ Password reset email sent to ${to}`);
  } catch (error) {
    console.error(`❌ Failed to send password reset email to ${to}:`, error);
    throw error;
  }
});

emailQueue.process('notification-email', async (job) => {
  const { to, subject, message } = job.data;
  try {
    await sendNotificationEmail(to, subject, message);
    console.log(`✅ Notification email sent to ${to}`);
  } catch (error) {
    console.error(`❌ Failed to send notification email to ${to}:`, error);
    throw error;
  }
});

emailQueue.process('provider-contact-email', async (job) => {
  const { patientEmail, patientName, providerDetails, prescriptionDetails } = job.data;
  try {
    await sendProviderContactEmail(patientEmail, patientName, providerDetails, prescriptionDetails);
    console.log(`✅ Provider contact email sent to ${patientEmail}`);
  } catch (error) {
    console.error(`❌ Failed to send provider contact email to ${patientEmail}:`, error);
    throw error;
  }
});

// Queue event listeners
emailQueue.on('completed', (job, result) => {
  console.log(`✅ Email job ${job.id} completed:`, job.name);
});

emailQueue.on('failed', (job, err) => {
  console.error(`❌ Email job ${job.id} failed:`, err.message);
});

emailQueue.on('stalled', (job) => {
  console.warn(`⚠️ Email job ${job.id} stalled`);
});

// Enhanced email functions with queue
export const queueVerificationEmail = async (to, code, options = {}) => {
  return emailQueue.add('verification-email', { to, code }, {
    priority: options.priority || 'high',
    delay: options.delay || 0,
    attempts: options.attempts || 3,
  });
};

export const queuePasswordResetEmail = async (to, otp, options = {}) => {
  return emailQueue.add('password-reset-email', { to, otp }, {
    priority: options.priority || 'high',
    delay: options.delay || 0,
    attempts: options.attempts || 3,
  });
};

export const queueNotificationEmail = async (to, subject, message, options = {}) => {
  return emailQueue.add('notification-email', { to, subject, message }, {
    priority: options.priority || 'normal',
    delay: options.delay || 0,
    attempts: options.attempts || 2,
  });
};

export const queueProviderContactEmail = async (patientEmail, patientName, providerDetails, prescriptionDetails, options = {}) => {
  return emailQueue.add('provider-contact-email', { patientEmail, patientName, providerDetails, prescriptionDetails }, {
    priority: options.priority || 'normal',
    delay: options.delay || 0,
    attempts: options.attempts || 2,
  });
};

// Queue management functions
export const getQueueStats = async () => {
  const waiting = await emailQueue.getWaiting();
  const active = await emailQueue.getActive();
  const completed = await emailQueue.getCompleted();
  const failed = await emailQueue.getFailed();
  
  return {
    waiting: waiting.length,
    active: active.length,
    completed: completed.length,
    failed: failed.length,
  };
};

export const pauseQueue = async () => {
  await emailQueue.pause();
  console.log('📧 Email queue paused');
};

export const resumeQueue = async () => {
  await emailQueue.resume();
  console.log('📧 Email queue resumed');
};

export const clearQueue = async () => {
  await emailQueue.clean(0, 'completed');
  await emailQueue.clean(0, 'failed');
  console.log('📧 Email queue cleaned');
};

export default emailQueue;
