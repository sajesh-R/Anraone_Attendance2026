const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config({ path: './.env' });

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const users = await User.find().select('fullName department role email');
    console.log('Users in DB:');
    users.forEach(u => console.log(`- ${u.fullName} | Dept: ${u.department} | Role: ${u.role} | Email: ${u.email}`));
    process.exit(0);
  });
