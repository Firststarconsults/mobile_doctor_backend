// create-admin.cjs
// Script to update an existing user to admin role

const mongoose = require('mongoose');
const User = require('./models/user.js');
require('dotenv').config();

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Email of user to make admin
    const email = 'opuaye.reginald@gmail.com'; // Change this to your test user email

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found with email:', email);
      process.exit(1);
    }

    // Update user to admin
    user.role = 'admin';
    user.isAdmin = true;
    await user.save();

    console.log('✅ User updated to admin successfully!');
    console.log('Email:', user.email);
    console.log('Name:', user.firstName, user.lastName);
    console.log('Role: admin');
    console.log('isAdmin:', user.isAdmin);

  } catch (error) {
    console.error('Error updating user to admin:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
};

createAdmin();
