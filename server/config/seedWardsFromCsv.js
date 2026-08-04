const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Ward = require('../models/Ward');
const connectDB = require('./db');

const seedWardsFromCsv = async () => {
  try {
    await connectDB();
    console.log('🌱 Connected to MongoDB Atlas cluster...');

    const csvPath = path.join(__dirname, '../../WARD_DETAILS_IN_MUNICIPALITIES.csv');
    if (!fs.existsSync(csvPath)) {
      console.error(`❌ CSV file not found at: ${csvPath}`);
      process.exit(1);
    }

    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim() !== '');

    console.log(`📊 Processing ${lines.length - 1} municipalities...`);

    let seededCount = 0;
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts.length < 3) continue;

      const grade = parts[0].trim();
      const ulbName = parts[1].trim();
      const totalWards = parseInt(parts[2].trim()) || 0;

      // Find if this municipality already exists as a Ward
      const exists = await Ward.findOne({ name: `${ulbName} Municipality` });
      if (!exists) {
        await Ward.create({
          name: `${ulbName} Municipality`,
          number: 100 + i, // Offset ward number to avoid conflict with Chennai Zones
          population: totalWards * 1850, // mock population based on ward count
          isActive: true,
        });
        seededCount++;
      }
    }

    console.log(`\n✅ Seeding complete! Added ${seededCount} new municipalities.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seedWardsFromCsv();
