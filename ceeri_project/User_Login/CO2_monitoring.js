document.addEventListener("DOMContentLoaded", function () {
  function initializeRoomListeners(roomId) {
    // Initialize CO2 gauge if not already created
    const co2CanvasId = `co2Gauge`;
    if (!window.roomGauges[co2CanvasId]) {
      window.roomGauges[co2CanvasId] = createCO2Gauge(co2CanvasId);
      console.log(`✅ Initialized CO2 gauge for Room ${roomId}`);
    }

    const pm25CanvasId = `pm25Gauge`;
    if (!window.roomGauges[pm25CanvasId]) {
      window.roomGauges[pm25CanvasId] = createPM25Gauge(pm25CanvasId);
      console.log(`✅ Initialized PM25 gauge for Room ${roomId}`);
    }

    const coCanvasId = `coGauge`;
    if (!window.roomGauges[coCanvasId]) {
      window.roomGauges[coCanvasId] = createCOGauge(coCanvasId);
      console.log(`✅ Initialized CO gauge for Room ${roomId}`);
    }

    // Initialize Vega gauges (temperature, humidity, AQI)
    setTimeout(() => {
      const tempGaugeId = `temperatureGauge`;
      if (document.getElementById(tempGaugeId)) {
        createVegaGauge(tempGaugeId, 0, 50, getTempColor, "Temperature");
      } else {
        // console.error(`⛔ ERROR: ${tempGaugeId} does not exist!`);
      }

      const humidityGaugeId = `humidityGauge`;
      if (document.getElementById(humidityGaugeId)) {
        createVegaGauge(humidityGaugeId, 0, 100, getHumidityColor, "Humidity");
      } else {
        // console.error(`⛔ ERROR: ${humidityGaugeId} does not exist!`);
      }

      const aqiGaugeId = `AQIGauge`;
      if (document.getElementById(aqiGaugeId)) {
        createVegaGauge(aqiGaugeId, 0, 500, getAQIColor, "AQI");
      } else {
        // console.error(`⛔ ERROR: ${aqiGaugeId} does not exist!`);
      }

      console.log(`✅ All bar gauges initialized for Room ${roomId}`);
    }, 500);

    // Socket.IO listeners for room-specific sensor data
    // socket.on(`co2Update_R${roomId}`, (co2PPM) => {
    //   console.log(`📡 RECEIVED CO2 UPDATE for Room ${roomId}: ${co2PPM} PPM`);
    //   updateCO2Gauge(co2CanvasId, co2PPM);
    //   const co2ValueDisplay = document.getElementById(`co2Value_${roomId}`);
    //   if (co2ValueDisplay) {
    //     let status =
    //       co2PPM < 600 ? "Good" : co2PPM < 1000 ? "Moderate" : "Poor";
    //     co2ValueDisplay.textContent = `CO2 Level: ${co2PPM} PPM (${status})`;
    //   } else {
    //     console.error(`⛔ CO2 value display for Room ${roomId} not found!`);
    //   }

    //   /* NEW: CO2 Threshold Logic */
    //   if (co2PPM > CO2_THRESHOLD && !window.autoRelayOn[roomId]) {
    //     console.log(`🔴 CO2 too high in Room ${roomId} — turning relay ON`);
    //     sendRelayCommand(roomId, "ON");
    //     window.autoRelayOn[roomId] = true;
    //   } else if (co2PPM <= CO2_THRESHOLD && window.autoRelayOn[roomId]) {
    //     console.log(`🟢 CO2 normalized in Room ${roomId} — turning relay OFF`);
    //     sendRelayCommand(roomId, "OFF");
    //     window.autoRelayOn[roomId] = false;
    //   }
    // });

    /* NEW: Relay status listener for toggle switch */
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

      /* NEW: Emit master switch update event */
      socket.emit("masterSwitchUpdate", { roomId, isOn });
    });
  }
});

createVegaGauge(
  "temperatureGauge",
  0,
  50,
  getTempColor,
  "Temperature",
  "Temperature (°C)"
);

createVegaGauge(
  "humidityGauge",
  0,
  100,
  getHumidityColor,
  "Humidity",
  "Humidity (%)"
);

createVegaGauge("AQIGauge", 0, 500, getAQIColor, "AQI", "AQI");
