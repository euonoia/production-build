const cache = { overview: null, events: null, timestamp: 0 };
const CACHE_DURATION = 5 * 60 * 1000;

async function loadOverview() {
  const now = Date.now();
  if(cache.overview && now - cache.timestamp < CACHE_DURATION) return updateOverviewUI(cache.overview);
  try {
    const res = await fetch(`${BASE_URL}/analytics/overview`);
    const data = await res.json();
    cache.overview = data; cache.timestamp = now;
    updateOverviewUI(data);
  } catch(err){ console.error(err); }
}

function updateOverviewUI(data){
  document.getElementById("totalCountries").textContent = data.totalCountries;
  document.getElementById("totalUsers").textContent = data.totalUsers;
  document.getElementById("totalEvents").textContent = data.totalEvents;
  document.getElementById("totalInvited").textContent = data.totalInvited;
}

async function loadCharts(){
  const now = Date.now();
  if(cache.events && now - cache.timestamp < CACHE_DURATION) return renderCharts(cache.events);
  try {
    const res = await fetch(`${BASE_URL}/analytics/events`);
    const data = await res.json();
    cache.events = data; cache.timestamp = now;
    renderCharts(data);
  } catch(err){ console.error(err); }
}

function renderCharts(countries){
  const totalInvited = countries.reduce((sum,c)=>sum+c.invited,0);
  const totalNotInvited = countries.reduce((sum,c)=>sum+c.notInvited,0);

  new Chart(document.getElementById("invitedPieChart"),{
    type:"pie",
    data:{labels:["Invited","Not Invited"], datasets:[{data:[totalInvited,totalNotInvited], backgroundColor:["#f59e0b","#d1d5db"]}]},
    options:{responsive:true, plugins:{legend:{position:"bottom"}}}
  });

  const labels = countries.map(c=>c.country);
  const users = countries.map(c=>c.users);
  const events = countries.map(c=>c.events);

  new Chart(document.getElementById("countryBarChart"),{
    type:"bar",
    data:{labels, datasets:[{label:"Users", data:users, backgroundColor:"#f59e0b"},{label:"Events", data:events, backgroundColor:"#60a5fa"}]},
    options:{responsive:true, scales:{y:{beginAtZero:true}}, plugins:{legend:{position:"bottom"}}}
  });
}
