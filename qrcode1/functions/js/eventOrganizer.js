function initEventOrganizer() {
  const template = `
    <div class="mb-4">
      <label class="block text-sm font-semibold mb-1">Select Country</label>
      <select id="organizerCountrySelect" class="border p-2 rounded w-64">
        <option value="">-- Select Country --</option>
      </select>
    </div>

    <div class="mb-4">
      <label class="block text-sm font-semibold mb-1">Select Event</label>
      <select id="organizerEventSelect" class="border p-2 rounded w-64">
        <option value="">-- Select Event --</option>
      </select>
    </div>

    <div class="mb-6">
      <h2 class="text-2xl font-semibold mb-1">Summary</h2>
      <p id="eventSummary" class="text-gray-700">No event selected.</p>
    </div>

    <section>
      <h2 class="text-2xl font-semibold mb-3">Assigned Users</h2>
      <table class="min-w-full bg-white rounded shadow">
        <thead class="bg-gray-100">
          <tr>
            <th class="text-left p-2">Name</th>
            <th class="text-left p-2">Email</th>
            <th class="text-left p-2">Assigned Event</th>
          </tr>
        </thead>
        <tbody id="organizerUsersTable"></tbody>
      </table>
    </section>
  `;

  document.getElementById("page-container").innerHTML = template;

  const countrySelect = document.getElementById("organizerCountrySelect");
  const eventSelect = document.getElementById("organizerEventSelect");
  const usersTable = document.getElementById("organizerUsersTable");
  const eventSummary = document.getElementById("eventSummary");

  let selectedCountry = "";
  let selectedEvent = "";

  // 🔹 Load countries
  fetch(`${BASE_URL}/events`)
    .then(res => res.json())
    .then(countries => {
      countries.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.country;
        opt.textContent = c.country;
        countrySelect.appendChild(opt);
      });
    })
    .catch(err => console.error("Error loading countries:", err));

  // 🔹 Load events when a country is selected
  countrySelect.addEventListener("change", async () => {
    selectedCountry = countrySelect.value;
    selectedEvent = "";
    eventSelect.innerHTML = `<option value="">-- Select Event --</option>`;
    usersTable.innerHTML = "";
    eventSummary.textContent = "No event selected.";

    if (!selectedCountry) return;

    try {
      const res = await fetch(`${BASE_URL}/events/${selectedCountry}`);
      const events = await res.json();
      events.forEach(e => {
        const opt = document.createElement("option");
        opt.value = e.title;
        opt.textContent = e.title;
        eventSelect.appendChild(opt);
      });
    } catch (err) {
      console.error("Error loading events:", err);
    }
  });

  // 🔹 Load users when event is selected
  eventSelect.addEventListener("change", async () => {
    selectedEvent = eventSelect.value;
    if (!selectedEvent || !selectedCountry) return;
    await loadAssignedUsers(selectedCountry, selectedEvent);
  });

  // 🔹 Fetch users assigned to that event
  async function loadAssignedUsers(country, eventName) {
    usersTable.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-gray-500">Loading...</td></tr>`;
    eventSummary.textContent = `Loading event data...`;

    try {
      const res = await fetch(`${BASE_URL}/eventOrganizer/${country}/assigned/${encodeURIComponent(eventName)}`);
      if (!res.ok) {
        usersTable.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-red-500">No users found for this event.</td></tr>`;
        eventSummary.textContent = `Country: ${country} | Event: ${eventName} | Users: 0`;
        return;
      }

      const users = await res.json();
      usersTable.innerHTML = "";
      eventSummary.textContent = `Country: ${country} | Event: ${eventName} | Total Users: ${users.length}`;

      users.forEach(u => {
        usersTable.innerHTML += `
          <tr class="border-b">
            <td class="p-2">${u.firstName || ""} ${u.lastName || ""}</td>
            <td class="p-2">${u.email || "-"}</td>
            <td class="p-2">${u.assignedEvent || "-"}</td>
          </tr>
        `;
      });
    } catch (err) {
      console.error("Error loading assigned users:", err);
      usersTable.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-red-500">Error loading users.</td></tr>`;
      eventSummary.textContent = `Country: ${country} | Event: ${eventName} | Users: 0`;
    }
  }
}
