const cache = { overview: null, events: null, timestamp: 0 };
const CACHE_DURATION = 5 * 60 * 1000;

// ---------------- Overview ----------------
async function loadOverview() {
  const now = Date.now();
  if (cache.overview && now - cache.timestamp < CACHE_DURATION) return updateOverviewUI(cache.overview);
  try {
    const res = await fetch(`${BASE_URL}/analytics/overview`);
    const data = await res.json();
    cache.overview = data; 
    cache.timestamp = now;
    updateOverviewUI(data);
  } catch(err) { console.error(err); }
}

function updateOverviewUI(data){
  document.getElementById("totalCountries").textContent = data.totalCountries;
  document.getElementById("totalUsers").textContent = data.totalUsers;
  document.getElementById("totalEvents").textContent = data.totalEvents;
  document.getElementById("totalInvited").textContent = data.totalInvited;
}

// ---------------- Charts ----------------
async function loadCharts() {
  const now = Date.now();
  if (cache.events && now - cache.timestamp < CACHE_DURATION) return renderAllCharts(cache.events);
  try {
    const res = await fetch(`${BASE_URL}/analytics/countries`);
    const data = await res.json();
    cache.events = data; 
    cache.timestamp = now;
    renderAllCharts(data);
  } catch(err) { console.error(err); }
}

function renderAllCharts(countries){
  renderInvitedPie(countries);
  renderCountryBar(countries);
  renderLeafletMap(countries); // Map now uses endpoint lat/lng
}

// ---------------- Pie Chart ----------------
function renderInvitedPie(countries){
  const totalInvited = countries.reduce((sum,c)=>sum+c.invited,0);
  const totalNotInvited = countries.reduce((sum,c)=>sum+c.notInvited,0);

  new Chart(document.getElementById("invitedPieChart"),{
    type:"pie",
    data:{
      labels:["Invited","Not Invited"],
      datasets:[{
        data:[totalInvited,totalNotInvited], 
        backgroundColor:["#f59e0b","#d1d5db"]
      }]
    },
    options:{responsive:true, plugins:{legend:{position:"bottom"}}}
  });
}

// ---------------- Bar Chart ----------------
function renderCountryBar(countries){
  const labels = countries.map(c=>c.country);
  const users = countries.map(c=>c.users);
  const events = countries.map(c=>c.events);

  new Chart(document.getElementById("countryBarChart"),{
    type:"bar",
    data:{
      labels,
      datasets:[
        {label:"Users", data:users, backgroundColor:"#f59e0b"},
        {label:"Events", data:events, backgroundColor:"#60a5fa"}
      ]
    },
    options:{
      responsive:true, 
      scales:{y:{beginAtZero:true}}, 
      plugins:{legend:{position:"bottom"}}
    }
  });
}

// ---------------- Leaflet Map ----------------
async function renderLeafletMap(countries) {
  // Remove previous map if exists
  if (window.leafletMap) window.leafletMap.remove();

  // Initialize map
  const map = L.map('leafletMap').setView([20, 0], 2);
  window.leafletMap = map;

  // OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  // Draw circles for each country
  countries.forEach(c => {
    if (!c.lat || !c.lng) return; // skip unknown countries

    const radius = 50000 + c.users * 1000; // scale circle by users

    L.circle([c.lat, c.lng], {
      color: '#f59e0b',
      fillColor: '#f59e0b',
      fillOpacity: 0.5,
      radius
    }).addTo(map)
      .bindPopup(`<b>${c.country.replace(/_/g,' ')}</b><br>Users: ${c.users}<br>Events: ${c.events}`);
  });
}


