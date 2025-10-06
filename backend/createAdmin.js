require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const createAdmin = async () => {
  try {
    // Connect to the database
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected...');

    // Admin user details
    const adminEmail = 'megatron@gmail.com';
    const adminPassword = 'megapass123';

    // Check if admin user already exists and delete them
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      await User.deleteOne({ email: adminEmail });
      console.log('Existing admin user deleted.');
    }

    // Create the new admin user with the plain-text password
    const newAdmin = new User({
      name: 'Admin',
      email: adminEmail,
      password: adminPassword, // The pre-save hook will hash this
      isAdmin: true,
    });

    // Save the user to the database
    await newAdmin.save();
    console.log('Admin user created successfully!');

  } catch (error) {
    console.error('Error creating admin user:', error.message);
  } finally {
    // Disconnect from the database
    mongoose.connection.close();
    console.log('MongoDB connection closed.');
  }
};

createAdmin();
