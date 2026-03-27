import { transferBalance } from './transerBalance.js';

export const calculateFeesAndTransfer = async (patientId, providerId, amount, adminId) => {
  try {
    // Validate inputs
    if (!patientId || !providerId || !amount) {
      console.error('Missing required parameters for transfer:', { patientId, providerId, amount });
      throw new Error('Missing required parameters for transfer');
    }
    
    // Validate adminId
    if (!adminId) {
      console.error('Admin ID is missing, attempting to find an admin user');
      const User = (await import('../models/user.js')).default;
      const adminUser = await User.findOne({ role: 'admin' });
      
      if (!adminUser) {
        console.error('No admin user found in the database');
        throw new Error('Admin user not found');
      }
      
      adminId = adminUser._id;
      console.log('Found admin user with ID:', adminId);
    } else {
      // Verify that the admin user exists
      const User = (await import('../models/user.js')).default;
      const adminUser = await User.findById(adminId);
      
      if (!adminUser) {
        console.error(`Admin user with ID ${adminId} not found in the database`);
        // Try to find any admin user
        const fallbackAdmin = await User.findOne({ role: 'admin' });
        
        if (!fallbackAdmin) {
          console.error('No admin user found in the database');
          throw new Error('Admin user not found');
        }
        
        adminId = fallbackAdmin._id;
        console.log('Found fallback admin user with ID:', adminId);
      }
    }
    
    if (!adminId) {
      console.error('Admin ID is missing, attempting to find an admin user');
      const User = (await import('../models/user.js')).default;
      const adminUser = await User.findOne({ role: 'admin' });
      
      if (!adminUser) {
        console.error('No admin user found in the database');
        throw new Error('Admin user not found');
      }
      
      adminId = adminUser._id;
      console.log('Found admin user with ID:', adminId);
    }

    const providerFeePercentage = 0.95; // 95% to provider
    const adminFeePercentage = 0.05; // 5% to admin

    const providerFee = Math.round(amount * providerFeePercentage * 100) / 100;
    const adminFee = Math.round(amount * adminFeePercentage * 100) / 100;

    console.log('Transfer balance parameters:', {
      patientId,
      providerId,
      providerFee,
      adminId
    });

    console.log('Transfer admin fee parameters:', {
      patientId,
      adminId,
      adminFee
    });

    // Transfer to provider
    const providerTransferResult = await transferBalance(patientId, providerId, providerFee, 0, adminId);
    console.log('Provider transfer result:', providerTransferResult);
    
    // Transfer admin fee
    const adminTransferResult = await transferBalance(patientId, adminId, adminFee, 0, adminId);
    console.log('Admin transfer result:', adminTransferResult);

    return { providerTransferResult, adminTransferResult };
  } catch (error) {
    console.error('Error in fee calculation or transfer:', error);
    throw error; // Re-throw the error so it can be caught by the caller
  }
};
