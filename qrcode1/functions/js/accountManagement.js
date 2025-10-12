function initAccountManagement() {
  const template = `
    <div class="mb-4 flex justify-between items-center">
      <h2 class="text-2xl font-semibold">Account Management</h2>
      <button id="refreshUsersBtn" class="bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700">Refresh</button>
    </div>

    <table class="min-w-full bg-white rounded shadow">
      <thead class="bg-gray-100">
        <tr>
          <th class="p-2"><input type="checkbox" id="selectAllUsers"></th>
          <th class="text-left p-2">Name</th>
          <th class="text-left p-2">Email</th>
          <th class="text-left p-2">Role</th>
          <th class="p-2">Actions</th>
        </tr>
      </thead>
      <tbody id="usersTable"></tbody>
    </table>
  `;
  document.getElementById("page-container").innerHTML = template;

  const usersTable = document.getElementById("usersTable");

  async function loadUsers() {
    try {
      const token = await firebase.auth().currentUser.getIdToken();
      const res = await fetch(`${BASE_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const users = await res.json();
      renderUsers(users);
    } catch (err) {
      console.error(err);
      alert("Failed to load users");
    }
  }

  function renderUsers(users) {
    usersTable.innerHTML = "";
    users.forEach(u => {
      const tr = document.createElement("tr");
      tr.classList.add("border-b");

      tr.innerHTML = `
        <td class="p-2"><input type="checkbox" class="userCheckbox" value="${u.id}"></td>
        <td class="p-2">${u.firstName || ""} ${u.lastName || ""}</td>
        <td class="p-2">${u.email || "-"}</td>
        <td class="p-2">
          <select data-uid="${u.id}" class="border px-2 py-1 rounded role-select">
            <option value="user" ${u.role === "user" ? "selected" : ""}>User</option>
            <option value="admin" ${u.role === "admin" ? "selected" : ""}>Admin</option>
          </select>
        </td>
        <td class="p-2">
          <button data-uid="${u.id}" class="delete-user bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">Delete</button>
        </td>
      `;
      usersTable.appendChild(tr);
    });

    // Attach events
    document.querySelectorAll(".role-select").forEach(select => {
      select.addEventListener("change", updateRole);
    });
    document.querySelectorAll(".delete-user").forEach(btn => {
      btn.addEventListener("click", deleteUser);
    });
  }

  async function updateRole(e) {
    const uid = e.target.dataset.uid;
    const newRole = e.target.value;
    try {
      const token = await firebase.auth().currentUser.getIdToken();
      await fetch(`${BASE_URL}/users/${uid}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      alert("Role updated successfully");
    } catch (err) {
      console.error(err);
      alert("Failed to update role");
    }
  }

  async function deleteUser(e) {
    const uid = e.target.dataset.uid;
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      const token = await firebase.auth().currentUser.getIdToken();
      await fetch(`${BASE_URL}/users/${uid}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("User deleted successfully");
      loadUsers();
    } catch (err) {
      console.error(err);
      alert("Failed to delete user");
    }
  }

  // Select all checkbox
  document.getElementById("selectAllUsers").addEventListener("change", e => {
    document.querySelectorAll(".userCheckbox").forEach(cb => cb.checked = e.target.checked);
  });

  // Refresh button
  document.getElementById("refreshUsersBtn").addEventListener("click", loadUsers);

  // Initial load
  loadUsers();
}
