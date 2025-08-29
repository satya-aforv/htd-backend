// dms_newlook/server/scripts/fixPortfolioIsActive.js
import mongoose from 'mongoose';
import Portfolio from '../models/Portfolio.js';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/matrixmedys';

async function fixIsActive() {
  try {
    await mongoose.connect(mongoUri);
    const result = await Portfolio.updateMany(
      { isActive: { $exists: false } },
      { $set: { isActive: true } }
    );
    console.log(`Updated ${result.modifiedCount} portfolios to isActive: true`);
  } catch (err) {
    console.error('Error updating portfolios:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

fixIsActive(); 