const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const connectDB = require('./db');
const User = require('../models/User');
const Department = require('../models/Department');
const { ROLES } = require('./permissions');

const DEFAULT_DEPARTMENTS = [
  { name: 'Waste Management', code: 'waste_management', description: 'Garbage collection, dustbin management, illegal dumping' },
  { name: 'Roads Department', code: 'roads', description: 'Road maintenance, pothole repair, road construction' },
  { name: 'Water Supply', code: 'water_supply', description: 'Water distribution, pipe maintenance, leak repair' },
  { name: 'Electrical Department', code: 'electrical', description: 'Streetlights, power infrastructure, electrical maintenance' },
  { name: 'Drainage Department', code: 'drainage', description: 'Drainage systems, sewage management, flood control' },
  { name: 'Sanitation', code: 'sanitation', description: 'Public toilets, hygiene, cleanliness' },
  { name: 'Parks & Recreation', code: 'parks', description: 'Park maintenance, gardens, playgrounds' },
  { name: 'General', code: 'general', description: 'General civic issues and miscellaneous' },
];

const seed = async () => {
  try {
    await connectDB();
    console.log('\n🌱 Starting Nagaram seed...\n');

    // Seed Departments
    for (const dept of DEFAULT_DEPARTMENTS) {
      const exists = await Department.findOne({ code: dept.code });
      if (!exists) {
        await Department.create(dept);
        console.log(`  ✅ Department created: ${dept.name}`);
      } else {
        console.log(`  ⏭️  Department exists: ${dept.name}`);
      }
    }

    // Seed Super Admin
    const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@nagaram.city';
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (!existingAdmin) {
      await User.create({
        name: process.env.SUPER_ADMIN_NAME || 'Municipal Administrator',
        email: adminEmail,
        phone: process.env.SUPER_ADMIN_PHONE || '9999999999',
        password: process.env.SUPER_ADMIN_PASSWORD || 'Admin@123',
        role: ROLES.SUPER_ADMIN,
        isActive: true,
      });
      console.log(`\n  🔑 Super Admin created:`);
      console.log(`     Email: ${adminEmail}`);
      console.log(`     Password: ${process.env.SUPER_ADMIN_PASSWORD || 'Admin@123'}`);
    } else {
      console.log(`\n  ⏭️  Super Admin already exists: ${adminEmail}`);
    }

    // Seed Demo Citizen
    const citizenEmail = 'citizen@nagaram.city';
    const existingCitizen = await User.findOne({ email: citizenEmail });

    if (!existingCitizen) {
      await User.create({
        name: 'Demo Citizen',
        email: citizenEmail,
        phone: '8888888888',
        password: 'Citizen@123',
        role: ROLES.CITIZEN,
        isActive: true,
        rewardPoints: 120,
      });
      console.log(`  🔑 Demo Citizen created:`);
      console.log(`     Email: ${citizenEmail}`);
      console.log(`     Password: Citizen@123`);
    } else {
      console.log(`  ⏭️  Demo Citizen already exists: ${citizenEmail}`);
    }

    console.log('\n✅ Seed complete!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error.message);
    process.exit(1);
  }
};

seed();
