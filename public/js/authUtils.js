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
