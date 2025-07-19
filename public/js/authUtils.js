// adnex-backend/public/js/authUtils.js

/**
 * Makes an authenticated fetch request to a protected backend URL.
 * If authentication fails, redirects to the login page.
 * @param {string} url The URL to fetch (e.g., '/graphic-html')
 * @returns {Promise<Response>} A promise that resolves with the fetch Response object.
 */
async function fetchProtected(url) {
    const token = localStorage.getItem('jwtToken');

    if (!token) {
        // No token found, redirect to login
        console.warn('No JWT token found in localStorage. Redirecting to login.');
        window.location.href = '/login.html?login=required';
        // Throw an error or return a rejected promise to stop further execution
        throw new Error('Authentication required.');
    }

    try {
        const response = await fetch(url, {
            method: 'GET', // Or 'POST', 'PUT', etc. depending on the API call
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'text/html, application/json' // Indicate what type of content is expected
            }
        });

        // Check for unauthorized or forbidden responses
        if (response.status === 401 || response.status === 403) {
            console.error('JWT authentication failed for URL:', url, 'Status:', response.status);
            localStorage.removeItem('jwtToken'); // Token is invalid/expired, remove it
            window.location.href = '/login.html?login=expired';
            throw new Error('Invalid or expired token. Redirecting to login.');
        }

        // For successful responses, return the response object
        return response;

    } catch (error) {
        console.error('Network or other error during authenticated fetch:', error);
        // This catch block handles network errors, not HTTP error statuses like 401/403
        window.location.href = '/login.html?login=network_error';
        throw error;
    }
}

// Function to handle logout from the frontend
function logoutUser() {
    localStorage.removeItem('jwtToken'); // Remove JWT from local storage
    // You might also want to hit the backend /auth/logout endpoint if it clears sessions
    // or does other server-side cleanup, but for pure JWT, removing the token is enough.
    fetch('/auth/logout', { method: 'GET' }) // Clear server-side session
        .then(() => {
            window.location.href = '/login.html?loggedout=true'; // Redirect to login page
        })
        .catch(error => {
            console.error('Error during logout:', error);
            // Even if logout request fails, clear token and redirect
            window.location.href = '/login.html?loggedout=true';
        });
}

// Attach logoutUser to a global property or specific element if needed
// Example: window.logoutUser = logoutUser;


// ... (existing fetchProtected and logoutUser functions) ...

// Intercept clicks on specific protected links
document.addEventListener('DOMContentLoaded', () => {
    // Select all links that point to your protected HTML routes
    const protectedLinkSelectors = [
        'a[href="/graphic-html"]',
        'a[href="/internship-form"]',
        'a[href="/contact"]',
        'a[href="/development-html"]',
        'a[href="/digital-html"]'
    ];
    const protectedLinks = document.querySelectorAll(protectedLinkSelectors.join(', '));

    protectedLinks.forEach(link => {
        link.addEventListener('click', async (event) => {
            event.preventDefault(); // Prevent default browser navigation

            const targetUrl = link.getAttribute('href');

            try {
                // Attempt to fetch the protected page.
                // fetchProtected handles token check and redirects if unauthorized.
                const response = await fetchProtected(targetUrl);

                if (response.ok) {
                    // If the fetch was successful, it means the token was valid.
                    // Now, perform the actual browser navigation.
                    // The backend will receive this new GET request for the HTML,
                    // and since the user should now be considered authenticated (implicitly via valid token),
                    // the backend will serve the HTML content.
                    window.location.href = targetUrl;
                }
                // No need for else-if for 401/403, as fetchProtected already handles redirects in those cases.

            } catch (error) {
                // This catch handles errors thrown by fetchProtected (e.g., "Authentication required.")
                // No need for further redirect here as fetchProtected already does it.
                console.error('Error during protected link navigation:', error);
            }
        });
    });

    // Example: Attach logout function to a logout button/link
    const logoutButton = document.getElementById('logout-button'); // Assuming you have a button with id="logout-button"
    if (logoutButton) {
        logoutButton.addEventListener('click', logoutUser);
    }
});
