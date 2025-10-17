const cache = { overview: null, events: null, timestamp: 0 };
const CACHE_DURATION = 5 * 60 * 1000;

// ---------------- Skeletons ----------------
function showSkeletons() {
  // Overview cards
  ["totalCountries", "totalUsers", "totalEvents", "totalInvited"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = `<div class="h-6 w-12 mx-auto bg-gray-300 rounded animate-pulse"></div>`;
    }
  });

  // Charts
  [
    { container: "invitedPieChartContainer", canvas: "invitedPieChart" },
    { container: "countryBarChartContainer", canvas: "countryBarChart" }
  ].forEach(c => {
    const container = document.getElementById(c.container);
    const canvas = document.getElementById(c.canvas);
    if (container && canvas) {
      canvas.classList.add("hidden"); // hide actual canvas
      const skeleton = container.querySelector("div");
      if (skeleton) skeleton.classList.remove("hidden");
    }
  });
}

function hideSkeletons() {
  [
    { container: "invitedPieChartContainer", canvas: "invitedPieChart" },
    { container: "countryBarChartContainer", canvas: "countryBarChart" }
  ].forEach(c => {
    const container = document.getElementById(c.container);
    const canvas = document.getElementById(c.canvas);
    if (container && canvas) {
      canvas.classList.remove("hidden"); // show canvas
      const skeleton = container.querySelector("div");
      if (skeleton) skeleton.classList.add("hidden");
    }
  });
}

// ---------------- Overview ----------------
async function loadOverview() {
  showSkeletons();
  const now = Date.now();

  if (cache.overview && now - cache.timestamp < CACHE_DURATION) {
    updateOverviewUI(cache.overview);
    return;
  }

  try {
    const res = await fetch(`${BASE_URL}/analytics/overview`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    cache.overview = data; 
    cache.timestamp = now;
    updateOverviewUI(data);
  } catch (err) { 
    console.error("❌ Failed to load overview:", err);
    alert("Failed to load overview data.");
  }
}

function updateOverviewUI(data) {
  document.getElementById("totalCountries").textContent = data.totalCountries ?? "-";
  document.getElementById("totalUsers").textContent = data.totalUsers ?? "-";
  document.getElementById("totalEvents").textContent = data.totalEvents ?? "-";
  document.getElementById("totalInvited").textContent = data.totalInvited ?? "-";
}

// ---------------- Charts ----------------
async function loadCharts() {
  const now = Date.now();

  if (cache.events && now - cache.timestamp < CACHE_DURATION) {
    renderAllCharts(cache.events);
    return;
  }

  try {
    const res = await fetch(`${BASE_URL}/analytics/countries`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    cache.events = data;
    cache.timestamp = now;
    renderAllCharts(data);
  } catch (err) {
    console.error("❌ Failed to load charts:", err);
    alert("Failed to load chart data.");
  }
}

function renderAllCharts(countries) {
  renderInvitedPie(countries);
  renderCountryBar(countries);
}

// ---------------- Pie Chart ----------------
function renderInvitedPie(countries) {
  const totalInvited = countries.reduce((sum, c) => sum + c.invited, 0);
  const totalNotInvited = countries.reduce((sum, c) => sum + c.notInvited, 0);

  hideSkeletons();
  new Chart(document.getElementById("invitedPieChart"), {
    type: "pie",
    data: {
      labels: ["Invited", "Not Invited"],
      datasets: [{
        data: [totalInvited, totalNotInvited],
        backgroundColor: ["#f59e0b", "#d1d5db"]
      }]
    },
    options: { responsive: true, plugins: { legend: { position: "bottom" } } }
  });
}

// ---------------- Bar Chart ----------------
function renderCountryBar(countries) {
  const labels = countries.map(c => c.country);
  const users = countries.map(c => c.users);
  const events = countries.map(c => c.events);

  hideSkeletons();
  new Chart(document.getElementById("countryBarChart"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Users", data: users, backgroundColor: "#f59e0b" },
        { label: "Events", data: events, backgroundColor: "#60a5fa" }
      ]
    },
    options: {
      responsive: true,
      scales: { y: { beginAtZero: true } },
      plugins: { legend: { position: "bottom" } }
    }
  });
}
