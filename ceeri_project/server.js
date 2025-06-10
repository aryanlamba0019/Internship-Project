const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const mqtt = require("mqtt"); // Import MQTT
const bcrypt = require("bcrypt");
const http = require("http");
const { Server } = require("socket.io"); // WebSocket server
const jwt = require("jsonwebtoken"); // Import JWT
const SECRET_KEY = "your_secret_key"; // Replace with your actual secret key

const app = express();
const server = http.createServer(app); // HTTP server for WebSocket
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins
  },
});

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

//Mongo db import
const { MongoClient } = require("mongodb");

// MongoDB Connection Setup
const MONGO_URI = "mongodb://127.0.0.1:27017";
const MONGO_DB = "air_quality_data";
let mongoClient;

async function connectMongoDB() {
  try {
    mongoClient = await MongoClient.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1);
  }
}
connectMongoDB();

async function initializeMongoCollections() {
  try {
    const db = mongoClient.db(MONGO_DB);
    const [rows] = await pool.query("SELECT room_number FROM rooms");

    for (const row of rows) {
      const collectionName = `room_${row.room_number}`;
      const collections = await db
        .listCollections({ name: collectionName })
        .toArray();

      if (collections.length === 0) {
        await db.createCollection(collectionName);
        console.log(`✅ Created MongoDB collection: ${collectionName}`);

        // Create TTL index for 1-year retention (365 days = 31,536,000 seconds)
        await db
          .collection(collectionName)
          .createIndex({ timestamp: 1 }, { expireAfterSeconds: 31536000 });
        console.log(`✅ Created TTL index for ${collectionName}`);

        // Create index on timestamp for faster queries
        await db.collection(collectionName).createIndex({ timestamp: -1 });
        console.log(`✅ Created timestamp index for ${collectionName}`);
      }
    }
  } catch (error) {
    console.error("❌ Error initializing MongoDB collections:", error);
  }
}

// Call initialization after MongoDB connection
setTimeout(() => {
  initializeMongoCollections();
}, 1000); // Delay to ensure MongoDB connection is established

// Create MySQL connection pool
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "csir.ceeri@123",
  database: "registration",
});

//Middleware to verify JWT
const tokenMiddleware = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token)
    return res
      .status(401)
      .json({ message: "Access denied, no token provided" });

  jwt.verify(token.split(" ")[1], SECRET_KEY, (err, decoded) => {
    if (err) return res.status(401).json({ message: "Invalid token" });

    req.user = decoded; // Store user data in request
    next();
  });
};

//Fetch admin info from JWT Token
app.get("/admin_info", tokenMiddleware, (req, res) => {
  if (req.user.userType !== "admin") {
    return res
      .status(403)
      .json({ message: "Access denied. Only admin allowed." });
  }
  res.json({ firstname: req.user.firstname, lastname: req.user.lastname });
});

// MQTT Connection Setup (Use `mqtt://` in Node.js)
const MQTT_BROKER_URL = "mqtt://iotdata.ceeri.res.in";
const MQTT_USERNAME = "iotdata";
const MQTT_PASSWORD = "csir.ceeri";
// Add activeSubscriptions to track room subscriptions
const activeSubscriptions = {};

const mqttClient = mqtt.connect(MQTT_BROKER_URL, {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
});

// Modify MQTT connection to handle dynamic subscriptions
mqttClient.on("connect", () => {
  console.log("✅ Connected to MQTT broker");
  // Remove hardcoded Room 41 subscription
});

// Function to subscribe to a room's topics
function subscribeToRoom(roomNumber) {
  const sensorTopic = `INDIA/CSIR/CEERI/IEQ/R${roomNumber}`;
  const statusTopic = `test/relay/R${roomNumber}/status`;

  if (!activeSubscriptions[roomNumber]) {
    activeSubscriptions[roomNumber] = { count: 1 };

    mqttClient.subscribe(sensorTopic, (err) => {
      if (err) console.error(`❌ Failed to subscribe to ${sensorTopic}:`, err);
      else console.log(`✅ Subscribed to ${sensorTopic}`);
    });

    mqttClient.subscribe(statusTopic, (err) => {
      if (err) console.error(`❌ Failed to subscribe to ${statusTopic}:`, err);
      else console.log(`✅ Subscribed to ${statusTopic}`);
    });
  } else {
    activeSubscriptions[roomNumber].count++;
  }
}

// Function to unsubscribe from a room's topics
function unsubscribeFromRoom(roomNumber) {
  const sensorTopic = `INDIA/CSIR/CEERI/IEQ/R${roomNumber}`;
  const statusTopic = `test/relay/R${roomNumber}/status`;

  if (activeSubscriptions[roomNumber]) {
    activeSubscriptions[roomNumber].count--;
    if (activeSubscriptions[roomNumber].count === 0) {
      mqttClient.unsubscribe(sensorTopic, () => {
        console.log(`Unsubscribed from ${sensorTopic}`);
      });
      mqttClient.unsubscribe(statusTopic, () => {
        console.log(`Unsubscribed from ${statusTopic}`);
      });
      delete activeSubscriptions[roomNumber];
    }
  }
}

// Track the latest status for each room
const roomStatuses = {};

// Updated MQTT message handler
mqttClient.on("message", async (topic, message) => {
  const msgString = message.toString().trim();
  const roomMatch = topic.match(/R(\d+)/);
  if (!roomMatch) return;

  const roomNumber = roomMatch[1];
  const collectionName = `room_${roomNumber}`;

  if (topic.includes("/status")) {
    // Handle relay status
    roomStatuses[roomNumber] = msgString; // Store latest status
    io.emit(`relayStatus_R${roomNumber}`, msgString);
    console.log(`Emitted relayStatus_R${roomNumber}: ${msgString}`);
  } else {
    // Handle sensor data
    try {
      const jsonData = JSON.parse(msgString);
      if (jsonData.Data) {
        const co2PPM = jsonData.Data.CO2 ?? null;
        const pm25PPM = jsonData.Data.PM25 ?? null;
        const coPPM = jsonData.Data.CO ?? null;
        const temperature = jsonData.Data.Temperature ?? null;
        const humidity = jsonData.Data.Humidity ?? null;
        const aqi = jsonData.Data.AQI ?? null;

        console.log(
          `📩 Room ${roomNumber} - CO2: ${co2PPM} PPM, PM25: ${pm25PPM} PPM, CO: ${coPPM} PPM, Temp: ${temperature} °C, Humidity: ${humidity} %, AQI: ${aqi}`
        );

        // Emit room-specific events
        if (co2PPM !== null) io.emit(`co2Update_R${roomNumber}`, co2PPM);
        if (pm25PPM !== null) io.emit(`pm25Update_R${roomNumber}`, pm25PPM);
        if (coPPM !== null) io.emit(`coUpdate_R${roomNumber}`, coPPM);
        if (temperature !== null)
          io.emit(`temperatureUpdate_R${roomNumber}`, temperature);
        if (humidity !== null)
          io.emit(`humidityUpdate_R${roomNumber}`, humidity);
        if (aqi !== null) io.emit(`AQIUpdate_R${roomNumber}`, aqi);

        // Store in MySQL (unchanged)
        try {
          await pool.query(
            `UPDATE rooms SET co2_level = ?, pm25_level = ?, co_level = ?, temperature = ?, humidity = ?, AQI = ? WHERE room_number = ?`,
            [co2PPM, pm25PPM, coPPM, temperature, humidity, aqi, roomNumber]
          );
          console.log(`✅ Data updated in database for Room ${roomNumber}`);
        } catch (dbError) {
          console.error("❌ Database error:", dbError);
        }

        // Store in MongoDB
        try {
          const db = mongoClient.db(MONGO_DB);
          const collections = await db
            .listCollections({ name: collectionName })
            .toArray();

          if (collections.length === 0) {
            await db.createCollection(collectionName);
            console.log(`✅ Created MongoDB collection: ${collectionName}`);

            // Create TTL index for 1-year retention
            await db
              .collection(collectionName)
              .createIndex({ timestamp: 1 }, { expireAfterSeconds: 31536000 });
            console.log(`✅ Created TTL index for ${collectionName}`);

            // Create index on timestamp for faster queries
            await db.collection(collectionName).createIndex({ timestamp: -1 });
            console.log(`✅ Created timestamp index for ${collectionName}`);
          }

          // Convert UTC to IST (UTC + 5 hours 30 minutes)
          const utcDate = new Date();
          const istDate = new Date(utcDate.getTime() + 5.5 * 60 * 60 * 1000); // Add 5.5 hours in milliseconds

          await db.collection(collectionName).insertOne({
            timestamp: istDate,
            data: jsonData.Data,
            status: roomStatuses[roomNumber] || "UNKNOWN",
          });
          console.log(`✅ Data inserted into MongoDB for ${collectionName}`);
        } catch (mongoError) {
          console.error(`❌ MongoDB error for ${collectionName}:`, mongoError);
        }
      }
    } catch (error) {
      console.error(
        `❌ Error parsing MQTT message for Room ${roomNumber}:`,
        error
      );
    }
  }
});

mqttClient.on("error", (err) => {
  console.error("❌ MQTT Connection Error:", err);
});

// WebSocket connection handler
io.on("connection", (socket) => {
  console.log("🌐 New WebSocket client connected");
  socket.on("disconnect", () => {
    console.log("❌ WebSocket client disconnected");
  });
});

// Test endpoint
app.get("/test", (req, res) => {
  res.json({ message: "Server is working!" });
});

app.get("/rooms/:room_number/trends", tokenMiddleware, async (req, res) => {
  try {
    const { room_number } = req.params;
    const { startTime } = req.query;
    const collectionName = `room_${room_number}`;
    const db = mongoClient.db(MONGO_DB);

    const startDate = new Date(parseInt(startTime));
    const endDate = new Date();
    // Add time filter!
    const trendsData = await db
      .collection(collectionName)
      .find({
        timestamp: { $gte: startDate },
      })
      .sort({ timestamp: 1 })
      .toArray();

    if (trendsData.length === 0) {
      return res
        .status(404)
        .json({ message: "No trends data found for this room" });
    }

    res.json(trendsData);
  } catch (error) {
    console.error("Error fetching trends data from MongoDB:", error);
    res.status(500).json({ message: "Failed to fetch trends data" });
  }
});

app.get("/available-rooms", async (req, res) => {
  try {
    // Simpler query to test database connection
    const [rows] = await pool.query("SELECT * FROM rooms");
    // console.log('Fetched rooms:', rows); // Debug log
    res.json(rows);
  } catch (error) {
    console.error("Database error:", error); // Detailed error logging
    res.status(500).json({ error: "Failed to fetch available rooms" });
  }
});

// Update /api/rooms-status to subscribe to all rooms on page load
app.get("/rooms-status", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT room_number FROM rooms");
    rows.forEach((room) => subscribeToRoom(room.room_number));
    res.json(rows);
  } catch (error) {
    console.error("Database error:", error.message, error.stack);
    res.status(500).json({ error: "Failed to fetch room numbers" });
  }
});

//Retrieving data from Mongo DB
app.get("/rooms/:room_number/latest-data", async (req, res) => {
  try {
    const { room_number } = req.params;
    const collectionName = `room_${room_number}`;
    const db = mongoClient.db(MONGO_DB);

    const latestData = await db
      .collection(collectionName)
      .find()
      .sort({ timestamp: -1 })
      .limit(1)
      .toArray();

    if (latestData.length === 0) {
      return res.status(404).json({ message: "No data found for this room" });
    }

    res.json(latestData[0]);
  } catch (error) {
    console.error("Error fetching latest data from MongoDB:", error);
    res.status(500).json({ message: "Failed to fetch latest data" });
  }
});

//User registration within admin login
app.post("/submit_registration", async (req, res) => {
  try {
    const { firstname, lastname, email, room_number, password } = req.body;

    console.log("Received registration data:", {
      firstname,
      lastname,
      email,
      room_number,
    });

    if (!firstname || !lastname || !email || !room_number || !password) {
      console.log("Validation failed: Missing fields");
      return res.status(400).json({ message: "All fields are required" });
    }

    const [existing] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (existing.length > 0) {
      console.log("Validation failed: Email already registered");
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      "INSERT INTO users (firstname, lastname, email, room_number, password) VALUES (?, ?, ?, ?, ?)",
      [firstname, lastname, email, room_number, hashedPassword]
    );

    console.log("User registered successfully. Insert ID:", result.insertId);

    res.json({ message: "Registration successful" });
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
});

// Endpoint to subscribe to a room
app.post("/rooms/:room_number/subscribe", tokenMiddleware, async (req, res) => {
  const { room_number } = req.params;
  subscribeToRoom(room_number);
  io.emit("roomAdded", room_number); /* CHANGED: Added roomAdded emission */
  res.json({ message: `Subscribed to Room ${room_number}` });
});

// Endpoint to unsubscribe from a room
app.post(
  "/rooms/:room_number/unsubscribe",
  tokenMiddleware,
  async (req, res) => {
    const { room_number } = req.params;
    unsubscribeFromRoom(room_number);
    res.json({ message: `Unsubscribed from Room ${room_number}` });
  }
);

/* NEW: Endpoint for sending toggle commands */
app.post("/send-toggle", tokenMiddleware, (req, res) => {
  const { room_number, command } = req.body;
  const topic = `test/relay/R${room_number}/control`;

  if (!room_number || !command || !["ON", "OFF"].includes(command)) {
    return res.status(400).json({ message: "Invalid room number or command" });
  }

  mqttClient.publish(topic, command, {}, (err) => {
    if (err) {
      console.error(`❌ MQTT publish error to ${topic}:`, err);
      return res.status(500).json({ message: "Failed to send toggle command" });
    }
    console.log(`✅ Sent ${command} to ${topic}`);
    res.json({ message: `${command} command sent` });
  });
});

/* NEW: Endpoint to toggle all rooms */
// app.post("/send-toggle-all", tokenMiddleware, async (req, res) => {
//   const { command } = req.body;
//   if (!command || !["ON", "OFF"].includes(command)) {
//     return res.status(400).json({ message: "Invalid command" });
//   }

//   try {
//     const [rows] = await pool.query("SELECT room_number FROM rooms");
//     const promises = rows.map((room) => {
//       const topic = `test/relay/R${room.room_number}/control`;
//       return new Promise((resolve, reject) => {
//         mqttClient.publish(topic, command, {}, (err) => {
//           if (err) {
//             console.error(`❌ MQTT publish error to ${topic}:`, err);
//             reject(err);
//           } else {
//             console.log(`✅ Sent ${command} to ${topic}`);
//             resolve();
//           }
//         });
//       });
//     });

//     await Promise.all(promises);
//     res.json({ message: `${command} command sent to all rooms` });
//   } catch (error) {
//     console.error("❌ Error sending toggle to all rooms:", error);
//     res
//       .status(500)
//       .json({ message: "Failed to send toggle command to all rooms" });
//   }
// });

// Update /api/rooms to subscribe when adding a room
app.post("/rooms", async (req, res) => {
  try {
    const { room_number } = req.body;
    const [existing] = await pool.query(
      "SELECT * FROM rooms WHERE room_number = ?",
      [room_number]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: "Room already exists" });
    }
    await pool.query("INSERT INTO rooms (room_number) VALUES (?)", [
      room_number,
    ]);

    // Create MongoDB collection for the new room
    const collectionName = `room_${room_number}`;
    const db = mongoClient.db(MONGO_DB);
    const collections = await db
      .listCollections({ name: collectionName })
      .toArray();

    if (collections.length === 0) {
      await db.createCollection(collectionName);
      console.log(`✅ Created MongoDB collection: ${collectionName}`);

      // Create TTL index for 1-year retention
      await db
        .collection(collectionName)
        .createIndex({ timestamp: 1 }, { expireAfterSeconds: 31536000 });
      console.log(`✅ Created TTL index for ${collectionName}`);

      // Create index on timestamp for faster queries
      await db.collection(collectionName).createIndex({ timestamp: -1 });
      console.log(`✅ Created timestamp index for ${collectionName}`);
    }

    subscribeToRoom(room_number);
    io.emit("roomAdded", room_number);
    res.json({ message: "Room added successfully" });
  } catch (error) {
    console.error("Error adding room:", error);
    res.status(500).json({ error: "Failed to add room" });
  }
});

// Update /api/rooms/:room_number to unsubscribe when removing a room
app.delete("/rooms/:room_number", async (req, res) => {
  try {
    const { room_number } = req.params;
    const [existing] = await pool.query(
      "SELECT * FROM rooms WHERE room_number = ?",
      [room_number]
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: "Room not found" });
    }
    await pool.query("DELETE FROM rooms WHERE room_number = ?", [room_number]);
    unsubscribeFromRoom(room_number);
    res.json({ message: "Room removed successfully" });
  } catch (error) {
    console.error("Error removing room:", error);
    res.status(500).json({ error: "Failed to remove room" });
  }
});

// Update room status
app.put("/rooms/:room_number/status", async (req, res) => {
  try {
    const { room_number } = req.params;
    const { status } = req.body;
    await pool.query("UPDATE rooms SET status = ? WHERE room_number = ?", [
      status,
      room_number,
    ]);
    res.json({ message: "Room status updated successfully" });
  } catch (error) {
    console.error("Error updating room status:", error);
    res.status(500).json({ error: "Failed to update room status" });
  }
});

const PORT = 5001;

// app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
// });

app.use((req, res) => {
  console.log(`Unmatched route: ${req.method} ${req.url}`);
  res.status(404).json({ message: "Route not found" });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
