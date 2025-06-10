document.addEventListener("DOMContentLoaded", function () {
  const addRoomBtn = document.getElementById("addRoomBtn");
  const roomDropdown = document.getElementById("roomDropdown");
  const gaugesContainer = document.querySelector(".gauges-container");

  addRoomBtn.addEventListener("click", async function (event) {
    event.stopPropagation();
    roomDropdown.classList.toggle("show");

    try {
      const response = await fetch("http://localhost:5001/api/available-rooms");
      const rooms = await response.json();
      roomDropdown.innerHTML = "";

      rooms.forEach((room) => {
        const div = document.createElement("div");
        div.textContent = `Room ${room.room_number}`;
        div.onclick = () => addRoomGauge(room.room_number);
        roomDropdown.appendChild(div);
      });
    } catch (error) {
      console.error("Error fetching rooms:", error);
      roomDropdown.innerHTML = "<div>Error loading rooms</div>";
    }
  });

  function addRoomGauge(roomId) {
    if (roomId === 41) {
      console.log("Skipping Room 41, already initialized.");
      roomDropdown.classList.remove("show");
      return;
    }

    if (document.getElementById(`co2Gauge_${roomId}`)) {
      console.log(`Gauge for Room ${roomId} already exists`);
      roomDropdown.classList.remove("show");
      return;
    }

    try {
      fetch(`http://localhost:5001/api/rooms/${roomId}/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionStorage.getItem("token")}`,
        },
      }).catch((err) =>
        console.error(`Error subscribing to Room ${roomId}:`, err)
      );
    } catch (error) {
      console.error("Error subscribing to room:", error);
    }

    const gaugeContainer = document.createElement("div");
    gaugeContainer.className = "gauge-container";

    const header = document.createElement("div");
    header.className = "gauge-header";

    const title = document.createElement("div");
    title.className = "room-title";
    title.textContent = `Room ${roomId}`;

    const timestamp = document.createElement("div");
    timestamp.className = "timestamp";
    timestamp.textContent = `Last Updated:`;
    timestamp.style.fontWeight = "bold";

    const removeBtn = document.createElement("i");
    removeBtn.className = "fas fa-times remove-gauge";
    removeBtn.onclick = () => {
      gaugeContainer.remove();
      let storedRooms = JSON.parse(sessionStorage.getItem("addedRooms")) || [];
      storedRooms = storedRooms.filter((id) => id !== roomId);
      sessionStorage.setItem("addedRooms", JSON.stringify(storedRooms));

      /* NEW: Remove switch state from sessionStorage */
      const switchStates =
        JSON.parse(sessionStorage.getItem("switchStates")) || {};
      delete switchStates[roomId];
      sessionStorage.setItem("switchStates", JSON.stringify(switchStates));

      fetch(`http://localhost:5001/api/rooms/${roomId}/unsubscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionStorage.getItem("token")}`,
        },
      }).catch((err) =>
        console.error(`Error unsubscribing from Room ${roomId}:`, err)
      );
    };

    header.appendChild(title);
    header.appendChild(timestamp);
    header.appendChild(removeBtn);

    const box1 = document.createElement("div");
    box1.className = "box-1";

    const co2box = document.createElement("div");
    co2box.className = "co2-box";

    const co2Canvas = document.createElement("canvas");
    co2Canvas.id = `co2Gauge_${roomId}`;

    const co2ValueDisplay = document.createElement("div");
    co2ValueDisplay.id = `co2Value_${roomId}`;
    co2ValueDisplay.textContent = "CO2 Level: 0 PPM";

    const pm25box = document.createElement("div");
    pm25box.className = "pm25-box";

    const pm25Canvas = document.createElement("canvas");
    pm25Canvas.id = `pm25Gauge_${roomId}`;

    const pm25ValueDisplay = document.createElement("div");
    pm25ValueDisplay.id = `pm25Value_${roomId}`;
    pm25ValueDisplay.textContent = "PM25 Level: 0 PPM";

    const cobox = document.createElement("div");
    cobox.className = "co-box";

    const coCanvas = document.createElement("canvas");
    coCanvas.id = `coGauge_${roomId}`;

    const coValueDisplay = document.createElement("div");
    coValueDisplay.id = `coValue_${roomId}`;
    coValueDisplay.textContent = "CO Level: 0 PPM";

    co2box.appendChild(co2Canvas);
    co2box.appendChild(co2ValueDisplay);
    pm25box.appendChild(pm25Canvas);
    pm25box.appendChild(pm25ValueDisplay);
    cobox.appendChild(coCanvas);
    cobox.appendChild(coValueDisplay);

    box1.appendChild(co2box);
    box1.appendChild(pm25box);
    box1.appendChild(cobox);

    const box2ToggleContainer = document.createElement("div");
    box2ToggleContainer.className = "box-2-toggle-container";

    const box2 = document.createElement("div");
    box2.className = "box-2";

    const tempbox = document.createElement("div");
    tempbox.className = "temp-box";

    const tempGauge = document.createElement("div");
    tempGauge.id = `temperatureGauge_${roomId}`;

    const tempValueDisplay = document.createElement("div");
    tempValueDisplay.id = `temperatureValue_${roomId}`;
    tempValueDisplay.textContent = "Temperature: 0°C";

    const humidityBox = document.createElement("div");
    humidityBox.className = "humidity-box";

    const humidityGauge = document.createElement("div");
    humidityGauge.id = `humidityGauge_${roomId}`;

    const humidityValueDisplay = document.createElement("div");
    humidityValueDisplay.id = `humidityValue_${roomId}`;
    humidityValueDisplay.textContent = "Humidity: 0%";

    const aqiBox = document.createElement("div");
    aqiBox.className = "aqi-box";

    const aqiGauge = document.createElement("div");
    aqiGauge.id = `AQIGauge_${roomId}`;

    const aqiValueDisplay = document.createElement("div");
    aqiValueDisplay.id = `AQIValue_${roomId}`;
    aqiValueDisplay.textContent = "AQI: 0";

    tempbox.appendChild(tempValueDisplay);
    tempbox.appendChild(tempGauge);
    humidityBox.appendChild(humidityValueDisplay);
    humidityBox.appendChild(humidityGauge);
    aqiBox.appendChild(aqiValueDisplay);
    aqiBox.appendChild(aqiGauge);

    box2.appendChild(tempbox);
    box2.appendChild(humidityBox);
    box2.appendChild(aqiBox);

    const toggleBox = document.createElement("div");
    toggleBox.className = "toggle-box";

    const switchContainer = document.createElement("div");
    switchContainer.className = "switch-container";

    const switchDiv = document.createElement("div");
    switchDiv.className = "switch";
    switchDiv.onclick = () => toggleRoomSwitch(roomId);

    const switchIconDiv = document.createElement("div");
    switchIconDiv.className = "switch-icon";

    const switchIcon = document.createElement("i");
    switchIcon.className = "fa-solid fa-toggle-off";
    switchIcon.id = `toggle-icon-${roomId}`;

    switchIconDiv.appendChild(switchIcon);
    switchDiv.appendChild(switchIconDiv);
    switchContainer.appendChild(switchDiv);

    const statusText = document.createElement("div");
    statusText.className = "status";
    statusText.id = `status-text-${roomId}`;
    statusText.textContent = "Status: Off";

    switchContainer.appendChild(statusText);
    toggleBox.appendChild(switchContainer);

    box2ToggleContainer.appendChild(box2);
    box2ToggleContainer.appendChild(toggleBox);

    const trendsBtn = document.createElement("button");
    trendsBtn.id = `viewTrendsBtn_${roomId}`;
    trendsBtn.className = "view-trends-btn";
    trendsBtn.textContent = "View Trends";

    gaugeContainer.appendChild(trendsBtn);
    gaugeContainer.appendChild(header);
    gaugeContainer.appendChild(box1);
    gaugeContainer.appendChild(box2ToggleContainer);
    gaugesContainer.appendChild(gaugeContainer);

    createCO2Gauge(`co2Gauge_${roomId}`);
    initializeRoomGauges(roomId);

    /* NEW: Restore toggle state from sessionStorage */
    const savedStates =
      JSON.parse(sessionStorage.getItem("switchStates")) || {};
    const isOn = savedStates[roomId] || false;
    window.switchStates[roomId] = isOn;
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
    const statusTextElement = document.getElementById(`status-text-${roomId}`);
    if (statusTextElement) {
      statusTextElement.textContent = isOn ? "Status: On" : "Status: Off";
    }

    let storedRooms = JSON.parse(sessionStorage.getItem("addedRooms")) || [];
    if (!storedRooms.includes(roomId)) {
      storedRooms.push(roomId);
      sessionStorage.setItem("addedRooms", JSON.stringify(storedRooms));
    }

    roomDropdown.classList.remove("show");
  }

  function toggleRoomSwitch(roomId) {
    /* CHANGED: Updated to send MQTT commands and persist state */
    if (window.pendingToggles[roomId]) {
      console.warn(`Toggle pending for Room ${roomId}, aborting.`);
      return;
    }

    window.pendingToggles[roomId] = true;
    const isOn = !window.switchStates[roomId];
    window.switchStates[roomId] = isOn;

    const savedStates =
      JSON.parse(sessionStorage.getItem("switchStates")) || {};
    savedStates[roomId] = isOn;
    sessionStorage.setItem("switchStates", JSON.stringify(savedStates));

    const command = isOn ? "ON" : "OFF";
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
        window.pendingToggles[roomId] = false;
      });
  }

  let storedRooms = JSON.parse(sessionStorage.getItem("addedRooms")) || [];
  storedRooms.forEach((roomId) => {
    if (roomId !== 41) {
      addRoomGauge(roomId);
    }
  });

  /* NEW: Expose toggleRoomSwitch globally for Room 41 */
  window.toggleRoomSwitch = toggleRoomSwitch;
});
