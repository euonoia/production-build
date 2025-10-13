function initAccountManagement() {
  const template = `
    <div class="mb-4 flex justify-between items-center">
      <h2 class="text-2xl font-semibold">Account Management</h2>
      <button id="refreshUsersBtn" class="bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700">Refresh</button>
    </div>

    <div id="loadingOverlay" class="hidden fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div class="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center">
        <div class="animate-spin rounded-full h-10 w-10 border-t-4 border-amber-600 border-solid mb-3"></div>
        <p class="text-gray-700 font-medium">Loading...</p>
      </div>
    </div>

    <table class="min-w-full bg-white rounded shadow">
      <thead class="bg-gray-100">
        <tr>
          <th class="p-2"><input type="checkbox" id="selectAllUsers"></th>
          <th class="text-left p-2">Name</th>
          <th class="text-left p-2">Email</th>
          <th class="p-2">Actions</th>
        </tr>
      </thead>
      <tbody id="usersTable"></tbody>
    </table>
  `;
  document.getElementById("page-container").innerHTML = template;

  const usersTable = document.getElementById("usersTable");
  const loadingOverlay = document.getElementById("loadingOverlay");

  function showLoading(show = true) {
    loadingOverlay.classList.toggle("hidden", !show);
  }

  async function loadUsers() {
    showLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/users`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const users = await res.json();
      renderUsers(users);
    } catch (err) {
      console.error("❌ Failed to load users:", err);
      alert("Failed to load users");
    } finally {
      showLoading(false);
    }
  }

  function renderUsers(users) {
    usersTable.innerHTML = "";
    users.forEach(u => {
      const isDisabled = u.disabled || false; // ensure your API returns disabled
      const tr = document.createElement("tr");
      tr.classList.add("border-b");
      if (isDisabled) tr.classList.add("opacity-50"); // gray out disabled users

      tr.innerHTML = `
        <td class="p-2"><input type="checkbox" class="userCheckbox" value="${u.id}" ${isDisabled ? "disabled" : ""}></td>
        <td class="p-2">${u.firstName || ""} ${u.lastName || ""}</td>
        <td class="p-2">${u.email || "-"}</td>
        <td class="p-2 flex gap-2 items-center">
          <button data-uid="${u.id}" class="delete-user bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">
            Delete
          </button>
          <button data-uid="${u.id}" class="toggle-disable-user ${isDisabled ? "bg-green-600" : "bg-gray-600"} text-white px-3 py-1 rounded hover:bg-gray-700">
            ${isDisabled ? "Enable" : "Disable"}
          </button>
        </td>
      `;
      usersTable.appendChild(tr);
    });

    document.querySelectorAll(".delete-user").forEach(btn => {
      btn.addEventListener("click", deleteUser);
    });

    document.querySelectorAll(".toggle-disable-user").forEach(btn => {
      btn.addEventListener("click", toggleDisableUser);
    });
  }

  async function deleteUser(e) {
    const uid = e.target.dataset.uid;
    if (!confirm("Are you sure you want to delete this user?")) return;

    showLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/users/${uid}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("User deleted successfully");
      loadUsers();
    } catch (err) {
      console.error("❌ Failed to delete user:", err);
      alert("Failed to delete user");
    } finally {
      showLoading(false);
    }
  }

  async function toggleDisableUser(e) {
    const uid = e.target.dataset.uid;
    const enable = e.textContent === "Enable";

    if (!confirm(`Are you sure you want to ${enable ? "enable" : "disable"} this user?`)) return;

    showLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/users/${uid}/disable`, { 
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disable: !enable }) // send true to disable, false to enable
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert(`User ${enable ? "enabled" : "disabled"} successfully`);
      loadUsers();
    } catch (err) {
      console.error("❌ Failed to toggle user:", err);
      alert(`Failed to ${enable ? "enable" : "disable"} user`);
    } finally {
      showLoading(false);
    }
  }

  // Select all checkbox
  document.getElementById("selectAllUsers").addEventListener("change", e => {
    document.querySelectorAll(".userCheckbox").forEach(cb => (cb.checked = e.target.checked));
  });

  // Refresh button
  document.getElementById("refreshUsersBtn").addEventListener("click", loadUsers);

  // Initial load
  loadUsers();
}
