// Base API URL
const BASE_URL = "http://192.168.1.18:5001/fuze-be491/us-central1/v1";

// Page templates
const pages = {
  analytics: `
    <div class="flex justify-between items-center mb-6 hidden md:flex">
      <h1 class="text-3xl font-bold text-amber-700">Event Analytics Dashboard</h1>
    </div>

    <!-- Overview cards -->
    <div id="overview" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div class="bg-white p-4 rounded shadow text-center">
        <h3 class="text-gray-500 text-sm mb-1">Countries</h3>
        <p id="totalCountries" class="text-2xl font-semibold">0</p>
      </div>
      <div class="bg-white p-4 rounded shadow text-center">
        <h3 class="text-gray-500 text-sm mb-1">Users</h3>
        <p id="totalUsers" class="text-2xl font-semibold">0</p>
      </div>
      <div class="bg-white p-4 rounded shadow text-center">
        <h3 class="text-gray-500 text-sm mb-1">Events</h3>
        <p id="totalEvents" class="text-2xl font-semibold">0</p>
      </div>
      <div class="bg-white p-4 rounded shadow text-center">
        <h3 class="text-gray-500 text-sm mb-1">Invited</h3>
        <p id="totalInvited" class="text-2xl font-semibold">0</p>
      </div>
    </div>

    <!-- Charts -->
    <div class="grid md:grid-cols-2 gap-6">
      <div class="bg-white p-6 rounded shadow">
        <h2 class="text-lg font-semibold mb-3 text-center">Invited vs Not Invited</h2>
        <div id="invitedPieChartContainer" class="h-64 relative">
          <div class="absolute inset-0 bg-gray-300 rounded animate-pulse"></div>
          <canvas id="invitedPieChart" class="hidden w-full h-full"></canvas>
        </div>
      </div>
      <div class="bg-white p-6 rounded shadow">
        <h2 class="text-lg font-semibold mb-3 text-center">Users & Events by Country</h2>
        <div id="countryBarChartContainer" class="h-64 relative">
          <div class="absolute inset-0 bg-gray-300 rounded animate-pulse"></div>
          <canvas id="countryBarChart" class="hidden w-full h-full"></canvas>
        </div>
      </div>
    </div>
  `,
  manage_event: `
    <h2 class="text-2xl font-bold text-amber-700 mb-4">Event Management</h2>
    <p class="text-gray-500">No events available. Click "Add Event" to create one.</p>
  `,
  event_organizer: `
    <h2 class="text-2xl font-bold text-amber-700 mb-4">Event Organizer</h2>
    <div class="mb-4 flex items-center gap-4">
      <select id="countrySelect" class="border p-2 rounded">
        <option value="">Select Country</option>
      </select>
      <select id="eventSelect" class="border p-2 rounded">
        <option value="">Select Event</option>
      </select>
      <button id="loadUsersBtn" class="bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700">Load Users</button>
    </div>
    <div id="usersContainer" class="grid grid-cols-1 md:grid-cols-3 gap-4"></div>
  `,
  users: `
    <h2 class="text-2xl font-bold text-amber-700 mb-4">Account Management</h2>
    <div class="mb-4 flex justify-between items-center">
      <input type="text" id="searchUser" placeholder="Search users..." class="border p-2 rounded w-64" />
      <button id="refreshUsersBtn" class="bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700">Refresh</button>
    </div>
    <div id="usersContainer" class="overflow-x-auto bg-white p-4 rounded shadow">
      <table class="min-w-full table-auto">
        <thead>
          <tr class="bg-amber-700 text-white">
            <th class="px-4 py-2">UID</th>
            <th class="px-4 py-2">Name</th>
            <th class="px-4 py-2">Email</th>
            <th class="px-4 py-2">Role</th>
            <th class="px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody id="usersTableBody"></tbody>
      </table>
    </div>
  `
};

// ---------------- Render Page ----------------
function renderPage(name) {
  const container = document.getElementById("page-container");

  switch(name) {
    case "analytics":
      container.innerHTML = pages.analytics;
      loadOverview?.(); // only call if function exists
      loadCharts?.();
      break;

    case "manage_event":
      container.innerHTML = pages.manage_event;
      initManageEvents?.();
      break;
      
    case "event_organizer":
      container.innerHTML = pages.event_organizer;
      initEventOrganizer?.();
      break;

    case "users":
      container.innerHTML = pages.users;
      initAccountManagement?.(); // load account management SPA
      break;

    default:
      container.innerHTML = "<h2>Page not found</h2>";
  }
}

// ---------------- Sidebar Navigation ----------------
document.querySelectorAll("aside nav button").forEach(btn => {
  btn.addEventListener("click", () => {
    renderPage(btn.dataset.page);
  });
});

// ---------------- Account Management ----------------
function initAccountManagement() {
  const usersTableBody = document.getElementById("usersTableBody");
  const searchInput = document.getElementById("searchUser");
  const refreshBtn = document.getElementById("refreshUsersBtn");

  async function loadUsers() {
    usersTableBody.innerHTML = `<tr><td colspan="5" class="p-4 text-center">Loading...</td></tr>`;
    try {
      const res = await fetch(`${BASE_URL}/users`);
      const users = await res.json();
      render(users);

      searchInput.addEventListener("input", () => {
        const search = searchInput.value.toLowerCase();
        const filtered = users.filter(u =>
          (u.firstName + " " + u.lastName).toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search) ||
          u.id.toLowerCase().includes(search)
        );
        render(filtered);
      });

    } catch(err) {
      console.error(err);
      usersTableBody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-red-500">Failed to load users.</td></tr>`;
    }
  }

  function render(users) {
    usersTableBody.innerHTML = "";
    if(users.length === 0){
      usersTableBody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-gray-500">No users found.</td></tr>`;
      return;
    }

    users.forEach(u => {
      const tr = document.createElement("tr");
      tr.classList.add("border-b");
      tr.innerHTML = `
        <td class="px-4 py-2">${u.id}</td>
        <td class="px-4 py-2">${u.firstName || ''} ${u.lastName || ''}</td>
        <td class="px-4 py-2">${u.email || '-'}</td>
        <td class="px-4 py-2">
          <select data-uid="${u.id}" class="border p-1 rounded roleSelect">
            <option value="user" ${u.role === 'user' ? 'selected' : ''}>User</option>
            <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
          </select>
        </td>
        <td class="px-4 py-2">
          <button data-uid="${u.id}" class="delete-user bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">Delete</button>
        </td>
      `;
      usersTableBody.appendChild(tr);

      tr.querySelector(".roleSelect").addEventListener("change", async e => {
        const newRole = e.target.value;
        const uid = e.target.dataset.uid;
        try {
          await fetch(`${BASE_URL}/users/${uid}`, {
            method: "PATCH",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ role: newRole })
          });
          alert(`Role updated to ${newRole}`);
        } catch(err) {
          console.error(err);
          alert("Failed to update role");
        }
      });

      tr.querySelector(".delete-user").addEventListener("click", async e => {
        const uid = e.target.dataset.uid;
        if(!confirm(`Delete user ${u.firstName} ${u.lastName}?`)) return;
        try {
          await fetch(`${BASE_URL}/users/${uid}`, { method: "DELETE" });
          tr.remove();
        } catch(err) {
          console.error(err);
          alert("Failed to delete user");
        }
      });
    });
  }

  refreshBtn.addEventListener("click", loadUsers);

  // Initial load
  loadUsers();
}
// ---------------- Event Organizer ----------------
function initEventOrganizer() {
  // Initialize your organizer page logic here
  console.log("Event Organizer page loaded");
}

// ---------------- Load initial page safely ----------------
document.addEventListener("DOMContentLoaded", () => {
  renderPage("analytics"); // load dashboard immediately
});
