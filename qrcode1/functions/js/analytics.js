
const cache = { overview: null, events: null, timestamp: 0 };
const CACHE_DURATION = 5 * 60 * 1000;

// ---------------- Loading Overlay ----------------
function showLoading(show = true) {
  let overlay = document.getElementById("loadingOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "loadingOverlay";
    overlay.className = "fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50";
    overlay.innerHTML = `
      <div class="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center">
        <div class="animate-spin rounded-full h-10 w-10 border-t-4 border-amber-600 border-solid mb-3"></div>
        <p class="text-gray-700 font-medium">Loading analytics...</p>
      </div>
    `;
    document.body.appendChild(overlay);
  }
  overlay.classList.toggle("hidden", !show);
}

// ---------------- Overview ----------------
async function loadOverview() {
  const now = Date.now();

  // Use cache if valid
  if (cache.overview && now - cache.timestamp < CACHE_DURATION) {
    updateOverviewUI(cache.overview);
    return;
  }

  showLoading(true);
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
  } finally {
    showLoading(false);
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

  // Use cache if valid
  if (cache.events && now - cache.timestamp < CACHE_DURATION) {
    renderAllCharts(cache.events);
    return;
  }

  showLoading(true);
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
  } finally {
    showLoading(false);
  }
}

function renderAllCharts(countries) {
  renderInvitedPie(countries);
  renderCountryBar(countries);
  renderLeafletMap(countries);
}

// ---------------- Pie Chart ----------------
function renderInvitedPie(countries) {
  const totalInvited = countries.reduce((sum, c) => sum + c.invited, 0);
  const totalNotInvited = countries.reduce((sum, c) => sum + c.notInvited, 0);

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

// ---------------- Leaflet Map ----------------
async function renderLeafletMap(countries) {
  if (window.leafletMap) window.leafletMap.remove();

  const map = L.map("leafletMap").setView([20, 0], 2);
  window.leafletMap = map;

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  countries.forEach(c => {
    if (!c.lat || !c.lng) return;

    const radius = 50000 + c.users * 1000;

    L.circle([c.lat, c.lng], {
      color: "#f59e0b",
      fillColor: "#f59e0b",
      fillOpacity: 0.5,
      radius
    }).addTo(map)
      .bindPopup(`<b>${c.country.replace(/_/g, " ")}</b><br>Users: ${c.users}<br>Events: ${c.events}`);
  });
}
