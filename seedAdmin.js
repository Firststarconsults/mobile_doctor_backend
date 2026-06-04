import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// Define a minimal User schema to match your backend
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String },
  lastName: { type: String },
  role: { type: String, default: 'patient' },
  isVerified: { type: Boolean, default: false },
});

const User = mongoose.model('User', UserSchema);

async function seedAdmin() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected successfully!');

    const adminEmail = 'admin@mobile-doctor.com';
    const adminPassword = 'AdminPassword123!'; // CHANGE THIS LATER

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log('Admin account already exists. Skipping creation.');
      return;
    }

    console.log('Creating admin account...');
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const admin = new User({
      email: adminEmail,
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Administrator',
      role: 'admin',
      isVerified: true,
    });

    await admin.save();
    console.log('--------------------------------------------------');
    console.log('✅ Admin account created successfully!');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log('--------------------------------------------------');
    console.log('You can now use these credentials to log in to the dashboard.');

  } catch (error) {
    console.error('❌ Error seeding admin:', error);
  } finally {
    await mongoose.connection.close();
  }
}

seedAdmin();