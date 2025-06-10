function createCO2Gauge(canvasId) {
  if (typeof canvasId !== "string") {
    console.error(
      `⛔ Invalid canvasId: Expected string, got ${typeof canvasId}`,
      canvasId
    );
    return null;
  }

  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    // console.error(`⛔ Canvas for Room ${canvasId} not found!`);
    return null;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    console.error(`⛔ Could not get 2D context for ${canvasId}!`);
    return null;
  }

  // console.log(`✅ Creating CO2 gauge for ${canvasId}`);

  const gauge = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["CO2 Level"],
      datasets: [
        {
          data: [0, 100],
          backgroundColor: ["#4CAF50", "#e0e0e0"],
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      cutout: "70%",
      rotation: -90, // Start from bottom
      circumference: 180, // Half-circle gauge
      plugins: {
        tooltip: { enabled: false },
        legend: { display: false },
        datalabels: {
          color: "#000",
          font: { size: 16, weight: "bold" },
          formatter: (value) => value,
        },
      },
    },
  });

  if (!window.roomGauges) window.roomGauges = {};
  window.roomGauges[canvasId] = gauge;

  return gauge;
}

window.createCO2Gauge = createCO2Gauge;

function updateCO2Gauge(canvasId, co2PPM) {
  if (!window.roomGauges || !window.roomGauges[canvasId]) {
    // console.error(`⛔ Gauge for Room ${canvasId} is not initialized yet!`);
    return;
  }

  const gauge = window.roomGauges[canvasId];

  const minPPM = 400;
  const maxPPM = 2000;
  const gaugePercentage = ((co2PPM - minPPM) / (maxPPM - minPPM)) * 100;

  let color;
  if (co2PPM < 600) {
    color = "#4CAF50"; // Green for good
  } else if (co2PPM < 1000) {
    color = "#FFC107"; // Yellow for moderate
  } else {
    color = "#FF5252"; // Red for poor
  }

  // ✅ Ensure the dataset exists before updating
  if (gauge.data && gauge.data.datasets) {
    gauge.data.datasets[0].backgroundColor = [color, "#e0e0e0"];
    gauge.data.datasets[0].data = [gaugePercentage, 100 - gaugePercentage];
    gauge.update();
    // console.log(`✅ Updated CO2 Gauge for ${canvasId}: ${co2PPM} PPM`);
  } else {
    console.error(`❌ Chart data is missing for Room ${canvasId}`);
  }
}

// Make function globally available
window.updateCO2Gauge = updateCO2Gauge;

function createPM25Gauge(canvasId) {
  if (typeof canvasId !== "string") {
    console.error(
      `⛔ Invalid canvasId: Expected string, got ${typeof canvasId}`,
      canvasId
    );
    return null;
  }

  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    // console.error(`⛔ Canvas for Room ${canvasId} not found!`);
    return null;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    console.error(`⛔ Could not get 2D context for ${canvasId}!`);
    return null;
  }

  // console.log(`✅ Creating CO gauge for ${canvasId}`);

  const gauge = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["PM25 Level"],
      datasets: [
        {
          data: [0, 100],
          backgroundColor: ["#4CAF50", "#e0e0e0"],
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      cutout: "70%",
      rotation: -90, // Start from bottom
      circumference: 180, // Half-circle gauge
      plugins: {
        tooltip: { enabled: false },
        legend: { display: false },
        datalabels: {
          color: "#000",
          font: { size: 16, weight: "bold" },
          formatter: (value) => value,
        },
      },
    },
  });

  if (!window.roomGauges) window.roomGauges = {};
  window.roomGauges[canvasId] = gauge;

  return gauge;
}

window.createPM25Gauge = createPM25Gauge;

function updatePM25Gauge(canvasId, pm25PPM) {
  if (!window.roomGauges || !window.roomGauges[canvasId]) {
    // console.error(`⛔ Gauge for Room ${canvasId} is not initialized yet!`);
    return;
  }

  const gauge = window.roomGauges[canvasId];

  const minPPM = 0;
  const maxPPM = 100;
  const gaugePercentage = ((pm25PPM - minPPM) / (maxPPM - minPPM)) * 100;

  let color;
  if (pm25PPM < 15) {
    color = "#4CAF50"; // Green for good
  } else if (pm25PPM < 40) {
    color = "#FFC107"; // Yellow for moderate
  } else {
    color = "#FF5252"; // Red for poor
  }

  // ✅ Ensure the dataset exists before updating
  if (gauge.data && gauge.data.datasets) {
    gauge.data.datasets[0].backgroundColor = [color, "#e0e0e0"];
    gauge.data.datasets[0].data = [gaugePercentage, 100 - gaugePercentage];
    gauge.update();
    // console.log(`✅ Updated PM25 Gauge for ${canvasId}: ${pm25PPM} PPM`);
  } else {
    console.error(`❌ Chart data is missing for Room ${canvasId}`);
  }
}

// Make function globally available
window.updatePM25Gauge = updatePM25Gauge;

function createCOGauge(canvasId) {
  if (typeof canvasId !== "string") {
    console.error(
      `⛔ Invalid canvasId: Expected string, got ${typeof canvasId}`,
      canvasId
    );
    return null;
  }

  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    // console.error(`⛔ Canvas for Room ${canvasId} not found!`);
    return null;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    console.error(`⛔ Could not get 2D context for ${canvasId}!`);
    return null;
  }

  // console.log(`✅ Creating CO gauge for ${canvasId}`);

  const gauge = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["CO Level"],
      datasets: [
        {
          data: [0, 100],
          backgroundColor: ["#4CAF50", "#e0e0e0"],
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      cutout: "70%",
      rotation: -90, // Start from bottom
      circumference: 180, // Half-circle gauge
      plugins: {
        tooltip: { enabled: false },
        legend: { display: false },
        datalabels: {
          color: "#000",
          font: { size: 16, weight: "bold" },
          formatter: (value) => value,
        },
      },
    },
  });

  if (!window.roomGauges) window.roomGauges = {};
  window.roomGauges[canvasId] = gauge;

  return gauge;
}

window.createCOGauge = createCOGauge;

function updateCOGauge(canvasId, coPPM) {
  if (!window.roomGauges || !window.roomGauges[canvasId]) {
    // console.error(`⛔ Gauge for Room ${canvasId} is not initialized yet!`);
    return;
  }

  const gauge = window.roomGauges[canvasId];

  const minPPM = 0;
  const maxPPM = 20;
  const gaugePercentage = ((coPPM - minPPM) / (maxPPM - minPPM)) * 100;

  let color;
  if (coPPM < 5) {
    color = "#4CAF50"; // Green for good
  } else if (coPPM < 10) {
    color = "#FFC107"; // Yellow for moderate
  } else {
    color = "#FF5252"; // Red for poor
  }

  // ✅ Ensure the dataset exists before updating
  if (gauge.data && gauge.data.datasets) {
    gauge.data.datasets[0].backgroundColor = [color, "#e0e0e0"];
    gauge.data.datasets[0].data = [gaugePercentage, 100 - gaugePercentage];
    gauge.update();
    // console.log(`✅ Updated CO Gauge for ${canvasId}: ${coPPM} PPM`);
  } else {
    console.error(`❌ Chart data is missing for Room ${canvasId}`);
  }
}

// Make function globally available
window.updateCOGauge = updateCOGauge;

function getTempColor(temp) {
  return temp < 20 ? "#2196F3" : temp < 30 ? "#FF9800" : "#F44336";
}

function getHumidityColor(humidity) {
  return humidity < 30 ? "#FFEB3B" : humidity < 70 ? "#4CAF50" : "#2196F3";
}

function getAQIColor(humidity) {
  return humidity < 100 ? "#00C853" : humidity < 300 ? "#FF9800" : "#D32F2F";
}

function createVegaGauge(elementId, value, maxValue, colorFunc, unit) {
  const spec = {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    width: 70,
    height: 280,
    data: { values: [{ value: value }] },
    mark: "bar",
    encoding: {
      x: { field: "label", type: "nominal", axis: null },
      y: {
        field: "value",
        type: "quantitative",
        scale: { domain: [0, maxValue] },
      },
      color: {
        value: colorFunc(value),
      },
    },
  };
  vegaEmbed(`#${elementId}`, spec, { renderer: "svg" });
}

function updateVegaGauge(
  elementId,
  value,
  maxValue,
  colorFunc,
  displayElement,
  unit
) {
  const newSpec = {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    width: 70,
    height: 280,
    data: { values: [{ value: value }] },
    mark: "bar",
    encoding: {
      x: { field: "label", type: "nominal", axis: null },
      y: {
        field: "value",
        type: "quantitative",
        scale: { domain: [0, maxValue] },
      },
      color: { value: colorFunc(value) },
    },
  };

  // Render the gauge using VegaEmbed
  vegaEmbed(`#${elementId}`, newSpec, { renderer: "svg" });

  // Update the display text with new values
  const displayElementRef = document.getElementById(displayElement);
  if (displayElementRef) {
    displayElementRef.textContent = `${unit}: ${value.toFixed(1)}`;
  }
}
