This project is a secure implementation of authentication that uses
Google OAuth 2.0
JWT Access and Refresh Tokens
CSRF protection,
Cookie based authentication

The following cookies are used:
1. access_token
    Purpose: Authenticate API requests
    Storage: HttpOnly cookie
    Lifetime: 15 minutes

2. refresh_token
    Purpose: Renew expired access tokens
    Storage: HttpOnly cookie
    Lifetime: 7 days

3. csrf_token
    Purpose: Prevent CSRF attacks
    Storage: JavaScript-readable cookie
    Lifetime: 15 minutes

4. oauth_state
    Purpose: Prevent OAuth login CSRF
    Storage: HttpOnly cookie
    Lifetime: One-time use

FLOW:
1. Initiate Login
    Route: GET /auth/google

    The backend generates a cryptographically secure random state value and stores it in an HttpOnly cookie. The user is then redirected to Google OAuth with this state attached.

    This ensures the login request is bound to the initiating browser session.

2. OAuth Callback
    Route: GET /auth/google/callback

    Google redirects back with an authorization code and the original state. The backend validates that the returned state matches the stored cookie.

    If validation succeeds:

    The Google ID token is verified
    The user is created or updated in the database
    Authentication cookies are issued
    If validation fails, the login request is rejected to prevent account swap attacks.

3. Cookies issued after login
    After successful authentication, the backend sets the following cookies:

    access_token (HttpOnly, SameSite=Lax)
    refresh_token (HttpOnly, SameSite=Lax)
    csrf_token (readable by JavaScript, SameSite=Lax)

    The frontend never directly accesses the access or refresh tokens.

4. CSRF Protection
    CSRF protection is implemented using the double-submit cookie pattern.

    Working:
    The backend sets a csrf_token cookie
    The frontend reads the cookie value
    The frontend sends the token in the X-CSRF-Token header for unsafe and mutable HTTP methods (post, put, delete, patch)
    The backend validates that the header and cookie values match
    CSRF protection is applied to all state-changing routes such as logout.
    CSRF protection is not applied to GET requests.

5. Refreshing TOkens
    Access tokens are short-lived and may expire during an active session (15m in this case).

    When a protected API returns a 401 response:
    The frontend calls POST /auth/refresh
    The refresh token is validated
    A new access token and CSRF token are issued
    The refresh endpoint does not require a CSRF token to avoid a refresh deadlock scenario.

6. Protected Routes
    Protected routes require a valid access token and include:

    GET /me
    GET /protected
    GET /protected_data_get

    The backend verifies the access token using middleware before allowing access.

7. Logout Flow
    Route: POST /logout

    Logout is protected by both access token validation and CSRF validation. On logout, the backend clears all authentication cookies, ending the session safely.