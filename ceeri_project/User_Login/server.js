const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const mqtt = require("mqtt");
const { MongoClient } = require("mongodb");
const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 8080 }); // Port for WebSocket

const app = express();
const PORT = 5002; // Use a different port from the other servers
const SECRET_KEY = "your_secret_key";

const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const MONGO_URI = "mongodb://localhost:27017";
const MONGO_DB = "air_quality_data";
const mongoClient = new MongoClient(MONGO_URI);

const MQTT_BROKER_URL = "mqtt://iotdata.ceeri.res.in"; // Replace with actual broker URL
const activeSubscriptions = {}; // Track active room subscriptions

const clientsPerRoom = {};

const mqttClient = mqtt.connect(MQTT_BROKER_URL);
mqttClient.on("connect", () => {
  console.log("Connected to MQTT Broker");
});

mongoClient
  .connect()
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files like index.html

// Middleware to verify JWT
const tokenMiddleware = (req, res, next) => {
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

  const roomNumber = req.user.room_number;
  const topic = `INDIA/CSIR/CEERI/IEQ/R${roomNumber}`;
  const statusTopic = `test/relay/R${roomNumber}/status`;

  if (!activeSubscriptions[roomNumber]) {
    activeSubscriptions[roomNumber] = { count: 0 };

    mqttClient.subscribe(topic, (err) => {
      if (!err) console.log(`✅ Subscribed to sensor topic: ${topic}`);
      else console.error(`❌ Failed to subscribe to ${topic}`, err);
    });

    mqttClient.subscribe(statusTopic, (err) => {
      if (!err) console.log(`✅ Subscribed to status topic: ${statusTopic}`);
      else console.error(`❌ Failed to subscribe to ${statusTopic}`, err);
    });
  }
  activeSubscriptions[roomNumber].count++;

  res.json(userInfo);
});

//retrieving sensor data from MongoDB
app.get("/api/rooms/:room_number/latest-data", async (req, res) => {
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

// Fetch trends data from MongoDB
app.get("/api/rooms/:room_number/trends", async (req, res) => {
  try {
    const { room_number } = req.params;
    const { startTime } = req.query;
    const collectionName = `room_${room_number}`;
    const db = mongoClient.db(MONGO_DB);

    const startDate = new Date(parseInt(startTime));
    const data = await db
      .collection(collectionName)
      .find({ timestamp: { $gte: startDate } })
      .sort({ timestamp: 1 })
      .toArray();

    res.json(data);
  } catch (error) {
    console.error("Error fetching trends data from MongoDB:", error);
    res.status(500).json({ message: "Failed to fetch trends data" });
  }
});

app.post("/logout", tokenMiddleware, (req, res) => {
  const roomNumber = req.user.room_number;
  const topic = `INDIA/CSIR/CEERI/IEQ/R${roomNumber}`;

  if (activeSubscriptions[roomNumber]) {
    activeSubscriptions[roomNumber].count--;

    if (activeSubscriptions[roomNumber].count === 0) {
      mqttClient.unsubscribe(topic, () => {
        console.log(`Unsubscribed from ${topic}`);
      });
      delete activeSubscriptions[roomNumber];
    }
  }

  res.json({ message: "User logged out" });
});

app.post("/send-toggle", tokenMiddleware, (req, res) => {
  const roomNumber = req.user.room_number;
  const topic = `test/relay/R${roomNumber}/control`;
  const command = req.body.command || "TOGGLE"; // support direct ON/OFF too

  mqttClient.publish(topic, command, {}, (err) => {
    if (err) {
      console.error("MQTT publish error:", err);
      return res.status(500).json({ message: "Failed to send toggle" });
    }
    console.log(`Sent ${command} to ${topic}`);
    res.json({ message: `${command} command sent` });
  });
});

wss.on("connection", (ws, req) => {
  ws.on("message", (msg) => {
    try {
      const { room } = JSON.parse(msg);
      if (!clientsPerRoom[room]) clientsPerRoom[room] = [];
      clientsPerRoom[room].push(ws);
      ws.room = room;
    } catch (e) {
      console.error("Invalid message from client", e);
    }
  });

  ws.on("close", () => {
    const room = ws.room;
    if (room && clientsPerRoom[room]) {
      clientsPerRoom[room] = clientsPerRoom[room].filter(
        (client) => client !== ws
      );
    }
  });
});

mqttClient.on("message", async (topic, message) => {
  // Extract room number from topic, e.g., "test/relay/R101/status"
  let roomMatch = topic.match(/R(\d+)/);
  let room = roomMatch ? roomMatch[1] : null;
  let payloadToSend;

  const msgString = message.toString();

  if (topic.includes("/status")) {
    payloadToSend = JSON.stringify({ relay_status: msgString });
    console.log(`Forwarding relay status to WebSocket: ${payloadToSend}`);
  }

  // Send to all clients subscribed to this room
  if (room && clientsPerRoom[room] && clientsPerRoom[room].length > 0) {
    clientsPerRoom[room].forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payloadToSend);
      }
    });
  }
});

// Start the server
server.listen(PORT, () => {
  console.log(`User server running at http://localhost:${PORT}`);
});
