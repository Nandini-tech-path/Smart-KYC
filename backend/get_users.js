const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/smart-kyc')
  .then(async () => {
    try {
      const users = await mongoose.connection.collection('users').find({}).project({ password: 0 }).toArray();
      console.log("Registered Accounts:\n", JSON.stringify(users, null, 2));
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      mongoose.disconnect();
    }
  })
  .catch(err => {
    console.error('Connection error:', err);
    process.exit(1);
  });
