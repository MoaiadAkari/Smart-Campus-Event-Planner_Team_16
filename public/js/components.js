/*
    Loads an HTML component into the selected container.
*/
async function loadComponent(elementId, filePath) {
    const container = document.getElementById(elementId);

    if (!container) {
        return false;
    }

    try {
        const response = await fetch(filePath);

        if (!response.ok) {
            throw new Error(`Failed to load ${filePath}`);
        }

        container.innerHTML = await response.text();

        return true;
    } catch (error) {
        console.error(error);

        return false;
    }
}


/*
    Gets the logged-in user from sessionStorage.
*/
function getCurrentUser() {
    const savedUser = sessionStorage.getItem("currentUser");

    if (!savedUser) {
        return null;
    }

    try {
        return JSON.parse(savedUser);
    } catch (error) {
        console.error("Invalid current user data:", error);

        sessionStorage.removeItem("currentUser");

        return null;
    }
}


/*
    Adjusts the existing header links based on the user's role.
*/
function configureHeader() {
    const eventsLink = document.getElementById("events-link");
    const dashboardLink = document.getElementById("dashboard-link");
    const logoutLink = document.getElementById("logout-link");

    if (!eventsLink || !dashboardLink || !logoutLink) {
        return;
    }

    const currentUser = getCurrentUser();

    /*
        This header is meant for logged-in users.

        If no user is stored, Dashboard and Log Out will
        direct the visitor to the login page.
        also text is changed form log out to log in
    */
    if (!currentUser) {
        eventsLink.href = "events.html";
        dashboardLink.href = "login.html";
        logoutLink.textContent = "Log In";
        logoutLink.href = "login.html";
        
        
        return;
    }

    const userRole = currentUser.role.toLowerCase();

    if (userRole === "student") {
        eventsLink.textContent = "Events";
        eventsLink.href = "events.html";

        dashboardLink.href = "student-dashboard.html";
    } else if (
        userRole === "admin" ||
        userRole === "organizer"
    ) {
        eventsLink.textContent = "Manage Events";
        eventsLink.href = "manage-events.html";

        dashboardLink.href = "admin-dashboard.html";
    } else {
        console.error(`Unknown user role: ${currentUser.role}`);

        sessionStorage.removeItem("currentUser");
        window.location.href = "login.html";

        return;
    }

    logoutLink.textContent = "Log Out";
    logoutLink.href = "login.html";
    logoutLink.addEventListener("click", handleLogout);

    highlightCurrentPage();
}


/*
    Logs the user out.
*/
function handleLogout(event) {
    event.preventDefault();

    sessionStorage.removeItem("currentUser");

    window.location.href = "login.html";
}


/*
    Highlights the current navigation link.
*/
function highlightCurrentPage() {
    const currentPage =
        window.location.pathname.split("/").pop() || "index.html";

    const navigationLinks =
        document.querySelectorAll(".nav-links a");

    navigationLinks.forEach(link => {
        const linkPage =
            link.getAttribute("href").split("?")[0];

        link.classList.toggle(
            "active",
            linkPage === currentPage
        );
    });
}


/*
    Loads the shared header and footer.
*/
document.addEventListener("DOMContentLoaded", async function () {
    const headerLoaded = await loadComponent(
        "header-container",
        "components/header.html"
    );

    if (headerLoaded) {
        configureHeader();
    }

    await loadComponent(
        "footer-container",
        "components/footer.html"
    );
});