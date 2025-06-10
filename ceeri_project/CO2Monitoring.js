document.addEventListener("DOMContentLoaded", function () {
  // Initialize Socket.IO connection
  const socket = io("http://localhost:5001");

  // Ensure window.roomGauges is initialized
  if (!window.roomGauges) window.roomGauges = {};
  /* NEW: Initialize state tracking variables */
  if (!window.switchStates) window.switchStates = {};
  if (!window.pendingToggles) window.pendingToggles = {};
  if (!window.autoRelayOn) window.autoRelayOn = {};

  /* NEW: Define CO2 threshold */
  const CO2_THRESHOLD = 1000;

  // Function to initialize gauges and Socket.IO listener for relay updates
  function initializeRoomListeners(roomId) {
    // Initialize CO2 gauge if not already created
    const co2CanvasId = `co2Gauge_${roomId}`;
    if (!window.roomGauges[co2CanvasId]) {
      window.roomGauges[co2CanvasId] = createCO2Gauge(co2CanvasId);
      // console.log(`✅ Initialized CO2 gauge for Room ${roomId}`);
    }

    const pm25CanvasId = `pm25Gauge_${roomId}`;
    if (!window.roomGauges[pm25CanvasId]) {
      window.roomGauges[pm25CanvasId] = createPM25Gauge(pm25CanvasId);
      // console.log(`✅ Initialized PM25 gauge for Room ${roomId}`);
    }

    const coCanvasId = `coGauge_${roomId}`;
    if (!window.roomGauges[coCanvasId]) {
      window.roomGauges[coCanvasId] = createCOGauge(coCanvasId);
      // console.log(`✅ Initialized CO gauge for Room ${roomId}`);
    }

    // Initialize Vega gauges (temperature, humidity, AQI)
    setTimeout(() => {
      const tempGaugeId = `temperatureGauge_${roomId}`;
      if (document.getElementById(tempGaugeId)) {
        createVegaGauge(tempGaugeId, 0, 50, getTempColor, "Temperature");
      }

      const humidityGaugeId = `humidityGauge_${roomId}`;
      if (document.getElementById(humidityGaugeId)) {
        createVegaGauge(humidityGaugeId, 0, 100, getHumidityColor, "Humidity");
      }

      const aqiGaugeId = `AQIGauge_${roomId}`;
      if (document.getElementById(aqiGaugeId)) {
        createVegaGauge(aqiGaugeId, 0, 500, getAQIColor, "AQI");
      }

      // console.log(`✅ All bar gauges initialized for Room ${roomId}`);
    }, 500);

    // Periodically fetch the latest data from MongoDB
    const fetchLatestData = async () => {
      try {
        const response = await fetch(
          `http://localhost:5001/api/rooms/${roomId}/latest-data`,
          {
            headers: {
              Authorization: `Bearer ${sessionStorage.getItem("token")}`,
              "Content-Type": "application/json",
            },
          }
        );
        const latestData = await response.json();

        if (latestData.data) {
          const { CO2, PM25, CO, Temperature, Humidity, AQI } = latestData.data;

          // Update CO2 Gauge
          if (CO2 !== null) {
            // console.log(`📡 Fetched CO2 for Room ${roomId}: ${CO2} PPM`);
            updateCO2Gauge(co2CanvasId, CO2);
            const co2ValueDisplay = document.getElementById(
              `co2Value_${roomId}`
            );
            if (co2ValueDisplay) {
              let status =
                CO2 < 600 ? "Good" : CO2 < 1000 ? "Moderate" : "Poor";
              co2ValueDisplay.textContent = `CO2 Level: ${CO2} PPM (${status})`;
            }

            // CO2 Threshold Logic
            if (CO2 > CO2_THRESHOLD && !window.autoRelayOn[roomId]) {
              console.log(
                `🔴 CO2 too high in Room ${roomId} — turning relay ON`
              );
              sendRelayCommand(roomId, "ON");
              window.autoRelayOn[roomId] = true;
            } else if (CO2 <= CO2_THRESHOLD && window.autoRelayOn[roomId]) {
              console.log(
                `🟢 CO2 normalized in Room ${roomId} — turning relay OFF`
              );
              sendRelayCommand(roomId, "OFF");
              window.autoRelayOn[roomId] = false;
            }
          }

          // Update PM2.5 Gauge
          if (PM25 !== null) {
            // console.log(`📡 Fetched PM25 for Room ${roomId}: ${PM25} PPM`);
            updatePM25Gauge(pm25CanvasId, PM25);
            const pm25ValueDisplay = document.getElementById(
              `pm25Value_${roomId}`
            );
            if (pm25ValueDisplay) {
              let status =
                PM25 < 600 ? "Good" : PM25 < 1000 ? "Moderate" : "Poor";
              pm25ValueDisplay.textContent = `PM2.5 Level: ${PM25} PPM (${status})`;
            }
          }

          // Update CO Gauge
          if (CO !== null) {
            const coValue = parseFloat(CO); // Handle string values like "0.34"
            if (!isNaN(coValue)) {
              // console.log(`📡 Fetched CO for Room ${roomId}: ${coValue} PPM`);
              updateCOGauge(coCanvasId, coValue);
              const coValueDisplay = document.getElementById(
                `coValue_${roomId}`
              );
              if (coValueDisplay) {
                let status =
                  coValue < 600 ? "Good" : coValue < 1000 ? "Moderate" : "Poor";
                coValueDisplay.textContent = `CO Level: ${coValue} PPM (${status})`;
              }
            }
          }

          // Update Temperature
          if (Temperature !== null) {
            // console.log(
            //   `📡 Fetched Temperature for Room ${roomId}: ${Temperature} °C`
            // );
            updateVegaGauge(
              `temperatureGauge_${roomId}`,
              Temperature,
              50,
              getTempColor,
              `temperatureValue_${roomId}`,
              "Temperature"
            );
          }

          // Update Humidity
          if (Humidity !== null) {
            // console.log(
            //   `📡 Fetched Humidity for Room ${roomId}: ${Humidity} %`
            // );
            updateVegaGauge(
              `humidityGauge_${roomId}`,
              Humidity,
              100,
              getHumidityColor,
              `humidityValue_${roomId}`,
              "Humidity"
            );
          }

          // Update AQI
          if (AQI !== null) {
            // console.log(`📡 Fetched AQI for Room ${roomId}: ${AQI}`);
            updateVegaGauge(
              `AQIGauge_${roomId}`,
              AQI,
              500,
              getAQIColor,
              `AQIValue_${roomId}`,
              "AQI"
            );
          }

          // Update Timestamp
          const timestampElement =
            document.getElementById(`timestamp_${roomId}`) ||
            document.querySelector(
              `.gauge-container:has(#co2Gauge_${roomId}) .timestamp`
            );
          if (timestampElement) {
            if (latestData.timestamp) {
              const time = new Date(latestData.timestamp);
              if (!isNaN(time)) {
                const options = {
                  timeZone: "Greenwich",
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: true,
                };
                const formattedDateTime = time.toLocaleString("en-IN", options);
                timestampElement.textContent = `Last Updated: ${formattedDateTime} IST`;
                // console.log("Raw timestamp:", latestData.timestamp);
                // console.log("Formatted IST:", formattedDateTime);
              } else {
                timestampElement.textContent =
                  "Last Updated: Invalid Timestamp";
                console.error(
                  "Invalid timestamp received:",
                  latestData.timestamp
                );
              }
            } else {
              timestampElement.textContent = "Last Updated: No Timestamp";
              console.warn("No timestamp in latest data:", latestData);
            }
          } else {
            // console.error(
            //   "Timestamp element not found in DOM. Available IDs:",
            //   Array.from(document.querySelectorAll("[id]")).map((el) => el.id)
            // );
          }
        }
      } catch (error) {
        console.error(`Error fetching latest data for Room ${roomId}:`, error);
      }
    };

    // Initial fetch and set interval
    fetchLatestData();
    setInterval(fetchLatestData, 5000);

    // Keep Socket.IO listener for relay status updates
    socket.on(`relayStatus_R${roomId}`, (status) => {
      console.log(`📡 Relay status for Room ${roomId}: ${status}`);
      const isOn = status.toUpperCase() === "ON";
      window.switchStates[roomId] = isOn;
      window.pendingToggles[roomId] = false;

      const savedStates =
        JSON.parse(sessionStorage.getItem("switchStates")) || {};
      savedStates[roomId] = isOn;
      sessionStorage.setItem("switchStates", JSON.stringify(savedStates));

      const icon = document.getElementById(`toggle-icon-${roomId}`);
      if (icon) {
        icon.className = isOn
          ? "fa-solid fa-toggle-on"
          : "fa-solid fa-toggle-off";
        const switchIcon = icon.parentElement;
        if (switchIcon) {
          switchIcon.style.backgroundColor = isOn ? "#4CAF50" : "#FF5252";
        }
      }

      const statusText = document.getElementById(`status-text-${roomId}`);
      if (statusText) {
        statusText.textContent = isOn ? "Status: On" : "Status: Off";
      }

      socket.emit("masterSwitchUpdate", { roomId, isOn });
    });
  }

  /* NEW: Function to send relay commands */
  function sendRelayCommand(roomId, command) {
    fetch("http://localhost:5001/send-toggle", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionStorage.getItem("token")}`,
      },
      body: JSON.stringify({ room_number: roomId, command }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log(`✅ ${command} command sent for Room ${roomId}:`, data);
      })
      .catch((err) => {
        console.error(`❌ Failed to send ${command} for Room ${roomId}:`, err);
      });
  }

  // Initialize listeners for Room 41 (default)
  initializeRoomListeners(41);

  // Fetch available rooms and initialize listeners for all rooms
  fetch("http://localhost:5001/api/rooms-status")
    .then((res) => res.json())
    .then((rooms) => {
      rooms.forEach((room) => {
        if (room.room_number !== 41) {
          // Skip Room 41 as it's already initialized
          initializeRoomListeners(room.room_number);
        }
      });
    })
    .catch((err) => console.error("Error fetching rooms:", err));

  // Listen for new room additions
  socket.on("roomAdded", (roomId) => {
    if (roomId !== 41) {
      // Skip Room 41
      initializeRoomListeners(roomId);
      // console.log(`✅ Initialized listeners for newly added Room ${roomId}`);
    }
  });

  // Show CO2 monitoring section by default
  const section = document.getElementById("co2MonitoringSection");
  if (section) {
    section.style.display = "block";
  }

  // Navigation functionality (unchanged)
  const sections = {
    co2monitoring: document.getElementById("co2MonitoringSection"),
    masterctrl: document.getElementById("masterControlSection"),
  };

  function showSection(sectionId) {
    for (let key in sections) {
      if (sections[key]) {
        sections[key].style.display = key === sectionId ? "block" : "none";
      }
    }
  }

  for (let key in sections) {
    const button = document.getElementById(key);
    if (button) {
      button.addEventListener("click", () => showSection(key));
    }
  }

  showSection("co2monitoring");
});

// Function to initialize gauges for a room (used by roomManagement.js)
function initializeRoomGauges(roomId) {
  if (!window.roomGauges) window.roomGauges = {};
  const co2Id = `co2Gauge_${roomId}`;
  if (!window.roomGauges[co2Id]) {
    window.roomGauges[co2Id] = createCO2Gauge(co2Id);
  }
  createVegaGauge(
    `temperatureGauge_${roomId}`,
    0,
    50,
    getTempColor,
    "Temperature"
  );
  createVegaGauge(
    `humidityGauge_${roomId}`,
    0,
    100,
    getHumidityColor,
    "Humidity"
  );
  createVegaGauge(`AQIGauge_${roomId}`, 0, 500, getAQIColor, "AQI");
}
