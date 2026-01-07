import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/prints24')
  .then(async () => {
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const UserSegment = mongoose.model('UserSegment', new mongoose.Schema({}, { strict: false }));
    
    // Find CORPORATE segment
    const corporateSegment = await UserSegment.findOne({ code: 'CORPORATE' });
    if (!corporateSegment) {
      console.log('❌ CORPORATE segment not found');
      process.exit(1);
    }
    
    console.log('✅ CORPORATE segment found:', corporateSegment._id, corporateSegment.name);
    
    // Update user
    const result = await User.updateOne(
      { email: 'corporate@787gmail.com' },
      { $set: { userSegment: corporateSegment._id } }
    );
    
    console.log('✅ User updated:', result.modifiedCount, 'user(s)');
    
    // Verify
    const user = await User.findOne({ email: 'corporate@787gmail.com' }).populate('userSegment');
    console.log('✅ User segment now:', user.userSegment);
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
