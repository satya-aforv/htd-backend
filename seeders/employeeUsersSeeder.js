import mongoose from 'mongoose';
import User from '../models/User.js';

const users = [
  { employeeNumber: 'MMPL-001', name: 'B SHESHADRI NAIDU', contactNumber: '9986738299', gender: 'MALE', designation: 'MANAGING DIRECTOR & FOUNDER', location: 'BANGALORE' },
  { employeeNumber: 'MMPL-002', name: 'MANJUNATH D', contactNumber: '9964945024', gender: 'MALE', designation: 'LOGISTICS MANAGER', location: 'BANGALORE' },
  { employeeNumber: 'MMPL-003', name: 'SREENIVASULU C', contactNumber: '9989670974', gender: 'MALE', designation: 'Inventory Manager', location: 'BANGALORE' },
  { employeeNumber: 'MMPL-005', name: 'K RAVI KUMAR', contactNumber: '8317492851', gender: 'MALE', designation: 'AREA CLINICAL SPECIALIST', location: 'BANGALORE' },
  { employeeNumber: 'MMPL-008', name: 'PRIYANKA D', contactNumber: '9481606841', gender: 'FEMALE', designation: 'ACCOUNTS EXECUTIVE', location: 'BANGALORE' },
  { employeeNumber: 'MMPL-009', name: 'MADAN B N', contactNumber: '9900234786', gender: 'MALE', designation: 'LOGISTICS AND SUPPLY', location: 'BANGALORE' },
  { employeeNumber: 'MMPL-010', name: 'VENKATA KRISHNA P', contactNumber: '9916895825', gender: 'MALE', designation: 'REGIONAL SALES MANAGER', location: 'BANGALORE' },
  { employeeNumber: 'MMPL-011', name: 'SHILPA D S', contactNumber: '7406409563', gender: 'FEMALE', designation: 'ACCOUNTS EXECUTIVE', location: 'BANGALORE' },
  { employeeNumber: 'MMPL-012', name: 'MOHAMMED TOUSEEF', contactNumber: '9538585752', gender: 'MALE', designation: 'LOGISTICS AND SUPPLY', location: 'BANGALORE' },
  { employeeNumber: 'MMPL-013', name: 'DHYANI H S', contactNumber: '8152060539', gender: 'MALE', designation: 'LOGISTICS AND SUPPLY', location: 'BANGALORE' },
  { employeeNumber: 'MMPL-014', name: 'KIRAN', contactNumber: '8139944387', gender: 'MALE', designation: 'LOGISTICS AND SUPPLY', location: 'BANGALORE' },
  { employeeNumber: 'MMPL-015', name: 'PAVAN KUMAR N', contactNumber: '9741071456', gender: 'MALE', designation: 'AREA SALES MANAGER', location: 'BANGALORE' },
  { employeeNumber: 'MMPL-020', name: 'GAJBAREE SANTOSH KUMAR', contactNumber: '6301624486', gender: 'MALE', designation: 'LOGISTICS AND SUPPLY', location: 'HYDERABAD' },
  { employeeNumber: 'MMPL-022', name: 'KARTHIK', contactNumber: '9535054196', gender: 'MALE', designation: 'LOGISTICS AND SUPPLY', location: 'BANGALORE' },
  { employeeNumber: 'MMPL-025', name: 'YOGESH', contactNumber: '9738006806', gender: 'MALE', designation: 'LOGISTICS AND SUPPLY', location: 'MYSORE' },
  { employeeNumber: 'MMPL-026', name: 'SANJAY KUMAR JENA', contactNumber: '6361650755', gender: 'MALE', designation: 'LOGISTICS AND SUPPLY', location: 'BANGALORE' },
  { employeeNumber: 'MMPL-027', name: 'JAMPALA SAMBA SIVA', contactNumber: '9700049349', gender: 'MALE', designation: 'LOGISTICS AND SUPPLY', location: 'BANGALORE' },
  { employeeNumber: 'MMPL-028', name: 'MANJUNATH SUBRAMANI', contactNumber: '9980069343', gender: 'MALE', designation: 'OPERATIONS HEAD', location: 'BANGALORE' },
];

const DEFAULT_PASSWORD = 'password123';

async function seed() {
  await mongoose.connect('mongodb://localhost:27017/dms', { useNewUrlParser: true, useUnifiedTopology: true });
  for (const u of users) {
    const email = `${u.employeeNumber.toLowerCase()}@company.com`;
    const exists = await User.findOne({ $or: [ { employeeNumber: u.employeeNumber }, { email } ] });
    if (exists) {
      console.log(`User ${u.employeeNumber} already exists, skipping.`);
      continue;
    }
    const user = new User({
      name: u.name,
      email,
      password: DEFAULT_PASSWORD,
      isActive: true,
      designation: u.designation,
      employeeNumber: u.employeeNumber,
      contactNumber: u.contactNumber,
      gender: u.gender,
      location: u.location,
    });
    await user.save();
    console.log(`User ${u.employeeNumber} created.`);
  }
  await mongoose.disconnect();
  console.log('Seeding complete.');
}

seed().catch(e => { console.error(e); process.exit(1); }); 