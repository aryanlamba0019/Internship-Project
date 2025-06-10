const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = 5000;
const SECRET_KEY = "your_secret_key";

app.use(bodyParser.json());
app.use(cors());

// Serve static files
app.use(express.static(path.join(__dirname, "..")));
app.use(express.static(path.join(__dirname, "..", "Login_and_reg")));

// MySQL Database Connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "csir.ceeri@123",
  database: "registration",
  port: 3306,
});

db.connect((err) => {
  if (err) {
    console.error("MySQL Connection Error:", err);
    return;
  }
  console.log("Connected to Local MySQL Database");
});

// Ensure `users` table exists
db.query(
  `
    CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        firstname VARCHAR(50) NOT NULL,
        lastname VARCHAR(50) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        room_number VARCHAR(50) NOT NULL,
        password VARCHAR(255) NOT NULL
    );
`,
  (err) => {
    if (err) console.error("Error creating users table:", err);
    else console.log("Users table ready (if not existed)");
  }
);

// Ensure `admin` table exists
db.query(
  `
    CREATE TABLE IF NOT EXISTS admin (
        id INT AUTO_INCREMENT PRIMARY KEY,
        firstname VARCHAR(50) NOT NULL,
        lastname VARCHAR(50) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL
    );
`,
  (err) => {
    if (err) console.error("Error creating admin table:", err);
    else console.log("Admin table ready (if not existed)");
  }
);

// Handle User Login
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }
  const userSql = "SELECT * FROM users WHERE email = ?";
  db.query(userSql, [email], async (err, userResults) => {
    if (err)
      return res.status(500).json({ message: "Database error", error: err });
    if (userResults.length > 0) {
      const user = userResults[0];
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (passwordMatch) {
        const token = jwt.sign(
          {
            id: user.id,
            email: user.email,
            firstname: user.firstname,
            lastname: user.lastname,
            userType: "user",
            room_number: user.room_number,
          },
          SECRET_KEY,
          { expiresIn: "1h" }
        );
        return res.status(200).json({ message: "Login successful", token });
      }
    }
    const adminSql = "SELECT * FROM admin WHERE email = ?";
    db.query(adminSql, [email], async (err, adminResults) => {
      if (err)
        return res.status(500).json({ message: "Database error", error: err });
      if (adminResults.length > 0) {
        const admin = adminResults[0];
        const passwordMatch = await bcrypt.compare(password, admin.password);
        if (passwordMatch) {
          const token = jwt.sign(
            {
              id: admin.id,
              email: admin.email,
              firstname: admin.firstname,
              lastname: admin.lastname,
              userType: "admin",
            },
            SECRET_KEY,
            { expiresIn: "1h" }
          );
          return res.status(200).json({ message: "Login successful", token });
        }
      }
      return res.status(401).json({ message: "Invalid email or password" });
    });
  });
});

// Middleware to verify JWT
tokenMiddleware = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token)
    return res
      .status(401)
      .json({ message: "Access denied, no token provided" });

  jwt.verify(token.split(" ")[1], SECRET_KEY, (err, decoded) => {
    if (err) return res.status(401).json({ message: "Invalid token" });

    req.user = decoded;
    next();
  });
};

// Protected route to get user info
app.get("/user_info", tokenMiddleware, (req, res) => {
  const userInfo = {
    firstname: req.user.firstname,
    lastname: req.user.lastname,
    userType: req.user.userType,
  };

  // Include room_number only if userType is "user"
  if (req.user.userType === "user") {
    userInfo.room_number = req.user.room_number;
  }

  res.json(userInfo);
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  next();
});
