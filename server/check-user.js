import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/print24')
  .then(async () => {
    const User = mongoose.model('User', new mongoose.Schema({}, {strict: false}));
    
    // Find the user that was just created
    const user = await User.findOne({email: 'narendramali7874@gmail.com'}).select('+password');
    
    if (!user) {
      console.log('❌ User NOT found in database');
      console.log('This means the user account was not created during signup');
    } else {
      console.log('✅ User found in database');
      console.log('Email:', user.email);
      console.log('Name:', user.name);
      console.log('Has password field:', !!user.password);
      console.log('Password hash:', user.password ? user.password.substring(0, 20) + '...' : 'NONE');
      console.log('Is bcrypt hash (starts with $2b$):', user.password?.startsWith('$2b$') || false);
      console.log('Password hash length:', user.password?.length || 0);
      
      // Test password comparison
      if (user.password) {
        const testPasswords = ['test123', 'password123', 'Password123!', '948012'];
        console.log('\nTesting common passwords:');
        for (const pwd of testPasswords) {
          const match = await bcrypt.compare(pwd, user.password);
          console.log('  -', pwd, ':', match ? '✅ MATCH' : '❌ no match');
        }
      }
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });

