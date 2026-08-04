const mongoose = require('mongoose');
const User = require('../models/User');
const Complaint = require('../models/Complaint');
const Department = require('../models/Department');
const Ward = require('../models/Ward');
const Announcement = require('../models/Announcement');
const connectDB = require('./db');

const mockComplaintsData = [
  {
    title: 'Water Leakage in Main pipeline',
    description: 'Fresh water gushing out of the pipe near the main junction. Causing road erosion.',
    category: 'water_supply',
    priority: 'high',
    status: 'in_progress',
    address: 'Anna Nagar Junction, Chennai',
    gpsCoordinates: { lat: 13.0850, lng: 80.2100 }
  },
  {
    title: 'Litter pile near trash bin',
    description: 'Trash has not been cleared for three days. Foul smell spreading in neighborhood.',
    category: 'waste_management',
    priority: 'medium',
    status: 'submitted',
    address: 'T-Nagar Commercial Hub, Chennai',
    gpsCoordinates: { lat: 13.0405, lng: 80.2337 }
  },
  {
    title: 'Damaged potholes on street',
    description: 'Deep potholes causing vehicle damage and traffic issues.',
    category: 'roads',
    priority: 'critical',
    status: 'assigned',
    address: 'Central Terminus Zone, Chennai',
    gpsCoordinates: { lat: 13.0827, lng: 80.2707 }
  },
  {
    title: 'Flickering street light hazard',
    description: 'Street light near block 4 flickering, causing poor visibility.',
    category: 'electrical',
    priority: 'low',
    status: 'resolved',
    address: 'Adyar Residential Sector, Chennai',
    gpsCoordinates: { lat: 12.9800, lng: 80.2300 }
  },
  {
    title: 'Overflowing Sewage Line',
    description: 'Drainage water overflowing onto road near school entrance.',
    category: 'drainage',
    priority: 'critical',
    status: 'escalated',
    address: 'Thiruvotriyur Industrial Zone, Chennai',
    gpsCoordinates: { lat: 13.1200, lng: 80.3000 }
  }
];

const seedMockData = async () => {
  try {
    await connectDB();
    console.log('🌱 Connected to MongoDB Atlas cluster...');

    // Get seeded departments, wards, and staff
    const departments = await Department.find();
    const wards = await Ward.find();
    
    const citizen = await User.findOne({ role: 'citizen' });
    const manager = await User.findOne({ role: 'dept_manager' });
    const supervisor = await User.findOne({ role: 'supervisor' });
    const worker = await User.findOne({ role: 'field_worker' });

    if (!citizen || !manager) {
      console.log('⚠️ Base users not found. Run "npm run seed" first.');
      process.exit(1);
    }

    console.log('🗑️ Cleaning old complaints...');
    await Complaint.deleteMany({});
    await Announcement.deleteMany({});

    console.log('📦 Seeding new mock complaints & histories...');
    let counter = 1000;
    
    for (const mock of mockComplaintsData) {
      const dept = departments.find(d => d.code === mock.category) || departments[0];
      const ward = wards[Math.floor(Math.random() * wards.length)] || wards[0];
      
      counter++;
      const complaintId = `CMP-${counter}`;

      // Create complaint
      const complaint = await Complaint.create({
        complaintId,
        title: mock.title,
        description: mock.description,
        category: mock.category,
        priority: mock.priority,
        status: mock.status,
        address: mock.address,
        gpsCoordinates: mock.gpsCoordinates,
        citizenId: citizen._id,
        departmentId: dept._id,
        ward: ward ? ward._id : null,
        assignedWorker: worker ? worker._id : null,
        assignedSupervisor: supervisor ? supervisor._id : null,
        statusHistory: [
          {
            status: 'submitted',
            message: 'Complaint submitted by citizen.',
            changedBy: citizen._id,
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
          }
        ]
      });

      // Add state transitions for active/resolved items
      if (['assigned', 'in_progress', 'resolved'].includes(mock.status)) {
        complaint.statusHistory.push({
          status: 'assigned',
          note: 'Complaint assigned to supervisor and field team.',
          changedBy: manager._id,
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        });
      }

      if (['in_progress', 'resolved'].includes(mock.status)) {
        complaint.statusHistory.push({
          status: 'in_progress',
          note: 'Work commenced on site.',
          changedBy: supervisor._id,
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        });
      }

      if (mock.status === 'resolved') {
        complaint.statusHistory.push({
          status: 'resolved',
          note: 'Issue resolved. Clean up completed.',
          changedBy: worker._id,
          timestamp: new Date()
        });
      }

      await complaint.save();
      console.log(`  ➕ Seeded: ${complaintId} (${mock.title})`);
    }

    const admin = await User.findOne({ role: 'super_admin' });

    console.log('📢 Seeding mock system announcements...');
    await Announcement.create([
      {
        title: 'Monsoon Cleanliness Campaign Initiated',
        content: 'Greater Chennai Corporation has launched a monsoon clean-up drive. Ensure drainage pipelines near your blocks are clear.',
        targetRoles: ['citizen', 'dept_manager', 'supervisor', 'field_worker'],
        isActive: true,
        createdBy: admin ? admin._id : manager._id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
      {
        title: 'Weekly Performance Review Meeting',
        content: 'All department managers and field supervisors are requested to join the review meeting on Friday at 10:00 AM.',
        targetRoles: ['dept_manager', 'supervisor'],
        isActive: true,
        createdBy: admin ? admin._id : manager._id,
        expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
      }
    ]);
    console.log('  ➕ Seeded mock announcements.');

    console.log('\n✅ Mock Seeding Complete!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seedMockData();
