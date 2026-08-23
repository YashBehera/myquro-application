# Backend for MyQuro Application

_This section conains the backend code for the MyQuro application, built using Node.js and Express. It handles API requests, database interactions, and business logic for the application._

## Features

- User Authentication and Authorization(using better-auth for both credentials and social logins[Google])
- Staff Management
- Table Management

## API Endpoints

- `/api/auth`: User authentication and authorization.
- `/api/protected`: Protected routes that require authentication.
- `/api/restaurants`: Restaurant-related operations including staff management and table management.
- `/api/restaurant-tables`: Endpoints for managing restaurant tables.
- `/api/staff-requests`: Endpoints for handling staff requests.
- `/api/admin`: Administrative operations.

## Development

To set up the development environment, follow these steps:

1. Clone the repository.
2. Install dependencies using `npm install`.
3. Set up environment variables as needed.

    ```.env
    DATABASE_URL=

    BETTER_AUTH_SECRET = 
    BETTER_AUTH_URL = 
    CLIENT_URL = 

    GOOGLE_CLIENT_ID= 
    GOOGLE_CLIENT_SECRET= 
    ```

4. Start the development server using `npm run dev`.

5. For database migrations, use `npm run drizzle:generate` and then `npm run drizzle:migrate`.

> [! NOTE]
> Any changes made to the code one has to restart the server to reflect those changes.
