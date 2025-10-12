const sidebar = document.getElementById("sidebar");
document.getElementById("openSidebar").addEventListener("click", () => sidebar.classList.remove("-translate-x-full"));
document.getElementById("closeSidebar").addEventListener("click", () => sidebar.classList.add("-translate-x-full"));
