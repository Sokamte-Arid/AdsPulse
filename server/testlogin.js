require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('./models/User');
mongoose.connect(process.env.MONGO_URI||'mongodb://127.0.0.1:27017/ads_manager').then(async () => {
  const u = await User.findOne({ email: 'demo@adspulse.com' });
  const match = await bcrypt.compare('demo123', u.password);
  console.log('Stored hash:', u.password);
  console.log('Match result:', match);
  mongoose.disconnect();
});
