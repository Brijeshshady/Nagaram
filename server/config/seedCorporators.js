const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('./db');
const User = require('../models/User');
const Ward = require('../models/Ward');
const Department = require('../models/Department');
const { ROLES } = require('./permissions');

const CSV_PATH = 'c:\\Users\\brije\\Desktop\\GDP\\Nagaram\\e6da6bbc-abab-4ebe-8f02-6732c3818bf3.csv';

const run = async () => {
  try {
    await connectDB();
    console.log('Connected to database...');

    const fileContent = fs.readFileSync(CSV_PATH, 'utf8');
    const lines = fileContent.split('\n');

    const depts = await Department.find();
    if (depts.length === 0) {
      console.error('No departments found. Please run the main seed script first.');
      process.exit(1);
    }

    console.log(`Parsing CSV with ${lines.length - 1} data rows...`);

    let createdWardsCount = 0;
    let createdCouncillorsCount = 0;

    // Start from line 1 (skip header)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(',');
      if (parts.length < 5) continue;

      const [id, wardNumStr, corporator, contact, email] = parts;
      const wardNum = parseInt(wardNumStr);

      if (isNaN(wardNum)) continue;

      // Find or create Ward
      let ward = await Ward.findOne({ number: wardNum });
      if (!ward) {
        // Assign a few random departments
        const shuffled = [...depts].sort(() => 0.5 - Math.random());
        const assignedDepts = shuffled.slice(0, Math.floor(Math.random() * 3) + 2).map(d => d._id);
        
        ward = await Ward.create({
          name: `Ward ${wardNum}`,
          number: wardNum,
          population: Math.floor(Math.random() * 30000) + 15000,
          departments: assignedDepts,
          isActive: true
        });
        createdWardsCount++;
      }

      // Find or create Councillor User
      const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
      if (!existingUser) {
        await User.create({
          name: corporator.trim(),
          email: email.toLowerCase().trim(),
          phone: contact.trim(),
          password: 'Councillor@123',
          role: ROLES.WARD_COUNCILLOR,
          ward: ward._id,
          isActive: true
        });
        createdCouncillorsCount++;
      } else {
        existingUser.ward = ward._id;
        existingUser.phone = contact.trim();
        existingUser.name = corporator.trim();
        existingUser.role = ROLES.WARD_COUNCILLOR;
        await existingUser.save();
      }
    }

    console.log(`Seeding complete!`);
    console.log(`Created Wards: ${createdWardsCount}`);
    console.log(`Created Councillors: ${createdCouncillorsCount}`);
    process.exit(0);
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  }
};

run();
