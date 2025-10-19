function initEventOrganizer() {
  const BASE_URL = "http://192.168.1.18:5001/fuze-be491/us-central1/v1";

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
            <th class="text-left p-2">Action</th>
          </tr>
        </thead>
        <tbody id="organizerUsersTable"></tbody>
      </table>
    </section>

    <!-- Hidden modal for print -->
    <div id="printModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div class="bg-white p-6 rounded-lg shadow-lg text-center w-96">
        <h2 class="text-2xl font-bold mb-4">🖨️ Print Request</h2>
        <p id="printUserInfo" class="mb-4 text-gray-700"></p>
        <button id="confirmPrintBtn" class="bg-green-600 text-white px-4 py-2 rounded mr-2">Print Now</button>
        <button id="cancelPrintBtn" class="bg-red-500 text-white px-4 py-2 rounded">Cancel</button>
      </div>
    </div>

    <!-- 🔹 Debug overlay at the bottom -->
    <div id="debugOverlay" class="fixed bottom-0 left-0 w-full bg-gray-900 text-white p-2 max-h-48 text-xs font-mono z-50 overflow-y-auto"></div>
  `;

  const countrySelect = document.getElementById("organizerCountrySelect");
  const eventSelect = document.getElementById("organizerEventSelect");
  const usersTable = document.getElementById("organizerUsersTable");
  const eventSummary = document.getElementById("eventSummary");
  const printModal = document.getElementById("printModal");
  const printUserInfo = document.getElementById("printUserInfo");
  const confirmPrintBtn = document.getElementById("confirmPrintBtn");
  const cancelPrintBtn = document.getElementById("cancelPrintBtn");
  const debugOverlay = document.getElementById("debugOverlay");

  let selectedCountry = "";
  let selectedEvent = "";
  let pendingPrintRow = null;

  function debugLog(msg, data = null) {
    console.log(msg, data ?? "");
    debugOverlay.innerHTML += `📡 ${msg}${data ? ": " + JSON.stringify(data) : ""}<br/>`;
    debugOverlay.scrollTop = debugOverlay.scrollHeight;
  }
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
      debugLog("🌍 Countries loaded", countries.map(c => c.country));
    } catch (err) {
      console.error("❌ Error loading countries:", err);
    }
  }

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
      debugLog(`🎫 Events loaded for ${selectedCountry}`, events.map(e => e.title));
    } catch (err) {
      console.error("❌ Error loading events:", err);
    }
  });

  eventSelect.addEventListener("change", async () => {
    selectedEvent = eventSelect.value;
    if (!selectedEvent) return;
    await loadAssignedUsers(selectedCountry, selectedEvent);
    connectToPrintStream(selectedCountry, selectedEvent);
  });

  async function loadAssignedUsers(country, eventName) {
    usersTable.innerHTML = `<tr><td colspan="4" class="p-4 text-center">Loading...</td></tr>`;
    try {
      const res = await fetch(`${BASE_URL}/eventOrganizer/${country}/assigned/${encodeURIComponent(eventName)}`);
      const users = await res.json();

      usersTable.innerHTML = "";
      eventSummary.textContent = `Country: ${country} | Event: ${eventName} | Users: ${users.length}`;

      users.forEach(u => {
        const tr = document.createElement("tr");
        tr.className = "border-b";
        tr.dataset.userId = u.userId;

        tr.innerHTML = `
          <td class="p-2">${u.firstName || ""} ${u.lastName || ""}</td>
          <td class="p-2">${u.email || "-"}</td>
          <td class="p-2">${u.assignedEvent || "-"}</td>
          <td class="p-2"><button class="bg-blue-500 text-white px-2 py-1 rounded print-btn hidden">Print</button></td>
        `;

        const btn = tr.querySelector(".print-btn");
        btn.addEventListener("click", () => {
          pendingPrintRow = tr;
          printUserInfo.textContent = `
            User: ${u.firstName || ""} ${u.lastName || ""}
            | Country: ${u.country}
            | Event: ${u.assignedEvent}
          `;
          printModal.classList.remove("hidden");
        });

        usersTable.appendChild(tr);
      });
    } catch (err) {
      console.error("❌ Error loading users:", err);
      usersTable.innerHTML = `<tr><td colspan="4" class="text-center p-4 text-red-500">Error loading users.</td></tr>`;
    }
  }

  function connectToPrintStream(country, eventName) {
    if (!country || !eventName) return;

    if (window.currentEventSource) window.currentEventSource.close();
    const evtSource = new EventSource(`${BASE_URL}/notifyPrint/stream`);
    window.currentEventSource = evtSource;

    evtSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (
        data.country?.toLowerCase().trim() === selectedCountry.toLowerCase().trim() &&
        data.assignedEvent?.toLowerCase().trim() === selectedEvent.toLowerCase().trim()
      ) {
        // ✅ Find the row for this user and show Print button
        const row = usersTable.querySelector(`tr[data-user-id="${data.userId}"]`);
        if (row) {
          row.querySelector(".print-btn").classList.remove("hidden");
        } else {
          debugLog("⚠️ User scanned but not in table yet", data);
        }
      }
    };

    evtSource.onerror = () => {
      evtSource.close();
      setTimeout(() => connectToPrintStream(selectedCountry, selectedEvent), 3000);
    };
  }

  confirmPrintBtn.addEventListener("click", () => {
    if (!pendingPrintRow) return;

    const html = `<html>
      <head>
        <title>Event Ticket</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background: #f7f7f7;
          }
          .ticket {
            border: 2px dashed #333;
            border-radius: 12px;
            padding: 24px;
            width: 400px;
            background: #fff;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
          }
          .ticket h2 {
            text-align: center;
            margin-bottom: 16px;
            color: #1a73e8;
          }
          .ticket p {
            margin: 8px 0;
            font-size: 16px;
          }
          .ticket .footer {
            text-align: center;
            margin-top: 16px;
            font-size: 12px;
            color: #555;
          }
        </style>
      </head>
      <body>
        <div class="ticket">
          <h2>🎫 Event Ticket</h2>
          <p><strong>Name:</strong> ${pendingPrintRow.cells[0].textContent}</p>
          <p><strong>Country:</strong> ${selectedCountry}</p>
          <p><strong>Event:</strong> ${selectedEvent}</p>
          <p class="footer">Please present this ticket at the entrance</p>
        </div>
      </body>
    </html>`;

    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    w.print();
    printModal.classList.add("hidden");

    // Hide button after printing
    pendingPrintRow.querySelector(".print-btn").classList.add("hidden");
    pendingPrintRow = null;
  });

  cancelPrintBtn.addEventListener("click", () => {
    printModal.classList.add("hidden");
  });

  loadCountries();
}
