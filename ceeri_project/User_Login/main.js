let autoRelayOn = false;
const CO2_THRESHOLD = 1000;

const token = sessionStorage.getItem("token");
if (!token) {
  window.location.href = "../Login_and_reg/login.html";
}

let ws = null;

document.getElementById("logout").addEventListener("click", function (event) {
  event.preventDefault();

  const token = localStorage.getItem("jwtToken");

  if (token) {
    fetch("http://localhost:5002/logout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then((response) => response.json())
      .then((data) => console.log(data.message))
      .catch((error) => console.error("Logout error:", error));
  }

  localStorage.removeItem("jwtToken");
  sessionStorage.clear();
  window.location.href = "../Login_and_reg/login.html";
});

//Function to update username and room number
document.addEventListener("DOMContentLoaded", async () => {
  const ctx = document.getElementById("co2Gauge")?.getContext("2d");
  if (!ctx) {
    console.error("Canvas for CO2 gauge not found.");
    return;
  }
  window.co2Gauge = createCO2Gauge(ctx);

  const pm25Ctx = document.getElementById("pm25Gauge")?.getContext("2d");
  if (pm25Ctx) {
    window.pm25Gauge = createPM25Gauge("pm25Gauge");
  }

  const coCtx = document.getElementById("coGauge")?.getContext("2d");
  if (coCtx) {
    window.coGauge = createCOGauge("coGauge");
  }

  const token = sessionStorage.getItem("token");
  try {
    const response = await fetch("http://localhost:5002/user_info", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const userData = await response.json();
    userRoomNumber = userData.room_number;

    document.getElementById(
      "greeting"
    ).innerText = `Hello, ${userData.firstname} ${userData.lastname}`;
    document.getElementById(
      "room-no"
    ).innerHTML = `<u>Room Number - ${userData.room_number}</u>`;

    // Periodically fetch the latest data from MongoDB
    const fetchLatestData = async () => {
      try {
        const response = await fetch(
          `http://localhost:5002/api/rooms/${userRoomNumber}/latest-data`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        const latestData = await response.json();

        if (latestData.data) {
          const { CO2, PM25, CO, Temperature, Humidity, AQI } = latestData.data;

          if (window.co2Gauge && typeof CO2 === "number") {
            const normalizedValue = (CO2 - 400) / 16;
            updateCO2Gauge(window.co2Gauge, normalizedValue, CO2);
            document.getElementById(
              "co2Value"
            ).textContent = `CO2 Level: ${CO2} PPM`;
            if (CO2 > CO2_THRESHOLD && !autoRelayOn) {
              console.log("🔴 CO2 too high — turning relay ON automatically");
              sendRelayCommand("ON");
              autoRelayOn = true;
            } else if (CO2 <= CO2_THRESHOLD && autoRelayOn) {
              console.log(
                "🟢 CO2 normalized — turning relay OFF automatically"
              );
              sendRelayCommand("OFF");
              autoRelayOn = false;
            }
          }

          if (window.pm25Gauge && typeof PM25 === "number") {
            updatePM25Gauge("pm25Gauge", PM25);
            document.getElementById(
              "pm25Value"
            ).textContent = `PM2.5 Level: ${PM25} PPM`;
          }

          if (window.coGauge) {
            const CO = parseFloat(latestData.data.CO); // Convert string to number
            if (!isNaN(CO)) {
              console.log(`Updating CO gauge with value: ${CO}`);
              updateCOGauge("coGauge", CO);
              const coValueElement = document.getElementById("coValue");
              if (coValueElement) {
                coValueElement.textContent = `CO Level: ${CO} PPM`;
              } else {
                console.error("CO value element not found in DOM");
              }
            } else {
              console.warn(
                "CO gauge not updated. Invalid CO value:",
                latestData.data.CO
              );
            }
          } else {
            console.warn("CO gauge not initialized:", !!window.coGauge);
          }

          if (Temperature !== undefined) {
            updateVegaGauge(
              "temperatureGauge",
              Temperature,
              50,
              getTempColor,
              "temperatureValue",
              "Temperature",
              "Temperature (°C)"
            );
            document.getElementById(
              "temperatureValue"
            ).textContent = `Temperature: ${Temperature}°C`;
          }

          if (Humidity !== undefined) {
            updateVegaGauge(
              "humidityGauge",
              Humidity,
              100,
              getHumidityColor,
              "humidityValue",
              "Humidity",
              "Humidity (%)"
            );
            document.getElementById(
              "humidityValue"
            ).textContent = `Humidity: ${Humidity}%`;
          }

          if (AQI !== undefined) {
            updateVegaGauge(
              "AQIGauge",
              AQI,
              500,
              getAQIColor,
              "AQIValue",
              "AQI",
              "AQI"
            );
            document.getElementById("AQIValue").textContent = `AQI: ${AQI}`;
          }

          // Update timestamp
          const timestampElement = document.getElementById("timestamp");
          if (timestampElement) {
            if (latestData.timestamp) {
              const time = new Date(latestData.timestamp);
              if (!isNaN(time)) {
                const options = {
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
                console.log("Raw timestamp:", latestData.timestamp);
                console.log("Formatted IST:", formattedDateTime);
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
            console.error(
              "Timestamp element not found in DOM. Available IDs:",
              Array.from(document.querySelectorAll("[id]")).map((el) => el.id)
            );
          }
        }
      } catch (error) {
        console.error("Error fetching latest data:", error);
      }
    };

    fetchLatestData();
    setInterval(fetchLatestData, 5000);

    ws = new WebSocket("ws://localhost:8080");
    ws.onopen = () => {
      ws.send(JSON.stringify({ room: userData.room_number }));
    };
    ws.onmessage = async function (event) {
      let data;
      if (typeof event.data === "string") {
        data = event.data;
      } else if (event.data instanceof Blob) {
        data = await event.data.text();
      } else {
        console.error("Unknown message type", event.data);
        return;
      }

      // Prevent parsing empty or whitespace-only messages
      if (!data || !data.trim()) {
        console.warn("Received empty WebSocket message, skipping parse.");
        return;
      }

      try {
        const json = JSON.parse(data);
        if (json.relay_status !== undefined) {
          const status = json.relay_status.toUpperCase();
          isOn = status === "ON";
          updateToggleUI(isOn);
          pendingToggle = false;
        }
      } catch (e) {
        console.error("Failed to parse JSON", e, data);
      }
    };
  } catch (error) {
    console.error("Error loading user data:", error);
  }
});

// Function to toggle status
let isOn = false; // tracks current relay state from ESP
let pendingToggle = false;

function toggleRoomSwitch() {
  console.log("Toggle button clicked. Current state:", isOn);

  if (pendingToggle || !userRoomNumber || !ws) {
    console.warn(
      "Toggle aborted. Pending:",
      pendingToggle,
      "UserRoom:",
      userRoomNumber
    );
    return;
  }

  pendingToggle = true;

  const newCommand = isOn ? "OFF" : "ON";
  console.log("Sending command to server:", newCommand);

  fetch("http://localhost:5002/send-toggle", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionStorage.getItem("token")}`,
    },
    body: JSON.stringify({ room_number: userRoomNumber, command: newCommand }),
  })
    .then((res) => res.json())
    .then((data) => {
      console.log("Server response:", data);
    })
    .catch((err) => {
      console.error("Toggle send error:", err);
      pendingToggle = false;
    });
}

function updateToggleUI(isOn) {
  document.getElementById("toggle-icon").className = isOn
    ? "fa-solid fa-toggle-on"
    : "fa-solid fa-toggle-off";

  const switchIcon = document.querySelector(".switch-icon");
  if (switchIcon) {
    switchIcon.style.backgroundColor = isOn ? "#4CAF50" : "#FF5252";
  }

  document.getElementById("status-text").innerText = isOn
    ? "Status: On"
    : "Status: Off";
}

function sendRelayCommand(command) {
  if (!userRoomNumber || !ws) return;

  fetch("http://localhost:5002/send-toggle", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionStorage.getItem("token")}`,
    },
    body: JSON.stringify({
      room_number: userRoomNumber,
      command: command,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      console.log(`Auto relay command '${command}' sent successfully`);
    })
    .catch((err) => {
      console.error("Failed to send auto relay command:", err);
    });
}

//Function for modals
document.addEventListener("DOMContentLoaded", () => {
  // Contact Us Modal functionality
  const contactBtn = document.getElementById("contactBtn");
  const contactModal = document.getElementById("contactModal");
  const contactClose = document.getElementsByClassName("close")[0];
  const sendContactMessageButton =
    document.getElementById("sendContactMessage");

  const trendsBtn = document.getElementById("viewTrendsBtn");
  const trendsModal = document.getElementById("trendsModal");
  const trendsClose = document.getElementsByClassName("trends-close")[0];
  const particulateSelect = document.getElementById("particulateSelect");
  const periodOptions = document.querySelectorAll(".sidebar li");
  let trendsChart = null;

  if (contactBtn && contactModal && contactClose) {
    contactBtn.onclick = () => (contactModal.style.display = "block");
    contactClose.onclick = () => (contactModal.style.display = "none");
  }

  // Contact Form Submission

  if (contactForm && messageInput && contactModal) {
    contactForm.onsubmit = (e) => {
      e.preventDefault();
      const message = messageInput.value.trim();

      if (message) {
        // Construct the mailto link
        const mailtoLink = `mailto:aryanlamba838@gmail.com?subject=Contact Us&body=${encodeURIComponent(
          message
        )}`;

        // Debugging: Check if mailtoLink is correct
        console.log("Opening mail client:", mailtoLink);

        // Open the user's default email client
        setTimeout(() => {
          window.location.href = mailtoLink;
        }, 300); // Delay slightly to prevent conflicts

        // Clear the input field
        messageInput.value = "";

        // Close the modal after a short delay
        setTimeout(() => {
          contactModal.style.display = "none";
        }, 500);
      } else {
        alert("Please enter a message.");
      }
    };
  }

  // Open Trends Modal
  trendsBtn.onclick = () => {
    trendsModal.style.display = "block";
    fetchAndDisplayTrends("CO2", "last-hour"); // Default to CO2, last hour
    periodOptions[0].classList.add("active"); // Highlight default period
  };

  // Close Trends Modal
  trendsClose.onclick = () => {
    trendsModal.style.display = "none";
    if (trendsChart) {
      trendsChart.destroy();
      trendsChart = null;
    }
  };

  // Particulate Dropdown Change
  particulateSelect.onchange = () => {
    const selectedParticulate = particulateSelect.value;
    const activePeriod =
      document.querySelector(".sidebar li.active").dataset.period;
    fetchAndDisplayTrends(selectedParticulate, activePeriod);
  };

  // Time Period Selection
  periodOptions.forEach((option) => {
    option.onclick = () => {
      periodOptions.forEach((opt) => opt.classList.remove("active"));
      option.classList.add("active");
      const selectedParticulate = particulateSelect.value;
      const selectedPeriod = option.dataset.period;
      fetchAndDisplayTrends(selectedParticulate, selectedPeriod);
    };
  });

  // Fetch Data and Display Trends
  async function fetchAndDisplayTrends(particulate, period) {
    try {
      const now = new Date();
      let startTime;

      switch (period) {
        case "last-hour":
          startTime = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case "last-day":
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case "this-week":
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "this-month":
          startTime = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "this-6-month":
          startTime = new Date(now.getFullYear(), now.getMonth() - 6, 1);
          break;
        case "this-year":
          startTime = new Date(now.getFullYear(), 0, 1);
          break;
      }

      const response = await fetch(
        `http://localhost:5002/api/rooms/${userRoomNumber}/trends?startTime=${startTime.getTime()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch trends data");

      const data = await response.json();

      const labels = data.map((d) =>
        new Date(d.timestamp).toLocaleString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          day: "2-digit",
          month: "2-digit",
        })
      );
      const values = data.map((d) =>
        d.data && d.data[particulate] != null
          ? parseFloat(d.data[particulate])
          : 0
      );

      // Calculate Min, Max, Avg
      const minValue = Math.min(...values);
      const maxValue = Math.max(...values);
      const avgValue = values.length
        ? (values.reduce((sum, val) => sum + val, 0) / values.length).toFixed(2)
        : 0;

      // Update the stats in the navbar
      const unit =
        particulate === "Temperature"
          ? "°C"
          : particulate === "Humidity"
          ? "%"
          : particulate === "AQI"
          ? ""
          : "PPM";
      document.getElementById(
        "minValue"
      ).textContent = `Min: ${minValue} ${unit}`;
      document.getElementById(
        "maxValue"
      ).textContent = `Max: ${maxValue} ${unit}`;
      document.getElementById(
        "avgValue"
      ).textContent = `Avg: ${avgValue} ${unit}`;

      // Destroy previous chart if exists
      if (trendsChart) {
        trendsChart.destroy();
      }

      // Create Line Chart
      const ctx = document.getElementById("trendsChart").getContext("2d");
      trendsChart = new Chart(ctx, {
        type: "line",
        data: {
          labels: labels,
          datasets: [
            {
              label: `${particulate} Trend`,
              data: values,
              borderColor: "#3498db",
              fill: false,
              tension: 0.1,
            },
          ],
        },
        options: {
          responsive: true,
          scales: {
            x: {
              title: { display: true, text: "Time" },
            },
            y: {
              title: {
                display: true,
                text:
                  particulate === "Temperature"
                    ? "Temperature (°C)"
                    : particulate === "Humidity"
                    ? "Humidity (%)"
                    : particulate === "AQI"
                    ? "AQI"
                    : `${particulate} (PPM)`,
              },
              beginAtZero: true,
            },
          },
          plugins: {
            legend: { display: true, position: "top" },
          },
        },
      });
    } catch (error) {
      console.error("Error fetching trends:", error);
    }
  }
});
