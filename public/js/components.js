async function loadComponent(elementId, filePath) {
    const container = document.getElementById(elementId);

    if (!container) {
        return;
    }

    try {
        const response = await fetch(filePath);

        if (!response.ok) {
            throw new Error(`Failed to load ${filePath}`);
        }

        container.innerHTML = await response.text();
    } catch (error) {
        console.error(error);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadComponent("header-container", "components/header.html");
    loadComponent("footer-container", "components/footer.html");
});