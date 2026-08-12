const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const connectDB = require('./db');
const User = require('../models/User');
const Department = require('../models/Department');
const Ward = require('../models/Ward');
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
      console.log(`\n  🔑 Super Admin created: ${adminEmail}`);
    } else {
      existingAdmin.password = process.env.SUPER_ADMIN_PASSWORD || 'Admin@123';
      await existingAdmin.save();
      console.log(`\n  🔄 Super Admin password reset: ${adminEmail}`);
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
    } else {
      existingCitizen.password = 'Citizen@123';
      await existingCitizen.save();
      console.log(`  🔄 Demo Citizen password reset`);
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

      // Ward Councillors
      { name: 'Srinivasan R', email: 'councillor.zone1@nagaram.city', role: ROLES.WARD_COUNCILLOR, wardNumber: 1, password: 'Councillor@123' },
      { name: 'Meenakshi Sundaram', email: 'councillor.zone2@nagaram.city', role: ROLES.WARD_COUNCILLOR, wardNumber: 2, password: 'Councillor@123' },
    ];

    for (const staff of demoStaff) {
      const existingStaff = await User.findOne({ email: staff.email });
      if (!existingStaff) {
        const dept = depts.find((d) => d.code === staff.deptCode);
        
        let wardId = undefined;
        if (staff.wardNumber) {
          const ward = await Ward.findOne({ number: staff.wardNumber });
          if (ward) wardId = ward._id;
        }

        await User.create({
          name: staff.name,
          email: staff.email,
          phone: '9876543210',
          password: staff.password,
          role: staff.role,
          department: dept?._id,
          ward: wardId,
          isActive: true,
        });
        console.log(`  🔑 Demo Staff created: ${staff.name} (${staff.email})`);
      } else {
        existingStaff.password = staff.password;
        
        if (staff.wardNumber) {
          const ward = await Ward.findOne({ number: staff.wardNumber });
          if (ward) existingStaff.ward = ward._id;
        }

        await existingStaff.save();
        console.log(`  🔄 Demo Staff password reset: ${staff.name} (${staff.email})`);
      }
    }

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

    const allDbDepts = await Department.find();

    for (const ward of chennaiWards) {
      const exists = await Ward.findOne({ number: ward.number });
      if (!exists) {
        // Assign a few random departments
        const shuffled = [...allDbDepts].sort(() => 0.5 - Math.random());
        const assignedDepts = shuffled.slice(0, Math.floor(Math.random() * 3) + 2).map(d => d._id);

        await Ward.create({
          name: ward.name,
          number: ward.number,
          population: ward.population * 1250, // mock scale
          departments: assignedDepts,
          isActive: true,
        });
        console.log(`  🏙️  Chennai Zone seeded: ${ward.name}`);
      } else if (!exists.departments || exists.departments.length === 0) {
        // Update existing ward with some departments
        const shuffled = [...allDbDepts].sort(() => 0.5 - Math.random());
        const assignedDepts = shuffled.slice(0, Math.floor(Math.random() * 3) + 2).map(d => d._id);
        exists.departments = assignedDepts;
        await exists.save();
        console.log(`  🏙️  Chennai Zone updated with departments: ${ward.name}`);
      }
    }

    // Seed Comprehensive Mock Complaints across all 8 departments and 30-day timeline
    const Complaint = require('../models/Complaint');
    await Complaint.deleteMany({}); // Reset complaints for fresh comprehensive analytics seed

    console.log('\n📋 Seeding comprehensive mock complaints for analytics...');
    const citizen = await User.findOne({ email: citizenEmail });
    
    const roadsDept = depts.find((d) => d.code === 'roads');
    const wasteDept = depts.find((d) => d.code === 'waste_management');
    const waterDept = depts.find((d) => d.code === 'water_supply');
    const powerDept = depts.find((d) => d.code === 'electrical');
    const drainDept = depts.find((d) => d.code === 'drainage');
    const saniDept = depts.find((d) => d.code === 'sanitation');
    const parksDept = depts.find((d) => d.code === 'parks');
    const genDept = depts.find((d) => d.code === 'general');

    const wasteSup = await User.findOne({ email: 'waste.supervisor@nagaram.city' });
    const wasteWork = await User.findOne({ email: 'waste.worker@nagaram.city' });
    const roadsSup = await User.findOne({ email: 'roads.supervisor@nagaram.city' });
    const roadsWork = await User.findOne({ email: 'roads.worker@nagaram.city' });

    const ward1 = await Ward.findOne({ number: 1 });
    const ward5 = await Ward.findOne({ number: 5 });
    const ward8 = await Ward.findOne({ number: 8 });
    const ward9 = await Ward.findOne({ number: 9 });
    const ward10 = await Ward.findOne({ number: 10 });
    const ward13 = await Ward.findOne({ number: 13 });

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    const mockComplaints = [
      // Waste Management
      {
        title: 'Overflowing Community Bin',
        description: 'Garbage spilling onto pedestrian walkways creating severe odor near Anna Nagar Metro.',
        category: 'overflowing_dustbin',
        priority: 'high',
        status: 'in_progress',
        citizenId: citizen?._id,
        assignedDepartment: wasteDept?._id,
        assignedSupervisor: wasteSup?._id,
        assignedWorker: wasteWork?._id,
        ward: ward8?._id,
        address: 'Anna Nagar 2nd Avenue, Zone VIII',
        gpsCoordinates: { lat: 13.085, lng: 80.2101 },
        createdAt: new Date(now - 2 * dayMs),
      },
      {
        title: 'Illegal Dumping of Construction Waste',
        description: 'Debris dumped overnight near school boundary line.',
        category: 'illegal_dumping',
        priority: 'critical',
        status: 'resolved',
        citizenId: citizen?._id,
        assignedDepartment: wasteDept?._id,
        assignedSupervisor: wasteSup?._id,
        assignedWorker: wasteWork?._id,
        ward: ward8?._id,
        address: 'Anna Nagar 5th Block, Zone VIII',
        gpsCoordinates: { lat: 13.0862, lng: 80.212 },
        resolvedAt: new Date(now - 1 * dayMs),
        createdAt: new Date(now - 4 * dayMs),
      },

      // Roads Department
      {
        title: 'Deep Hazardous Pothole near Flyover',
        description: 'Dangerous pothole causing severe traffic congestion and near-miss accidents on Guindy flyover curve.',
        category: 'road_damage',
        priority: 'critical',
        status: 'assigned',
        citizenId: citizen?._id,
        assignedDepartment: roadsDept?._id,
        assignedSupervisor: roadsSup?._id,
        assignedWorker: roadsWork?._id,
        ward: ward13?._id,
        address: 'Mount Road, Zone XIII',
        gpsCoordinates: { lat: 13.0067, lng: 80.202 },
        createdAt: new Date(now - 1 * dayMs),
      },
      {
        title: 'Damaged Speed Breaker Markings',
        description: 'Faded speed bump warning paint near blind turn.',
        category: 'road_damage',
        priority: 'medium',
        status: 'resolved',
        citizenId: citizen?._id,
        assignedDepartment: roadsDept?._id,
        ward: ward13?._id,
        address: 'Adyar Canal Bank Road, Zone XIII',
        gpsCoordinates: { lat: 13.005, lng: 80.25 },
        resolvedAt: new Date(now - 3 * dayMs),
        createdAt: new Date(now - 7 * dayMs),
      },

      // Water Supply
      {
        title: 'Main Pipeline Burst & Water Loss',
        description: 'Pressurized clean water leaking continuously across Teynampet 4th Main Road.',
        category: 'water_leakage',
        priority: 'high',
        status: 'submitted',
        citizenId: citizen?._id,
        assignedDepartment: waterDept?._id,
        ward: ward9?._id,
        address: 'Teynampet 4th Main Road, Zone IX',
        gpsCoordinates: { lat: 13.0418, lng: 80.2442 },
        createdAt: new Date(now - 5 * 60 * 60 * 1000),
      },
      {
        title: 'Low Water Pressure in Residential Colony',
        description: 'Water supply pressure dropped drastically for the past 3 days.',
        category: 'others',
        priority: 'medium',
        status: 'resolved',
        citizenId: citizen?._id,
        assignedDepartment: waterDept?._id,
        ward: ward9?._id,
        address: 'Giri Road, Teynampet, Zone IX',
        gpsCoordinates: { lat: 13.043, lng: 80.242 },
        resolvedAt: new Date(now - 2 * dayMs),
        createdAt: new Date(now - 6 * dayMs),
      },

      // Electrical Department
      {
        title: 'Row of Non-Functional Streetlights',
        description: '6 consecutive streetlights dark along Lake View Road causing nighttime safety concerns.',
        category: 'streetlight',
        priority: 'medium',
        status: 'resolved',
        citizenId: citizen?._id,
        assignedDepartment: powerDept?._id,
        ward: ward10?._id,
        address: 'Kodambakkam Lake View Road, Zone X',
        gpsCoordinates: { lat: 13.0521, lng: 80.2255 },
        resolvedAt: new Date(now - 1 * dayMs),
        createdAt: new Date(now - 3 * dayMs),
      },
      {
        title: 'Exposed Electrical Wiring on Utility Pole',
        description: 'Hanging live wire accessible near public bus stand.',
        category: 'others',
        priority: 'critical',
        status: 'in_progress',
        citizenId: citizen?._id,
        assignedDepartment: powerDept?._id,
        ward: ward10?._id,
        address: 'Arcot Road, Kodambakkam, Zone X',
        gpsCoordinates: { lat: 13.051, lng: 80.223 },
        createdAt: new Date(now - 12 * 60 * 60 * 1000),
      },

      // Drainage Department
      {
        title: 'Blocked Stormwater Drain',
        description: 'Stagnant rainwater buildup near Royapuram market due to clogged drain grates.',
        category: 'drainage_blockage',
        priority: 'high',
        status: 'submitted',
        citizenId: citizen?._id,
        assignedDepartment: drainDept?._id,
        ward: ward5?._id,
        address: 'Royapuram Main Market, Zone V',
        gpsCoordinates: { lat: 13.113, lng: 80.295 },
        createdAt: new Date(now - 1 * dayMs),
      },

      // Sanitation
      {
        title: 'Public Facility Hygiene Maintenance Required',
        description: 'Public restroom sanitization and water refill needed.',
        category: 'public_toilet',
        priority: 'medium',
        status: 'resolved',
        citizenId: citizen?._id,
        assignedDepartment: saniDept?._id,
        ward: ward1?._id,
        address: 'Thiruvottiyur High Road, Zone I',
        gpsCoordinates: { lat: 13.16, lng: 80.3 },
        resolvedAt: new Date(now - 4 * dayMs),
        createdAt: new Date(now - 8 * dayMs),
      },

      // Parks & Recreation
      {
        title: 'Fallen Tree Branch Blocking Park Pathway',
        description: 'Heavy bough broken during rainstorm blocking main walking track.',
        category: 'park_maintenance',
        priority: 'low',
        status: 'resolved',
        citizenId: citizen?._id,
        assignedDepartment: parksDept?._id,
        ward: ward8?._id,
        address: 'Tower Park, Anna Nagar, Zone VIII',
        gpsCoordinates: { lat: 13.087, lng: 80.211 },
        resolvedAt: new Date(now - 5 * dayMs),
        createdAt: new Date(now - 10 * dayMs),
      },

      // General Civic
      {
        title: 'Unclaimed Signboard Structure',
        description: 'Rusted commercial sign pole leaning dangerously towards road.',
        category: 'general',
        priority: 'low',
        status: 'submitted',
        citizenId: citizen?._id,
        assignedDepartment: genDept?._id,
        ward: ward13?._id,
        address: 'LB Road, Adyar, Zone XIII',
        gpsCoordinates: { lat: 13.004, lng: 80.255 },
        createdAt: new Date(now - 3 * 60 * 60 * 1000),
      },
    ];

    for (const comp of mockComplaints) {
      await Complaint.create(comp);
    }
    console.log(`  ✅ ${mockComplaints.length} analytics-connected complaints seeded across all departments!`);

    // Seed Dustbins
    const Dustbin = require('../models/Dustbin');
    await Dustbin.deleteMany({});
    console.log('\n📋 Seeding mock dustbins...');
    
    const mockDustbins = [
      {
        gpsCoordinates: { lat: 13.0855, lng: 80.2105 },
        address: 'Anna Nagar Tower Park entrance',
        capacity: 80,
        lastCleanedAt: new Date(now - 2 * dayMs),
        department: wasteDept?._id,
        ward: ward8?._id,
      },
      {
        gpsCoordinates: { lat: 13.006, lng: 80.252 },
        address: 'Adyar Bus Depot',
        capacity: 45,
        lastCleanedAt: new Date(now - 12 * 60 * 60 * 1000),
        cleanedBy: wasteWork?._id,
        department: wasteDept?._id,
        ward: ward13?._id,
      },
      {
        gpsCoordinates: { lat: 13.042, lng: 80.245 },
        address: 'Teynampet signal',
        capacity: 10,
        lastCleanedAt: new Date(now - 2 * 60 * 60 * 1000),
        cleanedBy: wasteWork?._id,
        department: wasteDept?._id,
        ward: ward9?._id,
      },
    ];

    for (const bin of mockDustbins) {
      await Dustbin.create(bin);
    }
    console.log(`  ✅ ${mockDustbins.length} dustbins seeded!`);

    console.log('\n✅ Seed complete!\n');
  } catch (error) {
    console.error('❌ Seed error:', error.message);
  }
};

if (require.main === module) {
  seed().then(() => process.exit(0));
}

module.exports = seed;
