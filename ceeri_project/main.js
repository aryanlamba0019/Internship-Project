let co2Gauge = null;
let co2Interval = null;
let trendsChart = null;
let currentRoomId;

document.addEventListener("DOMContentLoaded", () => {
  const socket = io("http://localhost:5001");

  // Redirect if not authenticated
  if (!sessionStorage.getItem("userType")) {
    // Use sessionStorage instead of localStorage
    // console.log("No userType found, redirecting to login...");
    window.location.replace(
      "/var/www/html/sensor_iot/ceeri_project/Login_and_reg/login.html"
    );
    return;
  }

  // DOM Elements
  const elements = {
    section: document.getElementById("co2MonitoringSection"),
    canvas: document.getElementById("co2Gauge"),
    manageBtn: document.querySelector(".manage-rooms-btn"),
    dropdown: document.querySelector(".manage-dropdown-content"),
    createBtn: document.getElementById("createRoomBtn"),
    removeBtn: document.getElementById("removeRoomBtn"),
    logoutBtn: document.getElementById("logoutBtn"),
    aboutModal: document.getElementById("aboutModal"),
    aboutBtn: document.getElementById("aboutBtn"),
    aboutClose: document.querySelector("#aboutModal .close"),
    contactModal: document.getElementById("contactModal"),
    contactBtn: document.getElementById("contactBtn"),
    contactClose: document.querySelector("#contactModal .close"),
    contactForm: document.getElementById("contactForm"),
    messageInput: document.getElementById("message"),
    registrationBtn: document.getElementById("userregistration"),
    registrationModal: document.getElementById("registrationModal"),
    registrationClose: document.querySelector("#registrationModal .close"),
    // manualCtrlBtn: document.getElementById("manualctrl"),
    // manualControlSection: document.getElementById("manualControlSection"),
    masterCtrlBtn: document.getElementById("masterctrl"),
    masterControlSection: document.getElementById("masterControlSection"),
    co2monitoring: document.getElementById("co2monitoring"),
    adminNameDisplay: document.getElementById("greeting"),
    trendsModal: document.getElementById("trendsModal"),
    trendsClose: document.getElementsByClassName("trends-close")[0],
    particulateSelect: document.getElementById("particulateSelect"),
    periodOptions: document.querySelectorAll(".trends-sidebar li"),
    trendsRoomIdDisplay: document.getElementById("trendsRoomId"),
  };

  async function fetchAdminName() {
    try {
      const response = await fetch("http://localhost:5001/admin_info", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionStorage.getItem("token")}`, // Ensure token is stored in sessionStorage
        },
      });

      if (!response.ok) throw new Error("Failed to fetch admin info");

      const data = await response.json();
      if (elements.adminNameDisplay) {
        elements.adminNameDisplay.textContent = `Hello, ${data.firstname} ${data.lastname}`;
      }
    } catch (error) {
      console.error("Error fetching admin name:", error);
    }
  }

  // Call the function after login
  fetchAdminName();

  // /* NEW: Initialize toggle states from sessionStorage */
  // function initializeToggleStates() {
  //   const savedStates =
  //     JSON.parse(sessionStorage.getItem("switchStates")) || {};
  //   for (const roomId in savedStates) {
  //     window.switchStates[roomId] = savedStates[roomId];
  //     const icon = document.getElementById(`toggle-icon-${roomId}`);
  //     if (icon) {
  //       icon.className = savedStates[roomId]
  //         ? "fa-solid fa-toggle-on"
  //         : "fa-solid fa-toggle-off";
  //       const switchIcon = icon.parentElement;
  //       if (switchIcon) {
  //         switchIcon.style.backgroundColor = savedStates[roomId]
  //           ? "#4CAF50"
  //           : "#FF5252";
  //       }
  //     }
  //     const statusText = document.getElementById(`status-text-${roomId}`);
  //     if (statusText) {
  //       statusText.textContent = savedStates[roomId]
  //         ? "Status: On"
  //         : "Status: Off";
  //     }
  //   }
  // }

  // initializeToggleStates();

  /* NEW: Initialize master switch state */
  function initializeMasterSwitchState(switchIcon, statusLabel) {
    const savedStates =
      JSON.parse(sessionStorage.getItem("switchStates")) || {};
    const roomIds = Object.keys(savedStates);
    const allOn = roomIds.length > 0 && roomIds.every((id) => savedStates[id]);
    switchIcon.classList.toggle("fa-toggle-on", allOn);
    switchIcon.classList.toggle("fa-toggle-off", !allOn);
    switchButton.style.backgroundColor = allOn ? "#4CAF50" : "#FF5252";
    statusLabel.textContent = allOn ? "Status: On" : "Status: Off";
  }

  async function initializeSubscriptions() {
    try {
      const response = await fetch("http://localhost:5001/api/rooms-status");
      if (!response.ok) throw new Error("Failed to fetch rooms");
      const rooms = await response.json();
      rooms.forEach((room) => {
        fetch(`http://localhost:5001/api/rooms/${room.room_number}/subscribe`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
          },
        }).catch((err) =>
          console.error(`Error subscribing to Room ${room.room_number}:`, err)
        );
      });
    } catch (error) {
      console.error("Error initializing subscriptions:", error);
    }
  }

  initializeSubscriptions();

  // Function to hide all sections
  window.hideAllSections = function () {
    elements.section.style.display = "none";
    elements.masterControlSection.style.display = "none";
  };

  // CO2 Monitoring Button
  if (elements.co2monitoring) {
    elements.co2monitoring.onclick = () => {
      hideAllSections();
      elements.section.style.display = "block";
    };
  }

  // CO2 Monitoring Toggle
  // function toggleCO2Monitoring() {
  //   if (elements.section.style.display === "none") {
  //     elements.section.style.display = "block";
  //     if (!co2Gauge) {
  //       co2Gauge = createCO2Gauge(elements.canvas.getContext("2d"));
  //       co2Interval = setInterval(
  //         () => updateCO2Gauge(co2Gauge, Math.floor(Math.random() * 100)),
  //         3000
  //       );
  //     }
  //   } else {
  //     elements.section.style.display = "none";
  //     if (co2Interval) {
  //       clearInterval(co2Interval);
  //       co2Interval = null;
  //     }
  //   }
  // }

  // Logout Functionality
  if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener("click", () => {
      // console.log("Logout button clicked");
      localStorage.removeItem("user");
      sessionStorage.clear();
      window.location.replace("Login_and_reg/login.html");
    });
  }

  // About Modal
  if (elements.aboutBtn && elements.aboutModal && elements.aboutClose) {
    elements.aboutBtn.onclick = () =>
      (elements.aboutModal.style.display = "block");
    elements.aboutClose.onclick = () =>
      (elements.aboutModal.style.display = "none");
  }

  // Contact Modal
  if (elements.contactBtn && elements.contactModal && elements.contactClose) {
    elements.contactBtn.onclick = () =>
      (elements.contactModal.style.display = "block");
    elements.contactClose.onclick = () =>
      (elements.contactModal.style.display = "none");
  }

  // Contact Form Submission
  if (elements.contactForm) {
    elements.contactForm.onsubmit = (e) => {
      e.preventDefault();
      const message = elements.messageInput.value;
      if (message) {
        window.location.href = `mailto:aryanlamba838@gmail.com?subject=Contact Us&body=${encodeURIComponent(
          message
        )}`;
        elements.contactModal.style.display = "none";
      } else {
        alert("Please enter a message.");
      }
    };
  }

  // Registration Modal - showing up
  if (
    elements.registrationBtn &&
    elements.registrationModal &&
    elements.registrationClose
  ) {
    elements.registrationBtn.onclick = () => {
      elements.registrationModal.style.display = "block";
      console.log("Registration button clicked");
    };
    elements.registrationClose.onclick = () =>
      (elements.registrationModal.style.display = "none");

    // Add this to attach the handler
    const registrationForm = document.getElementById("registrationForm");
    if (registrationForm) {
      registrationForm.onsubmit = handleRegistration;
    }
  }

  // Add handleRegistration function (already provided, just placing it here)
  function handleRegistration(event) {
    console.log("handleRegistration called");
    event.preventDefault(); // Prevent default form submission

    console.log("Checking form elements...");

    const fname = document.getElementById("fname");
    const lname = document.getElementById("lname");
    const email = document.getElementById("email");
    const password = document.getElementById("password");
    const roomNumber = document.getElementById("room-number");

    if (!fname || !lname || !email || !roomNumber || !password) {
      console.error("One or more form elements not found!");
      alert("Form elements missing. Please check the form.");
      return;
    }

    console.log("Room Number:", roomNumber.value);

    const formData = {
      firstname: fname.value,
      lastname: lname.value,
      email: email.value,
      password: password.value,
      room_number: roomNumber.value,
    };

    fetch("http://localhost:5001/api/submit_registration", {
      // Updated port to 5001
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Response from server:", data);
        if (data.message === "Registration successful") {
          alert("Registration successful!");
          document.getElementById("registrationModal").style.display = "none";
        } else {
          alert("Registration failed. " + (data.message || ""));
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        alert("Error submitting registration form.");
      });
  }

  // Room Management Dropdown
  if (elements.manageBtn && elements.dropdown) {
    elements.manageBtn.onclick = (e) => {
      // console.log("Manage Rooms button clicked");
      e.stopPropagation();
      elements.dropdown.classList.toggle("show");
    };

    window.onclick = (e) => {
      if (
        !e.target.closest(".manage-rooms-btn") &&
        elements.dropdown.classList.contains("show")
      ) {
        elements.dropdown.classList.remove("show");
      }
    };
  }

  // Create Room
  if (elements.createBtn) {
    elements.createBtn.onclick = async () => {
      // console.log("Create Room button clicked");
      const roomNumber = prompt("Enter room number:");
      if (roomNumber) {
        try {
          const response = await fetch("http://localhost:5001/api/rooms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room_number: parseInt(roomNumber) }),
          });

          if (!response.ok) throw new Error(await response.text());

          alert("Room added successfully");
        } catch (error) {
          console.error("Error:", error);
          alert("Failed to add room");
        }
        elements.dropdown.classList.remove("show");
      }
    };
  }

  // Remove Room
  if (elements.removeBtn) {
    elements.removeBtn.onclick = async () => {
      // console.log("Remove Room button clicked");
      const roomNumber = prompt("Enter room number to remove:");
      if (roomNumber) {
        try {
          const response = await fetch(
            `http://localhost:5001/api/rooms/${roomNumber}`,
            { method: "DELETE" }
          );

          if (!response.ok) throw new Error(await response.text());

          alert("Room removed successfully");
        } catch (error) {
          console.error("Error:", error);
          alert("Failed to remove room");
        }
        elements.dropdown.classList.remove("show");
      }
    };
  }

  // Subscribe to all rooms on page load
  async function initializeSubscriptions() {
    try {
      const response = await fetch("http://localhost:5001/api/rooms-status");
      if (!response.ok) throw new Error("Failed to fetch rooms");
      const rooms = await response.json();
      rooms.forEach((room) => {
        fetch(`http://localhost:5001/api/rooms/${room.room_number}/subscribe`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
          },
        }).catch((err) =>
          console.error(`Error subscribing to Room ${room.room_number}:`, err)
        );
      });
    } catch (error) {
      console.error("Error initializing subscriptions:", error);
    }
  }

  initializeSubscriptions();

  // Master Control Button
  if (elements.masterCtrlBtn) {
    elements.masterCtrlBtn.onclick = () => {
      // console.log("Master Control button clicked");

      hideAllSections(); // Hide everything first
      elements.masterControlSection.style.display = "flex"; // Show Master Control
      elements.masterControlSection.innerHTML = ""; // Clear previous content

      const switchButton = document.createElement("button");
      switchButton.classList.add("master-switch-button");

      const switchIcon = document.createElement("i");
      switchIcon.classList.add("fa-solid", "fa-toggle-off");
      switchButton.appendChild(switchIcon);

      const statusLabel = document.createElement("span");
      statusLabel.textContent = "Status: Off";
      statusLabel.classList.add("master-status-label");

      elements.masterControlSection.appendChild(switchButton);
      elements.masterControlSection.appendChild(statusLabel);

      switchButton.onclick = () =>
        toggleMasterSwitch(switchButton, switchIcon, statusLabel);
    };
  } else {
    console.error("Master Control button not found");
  }

  async function updateRoomStatus(
    roomNumber,
    switchButton,
    switchIcon,
    statusLabel
  ) {
    try {
      const newStatus = switchIcon.classList.contains("fa-toggle-on")
        ? "off"
        : "on";
      const response = await fetch(
        `http://localhost:5001/api/rooms/${roomNumber}/status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (response.ok) {
        switchIcon.classList.toggle("fa-toggle-on");
        switchIcon.classList.toggle("fa-toggle-off");
        statusLabel.textContent = newStatus === "on" ? "On" : "Off";
      } else {
        console.error("Failed to update room status");
      }
    } catch (error) {
      console.error("Error updating room status:", error);
    }
  }

  function attachTrendsButtonListeners() {
    document.querySelectorAll(".view-trends-btn").forEach((btn) => {
      btn.onclick = () => {
        currentRoomId = btn.id.split("_")[1];
        elements.trendsRoomIdDisplay.textContent = currentRoomId;
        trendsModal.style.display = "block";
        fetchAndDisplayTrends(currentRoomId, "CO2", "last-hour");
        elements.periodOptions.forEach((opt) => opt.classList.remove("active"));
        elements.periodOptions[0].classList.add("active");
      };
    });
  }

  attachTrendsButtonListeners();

  const observer = new MutationObserver(() => attachTrendsButtonListeners());
  observer.observe(document.querySelector(".gauges-container"), {
    childList: true,
  });

  elements.trendsClose.onclick = () => {
    trendsModal.style.display = "none";
    if (trendsChart && typeof trendsChart.destroy === "function") {
      trendsChart.destroy();
      trendsChart = null;
    }
  };

  particulateSelect.onchange = () => {
    const selectedParticulate = particulateSelect.value;
    const activePeriod = document.querySelector(".trends-sidebar li.active")
      .dataset.period;
    fetchAndDisplayTrends(currentRoomId, selectedParticulate, activePeriod);
  };

  elements.periodOptions.forEach((option) => {
    option.onclick = () => {
      elements.periodOptions.forEach((opt) => opt.classList.remove("active"));
      option.classList.add("active");
      const selectedParticulate = particulateSelect.value;
      const selectedPeriod = option.dataset.period;
      fetchAndDisplayTrends(currentRoomId, selectedParticulate, selectedPeriod);
    };
  });

  async function fetchAndDisplayTrends(roomId, particulate, period) {
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
        default:
          startTime = new Date(now.getTime() - 60 * 60 * 1000);
      }

      const response = await fetch(
        `http://localhost:5001/api/rooms/${roomId}/trends?startTime=${startTime.getTime()}`,
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) throw new Error(await response.text());

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

      // Safely destroy the previous chart if it exists
      if (trendsChart && typeof trendsChart.destroy === "function") {
        trendsChart.destroy();
        trendsChart = null;
      }

      const ctx = document.getElementById("trendsChart").getContext("2d");
      if (!ctx) {
        console.error("Trends chart canvas context not found!");
        return;
      }

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
            x: { title: { display: true, text: "Time" } },
            y: {
              title: {
                display: true,
                text:
                  particulate === "Temperature"
                    ? "Temperature (Â°C)"
                    : particulate === "Humidity"
                    ? "Humidity (%)"
                    : particulate === "AQI"
                    ? "AQI"
                    : `${particulate} (PPM)`,
              },
              beginAtZero: true,
            },
          },
          plugins: { legend: { display: true, position: "top" } },
        },
      });
    } catch (error) {
      console.error("Error fetching trends:", error);
      alert(
        "Failed to load trends data. Please ensure data exists for this room."
      );
    }
  }
});
