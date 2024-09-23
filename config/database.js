const mongoose = require("mongoose");

const dbConnection = () => {
  mongoose.connect(process.env.DB_URI).then((conn) => {
    console.log(`DataBase connected: ${conn.connection.host}`);
  });
};

module.exports = dbConnection;
