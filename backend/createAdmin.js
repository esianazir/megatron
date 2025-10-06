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

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log('Admin user already exists.');
      return;
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    // Create the new admin user
    const newAdmin = new User({
      name: 'Admin',
      email: adminEmail,
      password: hashedPassword,
      isAdmin: true, // Set the user as an admin
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
