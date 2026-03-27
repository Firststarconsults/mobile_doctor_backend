//utils/verificationGenerator.js


export const generateVerificationCode = () => {
    // Generate a 6-digit code
    return Math.floor(100000 + Math.random() * 9000).toString();
  };
  