import mongoose from 'mongoose';
import State from '../models/State.js';
import User from '../models/User.js';
import connectDB from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

// Indian states data - simplified version
const indianStates = [
  // Major States
  {
    name: 'Andhra Pradesh',
    code: 'AP',
    country: 'India',
    capital: 'Amaravati',
    population: 49386799,
    area: 162968,
    isActive: true
  },
  {
    name: 'Bihar',
    code: 'BR', 
    country: 'India',
    capital: 'Patna',
    population: 104099452,
    area: 94163,
    isActive: true
  },
  {
    name: 'Gujarat',
    code: 'GJ',
    country: 'India', 
    capital: 'Gandhinagar',
    population: 60439692,
    area: 196244,
    isActive: true
  },
  {
    name: 'Karnataka',
    code: 'KA',
    country: 'India',
    capital: 'Bengaluru', 
    population: 61095297,
    area: 191791,
    isActive: true
  },
  {
    name: 'Kerala',
    code: 'KL',
    country: 'India',
    capital: 'Thiruvananthapuram',
    population: 33406061, 
    area: 38852,
    isActive: true
  },
  {
    name: 'Madhya Pradesh',
    code: 'MP',
    country: 'India',
    capital: 'Bhopal',
    population: 72626809,
    area: 308245,
    isActive: true
  },
  {
    name: 'Maharashtra', 
    code: 'MH',
    country: 'India',
    capital: 'Mumbai',
    population: 112374333,
    area: 307713,
    isActive: true
  },
  {
    name: 'Odisha',
    code: 'OR',
    country: 'India', 
    capital: 'Bhubaneswar',
    population: 42009051,
    area: 155707,
    isActive: true
  },
  {
    name: 'Punjab',
    code: 'PB',
    country: 'India',
    capital: 'Chandigarh',
    population: 27743338,
    area: 50362,
    isActive: true
  },
  {
    name: 'Rajasthan',
    code: 'RJ',
    country: 'India',
    capital: 'Jaipur', 
    population: 68548437,
    area: 342239,
    isActive: true
  },
  {
    name: 'Tamil Nadu',
    code: 'TN',
    country: 'India',
    capital: 'Chennai',
    population: 72147030,
    area: 130060,
    isActive: true
  },
  {
    name: 'Telangana',
    code: 'TS',
    country: 'India',
    capital: 'Hyderabad',
    population: 35003674,
    area: 112077,
    isActive: true
  },
  {
    name: 'Uttar Pradesh', 
    code: 'UP',
    country: 'India',
    capital: 'Lucknow',
    population: 199812341,
    area: 240928,
    isActive: true
  },
  {
    name: 'West Bengal',
    code: 'WB',
    country: 'India',
    capital: 'Kolkata',
    population: 91276115,
    area: 88752,
    isActive: true
  },
  {
    name: 'Assam',
    code: 'AS',
    country: 'India',
    capital: 'Dispur',
    population: 31205576,
    area: 78438,
    isActive: true
  },
  {
    name: 'Chhattisgarh',
    code: 'CG',
    country: 'India',
    capital: 'Raipur',
    population: 25545198,
    area: 135192,
    isActive: true
  },
  {
    name: 'Haryana',
    code: 'HR', 
    country: 'India',
    capital: 'Chandigarh',
    population: 25351462,
    area: 44212,
    isActive: true
  },
  {
    name: 'Himachal Pradesh',
    code: 'HP',
    country: 'India',
    capital: 'Shimla',
    population: 6864602,
    area: 55673,
    isActive: true
  },
  {
    name: 'Jharkhand',
    code: 'JH',
    country: 'India',
    capital: 'Ranchi', 
    population: 32988134,
    area: 79716,
    isActive: true
  },
  {
    name: 'Uttarakhand',
    code: 'UK',
    country: 'India',
    capital: 'Dehradun',
    population: 10086292,
    area: 53483,
    isActive: true
  },
  // Union Territories
  {
    name: 'Delhi',
    code: 'DL',
    country: 'India',
    capital: 'New Delhi',
    population: 16787941,
    area: 1484,
    isActive: true
  },
  {
    name: 'Goa',
    code: 'GA',
    country: 'India',
    capital: 'Panaji',
    population: 1458545,
    area: 3702,
    isActive: true
  },
  {
    name: 'Puducherry',
    code: 'PY',
    country: 'India',
    capital: 'Puducherry',
    population: 1247953,
    area: 492,
    isActive: true
  }
];

const seedStates = async () => {
  try {
    // Connect to database
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Find admin user
    const adminUser = await User.findOne().sort({ createdAt: 1 });
    
    if (!adminUser) {
      console.log('❌ No user found. Please register a user first or run the permission seeder.');
      process.exit(1);
    }

    console.log(`👤 Found user: ${adminUser.name} (${adminUser.email})`);

    // Clear existing states
    await State.deleteMany({});
    console.log('🗑️  Cleared existing states');

    // Prepare states with creator
    const statesToInsert = indianStates.map(state => ({
      ...state,
      createdBy: adminUser._id
    }));

    // Insert states
    const insertedStates = await State.insertMany(statesToInsert);
    
    console.log('=====================================');
    console.log('🎉 Indian States seeded successfully!');
    console.log('=====================================');
    console.log(`📊 Total states inserted: ${insertedStates.length}`);
    console.log(`👤 Created by: ${adminUser.name}`);
    
    // Calculate totals
    const totalPopulation = insertedStates.reduce((sum, state) => sum + (state.population || 0), 0);
    const totalArea = insertedStates.reduce((sum, state) => sum + (state.area || 0), 0);
    
    console.log(`📈 Total Population: ${totalPopulation.toLocaleString()}`);
    console.log(`🗺️  Total Area: ${totalArea.toLocaleString()} km²`);
    
    // Show top 5 by population
    const topStates = insertedStates
      .sort((a, b) => (b.population || 0) - (a.population || 0))
      .slice(0, 5);
    
    console.log('🏆 Top 5 states by population:');
    topStates.forEach((state, index) => {
      console.log(`   ${index + 1}. ${state.name}: ${(state.population || 0).toLocaleString()}`);
    });
    
    console.log('=====================================');
    console.log('✅ Seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding states:', error);
    
    if (error.code === 11000) {
      console.log('   Duplicate key error - some states may already exist');
    }
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
    process.exit(0);
  }
};

seedStates();