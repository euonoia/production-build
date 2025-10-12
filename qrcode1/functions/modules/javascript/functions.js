
let editMode = false;
let COUNTRY = "";
let EVENT_ID = "";

const BASE_URL = "http://localhost:5001/fuze-be491/us-central1/v1";

// -------------------- HELPERS -------------------- //
function normalizeCountry(country) {
  return country.trim().toLowerCase().replace(/\s+/g, "_");
}

function showMessage(msg, isError = false) {
  const messageDiv = document.getElementById('message');
  messageDiv.style.color = isError ? 'red' : 'green';
  messageDiv.innerText = msg;
  messageDiv.style.display = '';
  setTimeout(() => { messageDiv.style.display = 'none'; }, 3000);
}

// -------------------- LOAD COUNTRIES -------------------- //
async function loadCountries() {
  try {
    const response = await fetch(`${BASE_URL}/events`);
    if (!response.ok) throw new Error(await response.text());
    const countries = await response.json();

    const select = document.getElementById('countrySelect');
    select.innerHTML = "";
    countries.forEach(obj => {
      const opt = document.createElement('option');
      opt.value = obj.country;
      opt.text = obj.country;
      select.appendChild(opt);
    });

    if (countries.length > 0) {
      COUNTRY = countries[0].country;
      select.value = COUNTRY;
      loadEvents(COUNTRY);
    }

    select.onchange = function() {
      COUNTRY = this.value;
      loadEvents(COUNTRY);
    };
  } catch (error) {
    document.getElementById('result').innerText = "Error loading countries: " + error.message;
  }
}

// -------------------- LOAD EVENTS -------------------- //
async function loadEvents(country) {
  try {
    const normalized = normalizeCountry(country);
    const response = await fetch(`${BASE_URL}/events/${normalized}/list`);
    const events = await response.json();
    const eventSelect = document.getElementById('eventSelect');
    eventSelect.innerHTML = "";

    events.forEach(evt => {
      const opt = document.createElement('option');
      opt.value = evt.eventId;
      opt.text = evt.name;
      eventSelect.appendChild(opt);
    });

    if (events.length > 0) {
      EVENT_ID = events[0].eventId;
      eventSelect.value = EVENT_ID;
      fetchAllUsers();
    }

    eventSelect.onchange = function() {
      EVENT_ID = this.value;
      fetchAllUsers();
    };
  } catch (err) {
    console.error("Error loading events:", err);
  }
}

// -------------------- FETCH USERS -------------------- //
async function fetchAllUsers() {
  if (!COUNTRY || !EVENT_ID) {
    document.getElementById('result').innerText = "Please select a country and event.";
    return;
  }

  try {
    const url = `${BASE_URL}/events/${normalizeCountry(COUNTRY)}/users?eventId=${EVENT_ID}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(await response.text());
    const users = await response.json();

    let output = "<ul>";
    users.forEach(user => {
      output += `
        <li style="cursor:pointer" onclick="selectUser('${user.userId}', '${user.firstName || ""}', '${user.lastName || ""}', '${user.email || ""}', '${COUNTRY}', '${user.eventName || ""}', '${user.attendanceStatus || "registered"}')">
          <b>${user.firstName || ""} ${user.lastName || ""}</b> (${user.email || ""})<br>
          Invited: ${user.invited ? "Yes" : "No"}<br>
          Attendance Status: ${user.attendanceStatus || "registered"}<br>
          Event Name: ${user.eventName || "N/A"}<br>
          <canvas id="qr_${user.userId}" class="qr-canvas"></canvas>
        </li>`;
    });
    output += "</ul>";
    document.getElementById('result').innerHTML = output;

    users.forEach(user => {
      new QRious({
        element: document.getElementById(`qr_${user.userId}`),
        value: `${normalizeCountry(COUNTRY)}|${EVENT_ID}|${user.userId}`,
        size: 200
      });
    });

    computeAnalytics(users);
  } catch (err) {
    console.error(err);
    document.getElementById('result').innerText = `Error: ${err.message}`;
  }
}

// -------------------- COMPUTE ANALYTICS -------------------- //
function computeAnalytics(users) {
  const registered = users.length;
  const invited = users.filter(u => u.invited === true).length;
  const checkedIn = users.filter(u => u.attendanceStatus === "checked_in").length;
  const noShow = users.filter(u => u.attendanceStatus === "no_show").length;

  const invitationRate = registered === 0 ? "0%" : ((invited / registered) * 100).toFixed(1) + "%";
  const attendanceRate = registered === 0 ? "0%" : ((checkedIn / registered) * 100).toFixed(1) + "%";

  document.getElementById("registeredCount").innerText = registered;
  document.getElementById("attendedCount").innerText = invited;
  document.getElementById("attendanceRate").innerText = attendanceRate;
}

// -------------------- SELECT USER -------------------- //
window.selectUser = function(userId, firstName, lastName, email, country, eventName, attendanceStatus) {
  document.getElementById('userId').value = userId;
  document.getElementById('displayFirstname').innerText = firstName;
  document.getElementById('displayLastname').innerText = lastName;
  document.getElementById('displayEmail').innerText = email;
  document.getElementById('displayCountry').innerText = country;
  document.getElementById('selectedUserInfo').style.display = '';
  document.getElementById('invited').value = ""; // reset
  editMode = true;
};

// -------------------- RESET FORM -------------------- //
function resetForm() {
  document.getElementById('addUserForm').reset();
  document.getElementById('userId').value = "";
  document.getElementById('selectedUserInfo').style.display = "none";
  editMode = false;
}

// -------------------- ADD / UPDATE USER -------------------- //
async function addUser(event) {
  event.preventDefault();
  if (!COUNTRY || !EVENT_ID) {
    showMessage("Select country and event first", true);
    return;
  }

  let userId = document.getElementById('userId').value;
  const invited = document.getElementById('invited').value === "true";
  if (!editMode || !userId) userId = "user_" + Date.now();

  const url = `${BASE_URL}/events/${normalizeCountry(COUNTRY)}/users/${userId}?eventId=${EVENT_ID}`;

  const payload = {
    invited,
    attendanceStatus: "registered",
    eventName: document.getElementById('eventSelect').selectedOptions[0].text,
    updatedAt: new Date(),
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const text = await response.text();
    showMessage(text.includes("Error") ? text : "User saved successfully");
    fetchAllUsers();
    resetForm();
  } catch (err) {
    showMessage("Error: " + err.message, true);
  }
}

// -------------------- INITIALIZE -------------------- //
window.onload = function() {
  loadCountries();
  document.getElementById('addUserForm').onsubmit = addUser;
  document.getElementById('cancelBtn').onclick = resetForm;
};
