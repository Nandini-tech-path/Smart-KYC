const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/smart-kyc')
  .then(async () => {
    try {
      const result = await mongoose.connection.collection('users').deleteMany({});
      console.log(`Successfully deleted ${result.deletedCount} accounts from the database.`);
    } catch (err) {
      console.error("Error deleting users:", err);
    } finally {
      mongoose.disconnect();
    }
  })
  .catch(err => {
    console.error('Connection error:', err);
    process.exit(1);
  });
