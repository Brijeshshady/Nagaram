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
        name: 'Rohan Sharma',
        email: citizenEmail,
        phone: '8888888888',
        password: 'Citizen@123',
        role: ROLES.CITIZEN,
        isActive: true,
        rewardPoints: 120,
      });
      console.log(`  🔑 Demo Citizen created: Rohan Sharma`);
    }

    // Seed Department-wise Demo Users
    const depts = await Department.find();
    
    const demoStaff = [
      // Waste Management
      { name: 'Karan Malhotra', email: 'waste.manager@nagaram.city', role: ROLES.DEPT_MANAGER, deptCode: 'waste_management', password: 'Manager@123' },
      { name: 'Rajesh Kumar', email: 'waste.supervisor@nagaram.city', role: ROLES.SUPERVISOR, deptCode: 'waste_management', password: 'Supervisor@123' },
      { name: 'Madan Lal', email: 'waste.worker@nagaram.city', role: ROLES.FIELD_WORKER, deptCode: 'waste_management', password: 'Worker@123' },

      // Roads
      { name: 'Sunita Rao', email: 'roads.manager@nagaram.city', role: ROLES.DEPT_MANAGER, deptCode: 'roads', password: 'Manager@123' },
      { name: 'Vikram Singh', email: 'roads.supervisor@nagaram.city', role: ROLES.SUPERVISOR, deptCode: 'roads', password: 'Supervisor@123' },
      { name: 'Gopal Dutt', email: 'roads.worker@nagaram.city', role: ROLES.FIELD_WORKER, deptCode: 'roads', password: 'Worker@123' },

      // Water Supply
      { name: 'Alok Gupta', email: 'water.manager@nagaram.city', role: ROLES.DEPT_MANAGER, deptCode: 'water_supply', password: 'Manager@123' },
      { name: 'Sanjay Dutt', email: 'water.supervisor@nagaram.city', role: ROLES.SUPERVISOR, deptCode: 'water_supply', password: 'Supervisor@123' },
      { name: 'Ramesh Pal', email: 'water.worker@nagaram.city', role: ROLES.FIELD_WORKER, deptCode: 'water_supply', password: 'Worker@123' },

      // Electrical
      { name: 'Neha Joshi', email: 'power.manager@nagaram.city', role: ROLES.DEPT_MANAGER, deptCode: 'electrical', password: 'Manager@123' },
      { name: 'anil sharma', email: 'power.supervisor@nagaram.city', role: ROLES.SUPERVISOR, deptCode: 'electrical', password: 'Supervisor@123' },
      { name: 'Vijay Ram', email: 'power.worker@nagaram.city', role: ROLES.FIELD_WORKER, deptCode: 'electrical', password: 'Worker@123' },
    ];

    // Seed Greater Chennai Corporation Wards/Zones
    const chennaiWards = [
      { name: 'THIRUVOTRIYUR (Zone I)', number: 1, population: 14 },
      { name: 'MANALI (Zone II)', number: 2, population: 21 },
      { name: 'MADHAVARAM (Zone III)', number: 3, population: 33 },
      { name: 'TONDIARPET (Zone IV)', number: 4, population: 48 },
      { name: 'ROYAPURAM (Zone V)', number: 5, population: 63 },
      { name: 'THIRU-VI-KA NAGAR (Zone VI)', number: 6, population: 78 },
      { name: 'AMBATTUR (Zone VII)', number: 7, population: 93 },
      { name: 'ANNA NAGAR (Zone VIII)', number: 8, population: 108 },
      { name: 'TEYNAMPET (Zone IX)', number: 9, population: 126 },
      { name: 'KODAMBAKKAM (Zone X)', number: 10, population: 142 },
      { name: 'VALASARAVAKKAM (Zone XI)', number: 11, population: 155 },
      { name: 'ALANDUR (Zone XII)', number: 12, population: 167 },
      { name: 'ADYAR (Zone XIII)', number: 13, population: 182 },
      { name: 'PERUNGUDI (Zone XIV)', number: 14, population: 191 },
      { name: 'SOZHANGANALLUR (Zone XV)', number: 15, population: 200 },
    ];

    const Ward = require('../models/Ward');
    for (const ward of chennaiWards) {
      const exists = await Ward.findOne({ number: ward.number });
      if (!exists) {
        await Ward.create({
          name: ward.name,
          number: ward.number,
          population: ward.population * 1250, // mock scale
          isActive: true,
        });
        console.log(`  🏙️  Chennai Zone seeded: ${ward.name}`);
      }
    }

    console.log('\n✅ Seed complete!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error.message);
    process.exit(1);
  }
};

seed();
