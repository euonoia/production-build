function initEventOrganizer() {
  const BASE_URL = "http://192.168.1.18:5001/fuze-be491/us-central1/v1";

  // 🟢 Initialize UI
  const container = document.getElementById("page-container");
  container.innerHTML = `
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

    <!-- 🔹 Hidden modal for print requests -->
    <div id="printModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div class="bg-white p-6 rounded-lg shadow-lg text-center w-96">
        <h2 class="text-2xl font-bold mb-4">🖨️ Print Request Received</h2>
        <p id="printUserInfo" class="mb-4 text-gray-700"></p>
        <button id="confirmPrintBtn" class="bg-green-600 text-white px-4 py-2 rounded mr-2">Print Now</button>
        <button id="cancelPrintBtn" class="bg-red-500 text-white px-4 py-2 rounded">Cancel</button>
      </div>
    </div>
  `;

  // Elements
  const countrySelect = document.getElementById("organizerCountrySelect");
  const eventSelect = document.getElementById("organizerEventSelect");
  const usersTable = document.getElementById("organizerUsersTable");
  const eventSummary = document.getElementById("eventSummary");
  const printModal = document.getElementById("printModal");
  const printUserInfo = document.getElementById("printUserInfo");
  const confirmPrintBtn = document.getElementById("confirmPrintBtn");
  const cancelPrintBtn = document.getElementById("cancelPrintBtn");

  let selectedCountry = "";
  let selectedEvent = "";
  let pendingPrintData = null;

  // 🔹 Load countries
  async function loadCountries() {
    try {
      const res = await fetch(`${BASE_URL}/events`);
      const countries = await res.json();
      countrySelect.innerHTML = `<option value="">-- Select Country --</option>`;
      countries.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.country;
        opt.textContent = c.country;
        countrySelect.appendChild(opt);
      });
    } catch (err) {
      console.error("❌ Error loading countries:", err);
    }
  }

  // 🔹 Load events for a country
  countrySelect.addEventListener("change", async () => {
    selectedCountry = countrySelect.value;
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
      console.error("❌ Error loading events:", err);
    }
  });

  // 🔹 When event selected → load users & connect to stream
  eventSelect.addEventListener("change", async () => {
    selectedEvent = eventSelect.value;
    if (!selectedEvent) return;

    await loadAssignedUsers(selectedCountry, selectedEvent);
    connectToPrintStream(selectedCountry, selectedEvent);
  });

  // 🔹 Load assigned users
  async function loadAssignedUsers(country, eventName) {
    usersTable.innerHTML = `<tr><td colspan="3" class="p-4 text-center">Loading...</td></tr>`;
    try {
      const res = await fetch(`${BASE_URL}/eventOrganizer/${country}/assigned/${encodeURIComponent(eventName)}`);
      const users = await res.json();

      usersTable.innerHTML = "";
      eventSummary.textContent = `Country: ${country} | Event: ${eventName} | Users: ${users.length}`;

      users.forEach(u => {
        usersTable.innerHTML += `
          <tr class="border-b">
            <td class="p-2">${u.firstName || ""} ${u.lastName || ""}</td>
            <td class="p-2">${u.email || "-"}</td>
            <td class="p-2">${u.assignedEvent || "-"}</td>
          </tr>`;
      });
    } catch (err) {
      console.error("❌ Error loading users:", err);
      usersTable.innerHTML = `<tr><td colspan="3" class="text-center p-4 text-red-500">Error loading users.</td></tr>`;
    }
  }

  // ✅ Connect to print stream (SSE)
  function connectToPrintStream(country, eventName) {
    if (!country || !eventName) return;

    // Close previous connection if exists
    if (window.currentEventSource) {
      window.currentEventSource.close();
    }

    console.log(`🔌 Connecting to print stream for ${country} / ${eventName}`);
    const evtSource = new EventSource(`${BASE_URL}/notifyPrint/stream`);
    window.currentEventSource = evtSource;

    evtSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("🖨️ Print event received:", data);

      pendingPrintData = data;
      printUserInfo.textContent = `
        User: ${data.firstName || "Unknown"} ${data.lastName || ""}
        | Country: ${data.country}
        | Event: ${data.assignedEvent || "N/A"}
      `;
      printModal.classList.remove("hidden");
    };

    evtSource.onerror = (err) => {
      console.warn("⚠️ SSE disconnected. Retrying in 3s...", err);
      evtSource.close();
      setTimeout(() => connectToPrintStream(country, eventName), 3000);
    };
  }

  // ✅ Modal actions
  confirmPrintBtn.addEventListener("click", () => {
    if (!pendingPrintData) return;
    const html = `
      <html><body>
        <h2>Event Ticket</h2>
        <p><b>Name:</b> ${pendingPrintData.firstName ?? ""} ${pendingPrintData.lastName ?? ""}</p>
        <p><b>Country:</b> ${pendingPrintData.country}</p>
        <p><b>Event:</b> ${pendingPrintData.assignedEvent ?? ""}</p>
        <p><b>User ID:</b> ${pendingPrintData.userId}</p>
      </body></html>
    `;
    const printWindow = window.open("", "_blank");
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
    printModal.classList.add("hidden");
  });

  cancelPrintBtn.addEventListener("click", () => {
    printModal.classList.add("hidden");
  });

  // 🔹 Initialize
  loadCountries();
}
