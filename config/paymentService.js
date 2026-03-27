//config/paymentService.js
import axios from 'axios';
import User from '../models/user.js'; 

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

const paystack = axios.create({
  baseURL: 'https://api.paystack.co',
  headers: {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json',
  },
});

export async function chargePatient(email, amount) {
  // Convert amount to kobo for Paystack (e.g., NGN 100 = 10000 kobo)
  const body = {
    email: email,
    amount: amount * 100,
    currency: "NGN",
  };

  try {
    const response = await paystack.post('/transaction/initialize', body);
    return response.data.data.authorization_url; // Direct user to this URL to complete payment
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function verifyTransaction(reference) {
  try {
    const response = await paystack.get(`/transaction/verify/${reference}`);
    // Paystack transaction verification response
    const data = response.data.data;

    if (data.status === 'success') {
      // Transaction was successful
      return { success: true, data };
    } else {
      // Transaction was not successful
      return { success: false, message: 'Transaction not successful' };
    }
  } catch (error) {
    console.error(error);
    // An error occurred during the verification process
    return { success: false, message: error.response?.data?.message || error.message };
  }
}

export async function validateAccountNumber(account_number, bank_code) {
  try {
    console.log(`Validating account number: ${account_number} with bank code: ${bank_code}`);
    const response = await paystack.get(`/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`);
    
    if (response.data.data) {
      console.log('Account validation successful:', response.data.data);
      return response.data.data;
    } else {
      console.log('Account validation returned no data.');
      throw new Error('Account validation returned no data.');
    }
  } catch (error) {
    console.error('Error validating account number:', {
      account_number,
      bank_code,
      error: error.response?.data || error.message
    });
    throw error;
  }
}



export async function creditWallet(email, amount) {
    try {
      // Find the user by email
      const user = await User.findOne({ email: email });
      if (!user) {
        throw new Error('User not found');
      }
  
      // Convert amount to the appropriate unit if necessary (e.g., NGN 100 = 10000 kobo)
      // Assuming amount is already in the correct unit here
  
      // Update the user's wallet balance
      user.walletBalance = (user.walletBalance || 0) + amount; // Ensure there's a default value
  
      // Save the updated user
      await user.save();
  
      // Return a success response or the updated user object
      return { success: true, message: 'Wallet credited successfully', user: user };
    } catch (error) {
      console.error('Error crediting wallet:', error);
      return { success: false, message: error.message };
    }
  }

  

  export async function createTransferRecipient(name, accountNumber, bankCode) {
    try {
      const body = {
        type: "nuban",
        name: name,
        account_number: accountNumber,
        bank_code: bankCode,
        currency: "NGN"
      };
      const response = await paystack.post('/transferrecipient', body);
      console.log('Response:', response.data);
      return response.data.data; // Contains recipient_code needed for transfer
    } catch (error) {
      console.error('Error creating transfer recipient:', error);
      return null;
    }
  }


export async function submitOtpForTransfer(otp, transferCode) {
  try {
    const body = {
      otp: otp,
      transfer_code: transferCode,
    };

    console.log('=== PAYSTACK OTP REQUEST ===');
    console.log('Transfer Code:', transferCode);
    console.log('OTP Provided:', otp);
    console.log('Timestamp:', new Date().toISOString());

    const response = await paystack.post('/transfer/finalize_transfer', body);
    
    console.log('=== PAYSTACK OTP RESPONSE ===');
    console.log('Response Status:', response.status);
    console.log('Response Status Text:', response.statusText);
    console.log('Response Data:', JSON.stringify(response.data, null, 2));
    console.log('Timestamp:', new Date().toISOString());
    console.log('===============================');
       
    if (response.data.status === true) {
      return { success: true, message: 'Transfer successful', data: response.data.data };
    } else {
      return { success: false, message: response.data.message };
    }
  } catch (error) {
    console.error('=== PAYSTACK OTP ERROR ===');
    console.error('Transfer Code:', transferCode);
    console.error('Error Message:', error.message);
    console.error('Error Response:', error.response?.data ? JSON.stringify(error.response.data, null, 2) : 'No response data');
    console.error('Error Status:', error.response?.status);
    console.error('Timestamp:', new Date().toISOString());
    console.error('============================');
    
    return { success: false, message: error.response?.data?.message || error.message };
  }
}

  
  export async function initiateTransfer(amount, recipientCode) {
    try {
      const body = {
        source: "balance", // Transfer from your Paystack balance
        amount: amount * 100, // Convert amount to kobo
        recipient: recipientCode,
        reason: "Withdrawal from Wallet" // This can be any reason
      };
      const response = await paystack.post('/transfer', body);
      return response.data.data; // Contains transfer details
    } catch (error) {
      console.error('Error initiating transfer:', error);
      return null;
    }
  }

// Add this function to your paymentService.js file
export const verifyTransfer = async (reference) => {
  try {
    const response = await axios.get(
      `https://api.paystack.co/transfer/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    if (response.data.status) {
      return {
        success: true,
        data: response.data.data,
      };
    } else {
      return {
        success: false,
        message: response.data.message,
      };
    }
  } catch (error) {
    console.error("Error verifying transfer:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || "Error verifying transfer",
    };
  }
};
  

// Add the checkTransferStatus function to check the status of a transfer
export const checkTransferStatus = async (transferCode) => {
  try {
    const response = await paystack.get(`/transfer/${transferCode}`);
    
    if (response.data.status === true) {
      return {
        success: true,
        data: response.data.data,
        status: response.data.data.status
      };
    } else {
      return {
        success: false,
        message: response.data.message
      };
    }
  } catch (error) {
    console.error('Error checking transfer status:', error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || 'Error checking transfer status'
    };
  }
};
  
