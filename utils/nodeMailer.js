//utils/nodeMailer.js
import 'dotenv/config.js';
import nodemailer from 'nodemailer';

// const transporter = nodemailer.createTransport({
//   host: 'server122.web-hosting.com',
//   port: 465,  
//   auth: {
//     user: 'noreply@mobiledoctor.firststarconsults.online',
//     pass: 'mobiledoctor$1', 
//   },
// });


// const transporter = nodemailer.createTransport({
//   host: process.env.SMTP_HOST,
//   port: process.env.SMTP_PORT,
//   auth: {
//     user: process.env.SMTP_USER,
//     pass: process.env.SMTP_PASS,
//   },
// });

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.G_MAIL, 
    pass: process.env.GOOGLE_APPPASSWORD, 
  },
  secure: true,
  tls: {
    rejectUnauthorized: true
  }
});






  // Verify SMTP configuration
transporter.verify(function(error, success) {
  if (error) {
    console.error('SMTP configuration error:');
    console.error(error);
  } else {
    console.log("SMTP configuration is correct. Server is ready to take our messages.");
  }
});

export const sendVerificationEmail = async (to, code) => {
  const mailOptions = {
    from: '"Mobile Doctor" <no-reply@mobiledoctorapp.com>',
    to,
    subject: 'Mobile-Doctor Verification Code',
    text: `Dear Mobile Doctor User,\n\nYour verification code is: ${code}\n\nThank you for choosing Mobile Doctor.\n\nBest regards,\nMobile Doctor Team`,
  };

  return transporter.sendMail(mailOptions);
};




export const sendForgetPasswordEmail = async (to, otp) => {
  const mailOptions = {
    from: '"Mobile Doctor" <no-reply@mobiledoctorapp.com>', 
    to,
    subject: 'Password Reset OTP',
    text: `You have requested a password reset. Use the following OTP to reset your password: ${otp}`,
    html: `<p>You have requested a password reset. Use the following OTP to reset your password:</p>
           <h3>${otp}</h3>`, // Display the OTP in a prominent way
  };

  return transporter.sendMail(mailOptions);
};



export const sendNotificationEmail = async (to, subject, message) => {
  const mailOptions = {
    from: '"Mobile Doctor" <no-reply@mobiledoctorapp.com>',
    to,
    subject,
    text: message,
    html: `<p>${message}</p>`,
  };

  return transporter.sendMail(mailOptions);
};

// Function to send provider contact details to patient after cost approval
const sendProviderContactEmail = async (patientEmail, patientName, providerDetails, prescriptionDetails) => {
  try {
    // Validate required parameters
    if (!patientEmail) {
      throw new Error('Patient email is required');
    }
    if (!patientName) {
      throw new Error('Patient name is required');
    }
    if (!providerDetails || !providerDetails.name) {
      throw new Error('Provider details with name are required');
    }
    if (!prescriptionDetails || !prescriptionDetails.id) {
      throw new Error('Prescription details with ID are required');
    }

    console.log('Sending provider contact email with validated data:');
    console.log('Patient email:', patientEmail);
    console.log('Provider details:', providerDetails);
    console.log('Prescription details:', prescriptionDetails);
    const mailOptions = {
      from: process.env.G_MAIL,
      to: patientEmail,
      subject: "Provider Contact Information - Prescription Approved",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #2c5aa0; margin: 0;">First Star Consult</h2>
            <p style="color: #666; margin: 5px 0;">Your Healthcare Partner</p>
          </div>
          
          <h3 style="color: #333; border-bottom: 2px solid #2c5aa0; padding-bottom: 10px;">Prescription Approved - Provider Contact Information</h3>
          
          <p style="color: #333; line-height: 1.6;">Dear ${patientName},</p>
          
          <p style="color: #333; line-height: 1.6;">
            Your prescription cost has been approved successfully! Below are the contact details for your assigned ${providerDetails.type}:
          </p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #2c5aa0; margin-top: 0;">Provider Information</h4>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555; width: 30%;">Name:</td>
                <td style="padding: 8px 0; color: #333;">${providerDetails.name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Phone:</td>
                <td style="padding: 8px 0; color: #333;">${providerDetails.phone || 'Not provided'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Address:</td>
                <td style="padding: 8px 0; color: #333;">${providerDetails.address || 'Not provided'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Type:</td>
                <td style="padding: 8px 0; color: #333; text-transform: capitalize;">${providerDetails.type}</td>
              </tr>
            </table>
          </div>
          
          <div style="background-color: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #2c5aa0; margin-top: 0;">Prescription Details</h4>
            <p style="margin: 5px 0; color: #333;"><strong>Prescription ID:</strong> ${prescriptionDetails.id}</p>
            <p style="margin: 5px 0; color: #333;"><strong>Total Cost:</strong> $${prescriptionDetails.totalCost}</p>
            <p style="margin: 5px 0; color: #333;"><strong>Status:</strong> Approved</p>
          </div>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h4 style="color: #856404; margin-top: 0;">Next Steps</h4>
            <ul style="color: #856404; margin: 10px 0; padding-left: 20px;">
              <li>Contact the provider using the phone number above to schedule your appointment or arrange for service</li>
              <li>Mention your prescription ID when contacting the provider</li>
              <li>Bring a valid ID and any relevant medical documents</li>
              <li>Follow the provider's instructions for the prescribed treatment</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="color: #666; font-size: 14px; margin: 0;">
              If you have any questions or concerns, please contact our support team.
            </p>
            <p style="color: #666; font-size: 14px; margin: 5px 0;">
              Thank you for choosing First Star Consult for your healthcare needs.
            </p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Provider contact email sent successfully:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending provider contact email:", error);
    throw error;
  }
};

export { sendProviderContactEmail };


