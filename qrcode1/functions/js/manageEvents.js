function initManageEvents(){
  const template = `
    <div class="mb-4">
      <label class="block text-sm font-semibold mb-1">Select Country</label>
      <select id="countrySelect" class="border p-2 rounded w-64">
        <option value="">-- Select Country --</option>
      </select>
    </div>

    <div class="flex gap-4 mb-6">
      <button id="eventsTab" class="tab-btn bg-amber-600 text-white px-4 py-2 rounded">Events</button>
      <button id="usersTab" class="tab-btn bg-gray-200 px-4 py-2 rounded">Users</button>
    </div>

    <section id="eventsSection">
      <div class="flex justify-between items-center mb-3">
        <h2 class="text-2xl font-semibold">Events</h2>
        <button id="addEventBtn" class="bg-amber-700 text-white px-4 py-2 rounded hover:bg-amber-800">+ Add Event</button>
      </div>
      <table class="min-w-full bg-white rounded shadow">
        <thead class="bg-gray-100">
          <tr>
            <th class="text-left p-2">Title</th>
            <th class="text-left p-2">Date</th>
            <th class="text-left p-2">Created</th>
          </tr>
        </thead>
        <tbody id="eventsTable"></tbody>
      </table>
    </section>

    <section id="usersSection" class="hidden">
      <div class="flex justify-between items-center mb-3">
        <h2 class="text-2xl font-semibold">Users</h2>
        <div class="flex gap-2">
          <select id="assignEventSelect" class="border p-2 rounded"></select>
          <button id="assignEventBtn" class="bg-blue-600 text-white px-4 py-2 rounded">Assign Event</button>
          <button id="sendInvitesBtn" class="bg-green-600 text-white px-4 py-2 rounded">Send Invites</button>
        </div>
      </div>
      <table class="min-w-full bg-white rounded shadow">
        <thead class="bg-gray-100">
          <tr>
            <th class="p-2"><input type="checkbox" id="selectAllUsers"></th>
            <th class="text-left p-2">Name</th>
            <th class="text-left p-2">Email</th>
            <th class="text-left p-2">Event</th>
            <th class="text-left p-2">Invited</th>
            <th class="text-left p-2">Attendance</th>
          </tr>
        </thead>
        <tbody id="usersTable"></tbody>
      </table>
    </section>

    <div id="addEventModal" class="fixed inset-0 bg-black bg-opacity-40 hidden items-center justify-center">
      <div class="bg-white rounded-lg shadow-lg p-6 w-96">
        <h3 class="text-xl font-semibold mb-4">Add Event</h3>
        <form id="addEventForm">
          <input type="text" id="eventTitle" class="border p-2 w-full rounded mb-3" placeholder="Event title" required />
          <input type="datetime-local" id="eventTime" class="border p-2 w-full rounded mb-3" required />
          <div class="flex justify-end gap-2">
            <button type="button" id="cancelAddEvent" class="px-4 py-2 bg-gray-300 rounded">Cancel</button>
            <button type="submit" class="px-4 py-2 bg-amber-700 text-white rounded">Add</button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  document.getElementById("page-container").innerHTML = template;

  const countrySelect = document.getElementById("countrySelect");
  const eventsTable = document.getElementById("eventsTable");
  const usersTable = document.getElementById("usersTable");
  const assignEventSelect = document.getElementById("assignEventSelect");
  const addEventModal = document.getElementById("addEventModal");
  let selectedCountry = "";

  // Tabs
  document.getElementById("eventsTab").addEventListener("click", ()=>showTab("events"));
  document.getElementById("usersTab").addEventListener("click", ()=>showTab("users"));

  function showTab(tab){
    document.getElementById("eventsSection").classList.toggle("hidden", tab!=="events");
    document.getElementById("usersSection").classList.toggle("hidden", tab!=="users");
    document.getElementById("eventsTab").classList.toggle("bg-amber-600", tab==="events");
    document.getElementById("eventsTab").classList.toggle("text-white", tab==="events");
    document.getElementById("usersTab").classList.toggle("bg-amber-600", tab==="users");
    document.getElementById("usersTab").classList.toggle("text-white", tab==="users");
  }

  // Load countries
  fetch(`${BASE_URL}/events`).then(res=>res.json()).then(countries=>{
    countries.forEach(c=>{
      const opt = document.createElement("option");
      opt.value=c.country; opt.textContent=c.country;
      countrySelect.appendChild(opt);
    });
  });

  countrySelect.addEventListener("change", async ()=>{
    selectedCountry = countrySelect.value;
    if(!selectedCountry) return;
    await loadEvents();
    await loadUsers();
  });

  async function loadEvents(){
    eventsTable.innerHTML=""; assignEventSelect.innerHTML=`<option value="">--Select Event--</option>`;
    try{
      const res = await fetch(`${BASE_URL}/events/${selectedCountry}`);
      const events = await res.json();
      events.forEach(ev=>{
        assignEventSelect.innerHTML+=`<option value="${ev.eventId}">${ev.title||ev.eventName}</option>`;
        eventsTable.innerHTML+=`<tr class="border-b">
          <td class="p-2">${ev.title||ev.eventName}</td>
          <td class="p-2">${new Date(ev.startTime).toLocaleString()}</td>
          <td class="p-2">${ev.createdAt?new Date(ev.createdAt).toLocaleString():'-'}</td>
        </tr>`;
      });
    }catch(err){ console.error(err); }
  }

  async function loadUsers(){
    usersTable.innerHTML="";
    try{
      const res = await fetch(`${BASE_URL}/users/${selectedCountry}`);
      const users = await res.json();
      users.forEach(u=>{
        usersTable.innerHTML+=`<tr class="border-b">
          <td class="p-2"><input type="checkbox" class="userCheckbox" value="${u.userId}"></td>
          <td class="p-2">${u.firstName||""} ${u.lastName||""}</td>
          <td class="p-2">${u.email||"-"}</td>
          <td class="p-2">${u.assignedEvent||"-"}</td>
          <td class="p-2">${u.invited?"✅":"❌"}</td>
          <td class="p-2">${u.attendanceStatus||"-"}</td>
        </tr>`;
      });
    }catch(err){ console.error(err); }
  }

  // Modal & buttons
  document.getElementById("addEventBtn").addEventListener("click", ()=>{ addEventModal.classList.remove("hidden"); addEventModal.classList.add("flex"); });
  document.getElementById("cancelAddEvent").addEventListener("click", ()=>{ addEventModal.classList.add("hidden"); document.getElementById("addEventForm").reset(); });

  document.getElementById("addEventForm").addEventListener("submit", async (e)=>{
    e.preventDefault();
    const title = document.getElementById("eventTitle").value;
    const time = document.getElementById("eventTime").value;
    if(!selectedCountry) return alert("Please select a country first.");
    try{
      const res = await fetch(`${BASE_URL}/events/${selectedCountry}`, {
        method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({title,startTime:time})
      });
      if(!res.ok) throw new Error("Failed to add event");
      alert("Event added!"); addEventModal.classList.add("hidden"); document.getElementById("addEventForm").reset();
      loadEvents();
    }catch(err){ alert(err.message); }
  });

  document.getElementById("assignEventBtn").addEventListener("click", async ()=>{
    const eventTitle = assignEventSelect.options[assignEventSelect.selectedIndex].text;
    const userIds = Array.from(document.querySelectorAll(".userCheckbox:checked")).map(cb=>cb.value);
    if(!eventTitle||userIds.length===0) return alert("Select event and users first");
    try{
      const res = await fetch(`${BASE_URL}/events/${selectedCountry}/assign`, {
        method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({eventTitle,userIds})
      });
      if(!res.ok) throw new Error("Failed to assign users");
      alert("Users assigned successfully!"); loadUsers();
    }catch(err){ alert(err.message); }
  });

  document.getElementById("sendInvitesBtn").addEventListener("click", async ()=>{
    const userIds = Array.from(document.querySelectorAll(".userCheckbox:checked")).map(cb=>cb.value);
    if(userIds.length===0) return alert("Select users first");
    try{
      const res = await fetch(`${BASE_URL}/users/${selectedCountry}/send-invite`, {
        method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({userIds})
      });
      if(!res.ok) throw new Error("Failed to send invites");
      alert("Invites sent!"); loadUsers();
    }catch(err){ alert(err.message); }
  });

  document.getElementById("selectAllUsers").addEventListener("change", e=>{
    document.querySelectorAll(".userCheckbox").forEach(cb=>cb.checked=e.target.checked);
  });
}
