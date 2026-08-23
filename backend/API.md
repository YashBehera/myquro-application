# API Documentation

This document outlines the API endpoints available in the MyQuro backend.

## Base URL

`https://myquro.com` (or your configured `BACKEND_URL`)

## Authentication

Authentication is handled via **Better Auth**.

- **Base Path**: `/api/auth`
- **Common Endpoints**:
  - `POST /api/auth/sign-in/email`
  - `POST /api/auth/sign-up/email`
  - `POST /api/auth/sign-out`
  - `GET /api/auth/session`
  - (See Better Auth documentation for full list)

---

## Restaurants

### Base Path: `/api/restaurants`

#### 1. Get All Restaurants

**GET** `/`

- **Description**: Fetch a list of all restaurants with card display details.
- **Auth**: Public.
- **Response**:

  ```json
  {
    "restaurants": [
      {
        "id": "string",
        "restaurantName": "string",
        "restaurantType": "string",
        "restaurantLogo": "string",
        "restaurantBanner": "string",
        "seatingCapacity": "number",
        "city": "string",
        "state": "string",
        "rating": "number",
        "ratingCount": "number",
        "restaurantStatus": "active | inactive | suspended",
        "isOpen": "boolean"
      }
    ]
  }
  ```

#### 2. Get Restaurant Details by ID

**GET** `/:id`

- **Description**: Fetch details of a specific restaurant by its ID.
- **Auth**: Public.
- **Response**:

  ```json
  {
    "restaurant": {
      "id": "string",
      "slug": "string",
      "ownerId": "string",
      "restaurantName": "string",
      "restaurantType": "string",
      "restaurantAddress": "string",
      "restaurantLogo": "string",
      "restaurantBanner": "string",
      "establishmentYear": "number",
      "seatingCapacity": "number",
      "city": "string",
      "state": "string",
      "postalCode": "number",
      "description": "string",
      "phoneNumber": "string",
      "email": "string",
      "website": "string",
      "cuisine": ["string"],
      "rating": "number",
      "ratingCount": "number",
      "corporateIdentificationNumber": "string",
      "gstNumber": "string",
      "fssaiLicenseNumber": "string",
      "defaultGstPercentage": "number",
      "createdAt": "timestamp",
      "updatedAt": "timestamp",
      "suspendedAt": "timestamp",
      "suspendedReason": "string",
      "restaurantStatus": "active | inactive | suspended",
      "isOpen": "boolean"
    }
  }
  ```

#### 3. Get My Restaurant

**GET** `/my-restaurant`

- **Description**: Get details of the restaurant owned by the authenticated user.
- **Auth**: Required (Role: `restaurant`).

#### 4. Update Restaurant

**PATCH** `/:id`

- **Description**: Update restaurant details.
- **Auth**: Required (Owner/Manager).
- **Body**:

  ```json
  {
    "restaurantName": "string",
    "restaurantType": "string",
    "restaurantAddress": "string",
    "restaurantLogo": "string",
    "restaurantBanner": "string",
    "establishmentYear": "number",
    "seatingCapacity": "number",
    "city": "string",
    "state": "string",
    "postalCode": "string",
    "description": "string",
    "phoneNumber": "string",
    "email": "string",
    "website": "string",
    "cuisine": ["string"],
    "defaultGstPercentage": "number"
  }
  ```

#### 5. Close Restaurant

**PATCH** `/:id/close`

- **Description**: Set restaurant status to closed.
- **Auth**: Required (Owner/Manager).

#### 6. Open Restaurant

**PATCH** `/:id/open`

- **Description**: Set restaurant status to open.
- **Auth**: Required (Owner/Manager).

#### 7. Get Restaurant Status

**GET** `/:id/status`

- **Description**: Check if a restaurant is currently open.
- **Auth**: Public.
- **Response**:

  ```json
  {
    "isOpen": "boolean"
  }
  ```

---

## Restaurant Applications

### Base Path: `/api/restaurants`

#### 1. Apply for a Restaurant

**POST** `/apply`

- **Description**: Submit a new restaurant application.
- **Auth**: Required (User role must not be `restaurant` or `admin`).
- **Body**:

  ```json
  {
    "restaurantName": "string",
    "restaurantType": "string",
    "restaurantAddress": "string",
    "city": "string",
    "state": "string",
    "postalCode": "string",
    "phoneNumber": "string",
    "email": "string",
    "description": "string",
    "gstNumber": "string",
    "fssaiLicenseNumber": "string",
    "defaultGstPercentage": "number"
  }
  ```

#### 2. View Application Status

**GET** `/view-request`

- **Description**: View the status of the user's most recent restaurant application.
- **Auth**: Required.
- **Response**:

  ```json
  {
    "request": {
      "id": "string",
      "requestStatus": "PENDING | APPROVED | REJECTED",
      "requestedAt": "timestamp"
    },
    "restaurant": {
      "id": "string",
      "restaurantName": "string"
    }
  }
  ```

---

## Staff Management

### Base Path: `/api/restaurants`

#### 1. Invite Staff

**POST** `/:restaurantId/invite-staff`

- **Description**: Send an email invitation to a user to join the restaurant staff.
- **Auth**: Required (Owner).
- **Body**:

  ```json
  {
    "invitedEmail": "string",
    "role": "manager | staff"
  }
  ```

#### 2. List Staff Invites

**GET** `/:restaurantId/staff-invites`

- **Description**: Get a list of all pending and past staff invites for a specific restaurant.
- **Auth**: Required (Owner).

---

---

## Staff Invites

### Base Path: `/api/staff-requests`

#### 1. View Invite

**GET** `/view-invite/:inviteToken`

- **Description**: View details of a staff invitation.
- **Auth**: Required.

#### 2. Accept Invite

**POST** `/:inviteToken/accept-invite`

- **Description**: Accept a staff invitation to join a restaurant.
- **Auth**: Required.

#### 3. Reject Invite

**POST** `/:inviteToken/reject-invite`

- **Description**: Reject a staff invitation to join a restaurant.
- **Auth**: Required.

#### 4. My Invites

**GET** `/my-invites`

- **Description**: List all invites sent to the current user's email.
- **Auth**: Required.

#### 5. My Invites Detail

**GET** `/my-invites/detail`

- **Description**: List all invites sent to the current user's email with detailed restaurant and invited by user information.
- **Auth**: Required.
- **Response**:

  ```json
  {
    "invites": [
      {
        "id": "string",
        "invitedEmail": "string",
        "role": "string",
        "inviteToken": "string",
        "inviteStatus": "PENDING | ACCEPTED | REJECTED",
        "invitedAt": "timestamp",
        "respondedAt": "timestamp",
        "expiresAt": "timestamp",
        "restaurantId": "string",
        "restaurantName": "string",
        "restaurantType": "string",
        "restaurantAddress": "string",
        "city": "string",
        "state": "string",
        "restaurantLogo": "string",
        "restaurantBanner": "string",
        "invitedByUserId": "string",
        "invitedByUserName": "string",
        "invitedByUserEmail": "string"
      }
    ]
  }
  ```

---

## Restaurant Tables

### Base Path: `/api/restaurant-tables`

#### 1. Create Table

**POST** `/:restaurantId/tables/create`

- **Description**: Create a new table for a restaurant.
- **Auth**: Required (Owner/Manager).
- **Body**:

  ```json
  {
    "tableNumber": "number",
    "capacity": "number"
  }
  ```

#### 2. List Tables

**GET** `/:restaurantId/tables`

- **Description**: Get all tables for a specific restaurant.
- **Auth**: Required (Owner/Manager).

#### 3. Update Table

**PATCH** `/tables/:tableId`

- **Description**: Update table details.
- **Auth**: Required (Owner/Manager).
- **Body**:

  ```json
  {
    "tableNumber": "number",
    "capacity": "number",
    "liveStatus": "available | occupied | reserved",
    "isActive": "boolean"
  }
  ```

#### 4. Delete Table

**DELETE** `/tables/:tableId`

- **Description**: Soft delete a table (sets isActive to false).
- **Auth**: Required (Owner/Manager).

#### 5. Generate QR Code

**POST** `/tables/:tableId/qrcode`

- **Description**: Generate a new QR code for a table.
- **Auth**: Required (Owner/Manager).
- **Response**:

  ```json
  {
    "message": "QR code generated successfully",
    "qrToken": "string",
    "scanUrl": "string",
    "qrImageBase64": "string"
  }
  ```

#### 6. Get Table Session

**GET** `/table-session/:sessionId`

- **Description**: Get details of a specific table session.
- **Auth**: Required (Owner/Manager).

#### 7. Close Table Session

**PATCH** `/table-session/:sessionId/close`

- **Description**: Close an active table session.
- **Auth**: Required (Owner/Manager).

---

---

## Menus

### Base Path: `/api/menus`

#### 1. Create Category

**POST** `/:restaurantId/menu/categories`

- **Description**: Create a new menu category.
- **Auth**: Required (Owner/Manager).
- **Body**:

  ```json
  {
    "name": "string",
    "description": "string",
    "display_order": "number"
  }
  ```

#### 2. Get Categories

**GET** `/:restaurantId/menu/categories`

- **Description**: Get all menu categories for a restaurant.
- **Auth**: Required (Owner/Manager).
- **Response**:

  ```json
  {
    "categories": [
      {
        "id": "string",
        "category": "string",
        "description": "string",
        "displayOrder": "number",
        "isActive": "boolean",
        "createdAt": "string",
        "updatedAt": "string"
      }
    ]
  }
  ```

#### 3. Deactivate Category

**PATCH** `/:restaurantId/menu/categories/:categoryId/deactivate`

- **Description**: Deactivate a menu category.
- **Auth**: Required (Owner/Manager).

#### 4. Reorder Categories

**PATCH** `/:restaurantId/menu/categories/reorder`

- **Description**: Reorder menu categories by display order.
- **Auth**: Required (Owner/Manager).
- **Body**:

  ```json
  {
    "orderedCategoryIds": ["string"]
  }
  ```

#### 5. Create Menu Item

**POST** `/:restaurantId/menu/items`

- **Description**: Create a new menu item under a category.
- **Auth**: Required (Owner/Manager).
- **Body**:

  ```json
  {
    "name": "string",
    "description": "string",
    "categoryId": "string",
    "imageURL": "string (optional)"
  }
  ```

#### 6. Update Menu Item

**PATCH** `/:restaurantId/menu/items/:itemId/update`

- **Description**: Update a menu item.
- **Auth**: Required (Owner/Manager).
- **Body**:

  ```json
  {
    "name": "string (optional)",
    "description": "string (optional)",
    "additionalInfo": {} (optional),
    "imageURL": "string (optional)"
  }
  ```

#### 7. Deactivate Menu Item

**PATCH** `/:restaurantId/menu/items/:itemId/deactivate`

- **Description**: Deactivate a menu item.
- **Auth**: Required (Owner/Manager).

#### 7. Create Item Variant

**POST** `/:restaurantId/menu/items/:itemId/variants`

- **Description**: Add a variant (e.g., size, flavor) to a menu item.
- **Auth**: Required (Owner/Manager).
- **Body**:

  ```json
  {
    "name": "string",
    "price": "number (in paise)",
    "additionalInfo": {
      "foodType": "string",
      "portionSize": "string"
    },
    "imageURL": "string (optional)"
  }
  ```

#### 8. Update Item Variant

**PATCH** `/:restaurantId/menu/items/:itemId/variants/:variantId/update`

- **Description**: Update a menu item variant.
- **Auth**: Required (Owner/Manager).
- **Body**:

  ```json
  {
    "variantName": "string (optional)",
    "price": "number (in paise, optional)",
    "additionalInfo": {
      "foodType": "string (optional)",
      "portionSize": "string (optional)"
    },
    "imageURL": "string (optional)"
  }
  ```

#### 9. Deactivate Item Variant

**PATCH** `/:restaurantId/menu/items/:itemId/variants/:variantId/deactivate`

- **Description**: Deactivate a menu item variant.
- **Auth**: Required (Owner/Manager).

#### 10. Get Public Menu

**GET** `/:restaurantId/menu`

- **Description**: Get the public-facing menu for a restaurant (only active items).
- **Auth**: Public.

#### 11. Get Management Menu

**GET** `/:restaurantId/menu/manage`

- **Description**: Get the full menu for management (includes inactive items).
- **Auth**: Required (Owner/Manager).

---

## Sessions

### Base Path: `/api/sessions`

#### 1. Validate QR Token

**GET** `/validate-qr/:token`

- **Description**: Validate a QR token and return table/restaurant information.
- **Auth**: Public.
- **Response**:

  ```json
  {
    "success": true,
    "data": {
      "qrToken": "string",
      "tableId": "string",
      "tableNumber": "number",
      "capacity": "number",
      "restaurantId": "string"
    }
  }
  ```

#### 2. Create Session

**POST** `/create-session`

- **Description**: Create a new table session or join an existing one.
- **Auth**: Optional (Customer).
- **Body**:

  ```json
  {
    "tableId": "string (optional)",
    "restaurantId": "string",
    "qrToken": "string (optional)"
  }
  ```

- **Response**:

  ```json
  {
    "success": true,
    "sessionId": "string",
    "message": "string",
    "data": {}
  }
  ```

---

## QR Scanning

### Base Path: `/api/qr`

#### 1. Scan QR

**GET** `/scan/:qrToken`

- **Description**: Scans a table QR code. If valid, creates/fetches a table session and redirects to the client menu URL.
- **Auth**: Public.
- **Response**: Redirects to `${CLIENT_URL}/dashboard` or returns JSON with session details.

---

## Orders

### Base Path: `/api/orders`

#### 1. Make Order

**POST** `/make-order`

- **Description**: Place a new order for a specific table session or directly for a restaurant (creates a new session).
- **Auth**: Required (Customer or Staff).
- **Body**:

  ```json
  {
    "tableSessionId": "string (optional, if provided, uses existing session)",
    "restaurantId": "string (required if tableSessionId not provided)",
    "notes": "string",
    "items": [
      {
        "menuItemId": "string",
        "menuItemVariantId": "string",
        "quantity": "number",
        "itemNotes": "string"
      }
    ]
  }
  ```

- **Response**:

  ```json
  {
    "message": "Order created successfully",
    "orderId": "string",
    "totalAmount": "number (in paise)",
    "tableSessionId": "string (returned if new session created)"
  }
  ```

#### 2. Get Orders

**GET** `/:tableSessionId`

- **Description**: Get all orders for a specific table session.
- **Auth**: Required (Customer or Staff).

#### 3. Cancel Order

**PATCH** `/:orderId/cancel`

- **Description**: Cancel a placed order (if not yet served/preparing).
- **Auth**: Required (Customer or Staff).

#### 4. Update Order Items

**PATCH** `/:orderId/items/update`

- **Description**: Add, update, or remove items from an existing order (only for placed orders).
- **Auth**: Required (Customer or Staff).
- **Body**:

  ```json
  {
    "items": [
      {
        "action": "add | update | remove",
        "orderItemId": "string",
        "menuItemId": "string",
        "menuItemVariantId": "string",
        "quantity": "number",
        "itemNotes": "string"
      }
    ]
  }
  ```

#### 5. Update Order Status

**PATCH** `/:orderId/status`

- **Description**: Update the status of an order.
- **Auth**: Required (Restaurant Staff).
- **Body**:

  ```json
  {
    "status": "placed | preparing | served | cancelled"
  }
  ```

#### 6. Get User Orders

**GET** `/:userId/user-orders`

- **Description**: Get all orders placed by a specific user.
- **Auth**: Required (User must match userId).

#### 7. Get Restaurant Orders (Manager)

**GET** `/restaurant/:restaurantId/manager-orders`

- **Description**: Get all orders for a restaurant.
- **Auth**: Required (Owner/Manager).

---

---

## Billing

### Base Path: `/api/billing`

#### 1. Get Total Amount

**GET** `/:tableSessionId/total`

- **Description**: Get the current total billing amount for a session (sum of served items).
- **Auth**: Required.
- **Response**:

  ```json
  {
    "totalAmount": "number (in paise)"
  }
  ```

#### 2. Get Final Amount

**GET** `/:tableSessionId/final-amount`

- **Description**: Get the final amount calculation including discounts and taxes.
- **Auth**: Required.
- **Query Params**:
  - `discountPercentage`: number
  - `taxRate`: number
- **Response**:

  ```json
  {
    "finalAmount": "number (in paise)"
  }
  ```

#### 3. Generate Bill

**POST** `/:tableSessionId/generate-bill`

- **Description**: Generate and freeze the final bill for a session.
- **Auth**: Required.
- **Body**:

  ```json
  {
    "restaurantId": "string",
    "discountPercentage": "number",
    "taxRate": "number"
  }
  ```
  
- **Response**:

  ```json
  {
    "message": "Bill generated successfully",
    "tableSessionId": "string",
    "subtotal": "number (in paise)",
    "discountAmount": "number (in paise)",
    "taxableAmount": "number (in paise)",
    "gstAmount": "number (in paise)",
    "grandTotal": "number (in paise)"
  }
  ```

---

## Payments

### Base Path: `/api/payments`

#### 1. Record Payment

**POST** `/:tableSessionId/pay`

- **Description**: Record a payment for a table session.
- **Auth**: Required.
- **Body**:

  ```json
  {
    "amount": "number (in paise)",
    "method": "string",
    "referenceNumber": "string"
  }
  ```

- **Response**:

  ```json
  {
    "message": "Payment recorded successfully",
    "payment": {},
    "paymentStatus": "unpaid | partial | paid",
    "sessionStatus": "payment_pending | closed",
    "remainingAmount": "number (in paise)"
  }
  ```

---

## Reservations

### Base Path: `/api/reservations`

#### 1. Create Reservation

**POST** `/:reservationId/create`

- **Description**: Create a new reservation.
- **Auth**: Required.
- **Body**:

  ```json
  {
    "restaurantId": "string",
    "numberOfGuests": "number",
    "reservationTime": "string (ISO date)",
    "specialRequests": "string"
  }
  ```

#### 2. Assign Table to Reservation

**POST** `/:reservationId/assign-table`

- **Description**: Assign a table to a reservation.
- **Auth**: Required (Owner/Manager).
- **Body**:

  ```json
  {
    "tableId": "string",
    "restaurantId": "string"
  }
  ```

#### 3. Get My Reservations

**GET** `/my`

- **Description**: Get all reservations made by the authenticated user.
- **Auth**: Required.

#### 4. Get Reservation Details

**GET** `/:reservationId`

- **Description**: Get details of a specific reservation.
- **Auth**: Required (User must own reservation or be restaurant staff).

#### 5. Get Restaurant Reservations

**GET** `/:restaurantId/reservations`

- **Description**: Get all reservations for a restaurant.
- **Auth**: Required (Owner/Manager).

#### 6. Cancel Reservation

**PATCH** `/:reservationId/cancel`

- **Description**: Cancel a reservation.
- **Auth**: Required (User must own reservation).
- **Body**:

  ```json
  {
    "restaurantId": "string"
  }
  ```

#### 7. Reject Reservation

**PATCH** `/:reservationId/reject`

- **Description**: Reject a reservation.
- **Auth**: Required (Owner/Manager).
- **Body**:

  ```json
  {
    "restaurantId": "string"
  }
  ```

---

## Profile

### Base Path: `/api/profile`

#### 1. Update Profile

**PUT** `/me`

- **Description**: Update user profile information.
- **Auth**: Required.
- **Body**:

  ```json
  {
    "userId": "string",
    "username": "string",
    "bio": "string",
    "gender": "male | female | other",
    "age": "number",
    "location": "string",
    "dietaryPreferences": ["vegetarian", "vegan", "halal", "kosher", "gluten_free", "dairy_free"],
    "favouriteCuisines": ["italian", "chinese", "indian", "mexican", "japanese", "thai", "french", "american"],
    "spicePreference": "none | mild | medium | hot",
    "allergies": ["peanuts", "tree_nuts", "milk", "eggs", "fish", "shellfish", "wheat", "sesame"]
  }
  ```

#### 2. Get Profile

**GET** `/me`

- **Description**: Get the authenticated user's profile.
- **Auth**: Required.

---

## Admin

### Base Path: `/api/admin`

#### 1. Get All Restaurants

**GET** `/restaurants`

- **Description**: List all restaurants (admin only).
- **Auth**: Required (Admin).

#### 2. Suspend Restaurant

**PATCH** `/restaurants/suspend/:id`

- **Description**: Suspend a restaurant.
- **Auth**: Required (Admin).
- **Body**:

  ```json
  {
    "reason": "string"
  }
  ```

#### 3. Reactivate Restaurant

**PATCH** `/restaurants/reactivate/:id`

- **Description**: Reactivate a suspended restaurant.
- **Auth**: Required (Admin).

#### 4. Update Restaurant Details

**PUT** `/restaurants/:id`

- **Description**: Update restaurant details as admin.
- **Auth**: Required (Admin).
- **Body**:

  ```json
  {
    "name": "string",
    "address": "string",
    "contactEmail": "string"
  }
  ```

#### 5. Generate QR Code for Table (Admin)

**POST** `/tables/:tableId/qrcode`

- **Description**: Generate QR code for a table (admin access).
- **Auth**: Required (Admin).
- **Body**:

  ```json
  {
    "restaurantId": "string"
  }
  ```

#### 6. Get Restaurant Count

**GET** `/analytics/restaurants/count`

- **Description**: Get total count of restaurants.
- **Auth**: Required (Admin).

#### 7. Get Orders Count

**GET** `/analytics/orders/count`

- **Description**: Get total count of orders.
- **Auth**: Required (Admin).

#### 8. Get Failed Payments

**GET** `/analytics/failed-payments`

- **Description**: Get all failed payment records.
- **Auth**: Required (Admin).

---

## Restaurant Review Requests

### Base Path: `/api/restaurants`

#### 1. List Pending Requests

**GET** `/requests`

- **Description**: List all pending restaurant approval requests (admin only).
- **Auth**: Required (Admin).

#### 2. Approve Request

**POST** `/:requestId/approve`

- **Description**: Approve a restaurant request.
- **Auth**: Required (Admin).

#### 3. Reject Request

**POST** `/:requestId/reject`

- **Description**: Reject a restaurant request.
- **Auth**: Required (Admin).
- **Body**:

  ```json
  {
    "adminRemark": "string"
  }
  ```

---

## Protected

### Base Path: `/api/protected`

#### 1. Dashboard

**GET** `/dashboard`

- **Description**: Check authentication status.
- **Auth**: Required.
- **Response**:

  ```json
  {
    "message": "You are authenticated",
    "user": {}
  }
  ```

---

## Offers Management

### Base Path: `/api/offers`

#### 1. Get Restaurant Offers

**GET** `/:restaurantId`

- **Description**: Get all offers for a specific restaurant.
- **Auth**: Required (Restaurant Owner/Manager).
- **Response**:

  ```json
  {
    "offers": [
      {
        "id": "string",
        "description": "string",
        "discountPercentage": "string",
        "restaurantId": "string",
        "createdAt": "date",
        "createdBy": "string"
      }
    ]
  }
  ```

#### 2. Create Offer

**POST** `/:restaurantId`

- **Description**: Create a new offer for a restaurant.
- **Auth**: Required (Restaurant Owner/Manager).
- **Body**:

  ```json
  {
    "description": "string",
    "discountPercentage": "number"
  }
  ```

#### 3. Update Offer

**PATCH** `/:restaurantId/:offerId`

- **Description**: Update an existing offer.
- **Auth**: Required (Restaurant Owner/Manager).
- **Body**:

  ```json
  {
    "description": "string (optional)",
    "discountPercentage": "number (optional)"
  }
  ```

#### 4. Delete Offer

**DELETE** `/:restaurantId/:offerId`

- **Description**: Delete an offer.
- **Auth**: Required (Restaurant Owner/Manager).

---

## Manual Order Creation

### Base Path: `/api/orders`

#### 1. Create Manual Order

**POST** `/manual-order`

- **Description**: Create an order manually for restaurant staff.
- **Auth**: Required (Restaurant Owner/Manager).
- **Body**:

  ```json
  {
    "restaurantId": "string",
    "tableId": "string (optional)",
    "customerName": "string",
    "customerPhone": "string",
    "items": [
      {
        "menuItemId": "string",
        "variantId": "string (optional)",
        "quantity": "number",
        "notes": "string (optional)"
      }
    ],
    "notes": "string (optional)",
    "discountPercentage": "number (optional)",
    "paymentMethod": "string (optional)"
  }
  ```

---

## E-Bill Generation

### Base Path: `/api/billing`

#### 1. Generate E-Bill

**GET** `/:tableSessionId/e-bill`

- **Description**: Generate an electronic bill for a table session.
- **Auth**: Required (Restaurant Staff or Customer).
- **Response**:

  ```json
  {
    "eBill": {
      "tableSessionId": "string",
      "restaurantId": "string",
      "customerId": "string (optional)",
      "startedAt": "date",
      "billGeneratedAt": "date",
      "items": [...],
      "billSummary": {
        "subtotal": "string",
        "discountAmount": "string",
        "taxableAmount": "string",
        "gstAmount": "string",
        "grandTotal": "string"
      },
      "paymentStatus": "string",
      "notes": "string (optional)"
    }
  }
  ```

---

## Advanced Analytics

### Base Path: `/api/restaurant-analytics`

#### 1. Order Insights

**GET** `/:restaurantId/analytics/orders/insights`

- **Description**: Get detailed order analytics and insights.
- **Auth**: Required (Restaurant Owner/Manager).
- **Query Params**: `period` (days, default: 30)
- **Response**:

  ```json
  {
    "period": "30 days",
    "totalOrders": "number",
    "averageOrderValue": "number",
    "orderStatusDistribution": [...]
  }
  ```

#### 2. Peak Hours Analytics

**GET** `/:restaurantId/analytics/peak-hours`

- **Description**: Get peak hours data for orders and reservations.
- **Auth**: Required (Restaurant Owner/Manager).
- **Query Params**: `period` (days, default: 30)
- **Response**:

  ```json
  {
    "period": "30 days",
    "ordersByHour": [...],
    "reservationsByHour": [...]
  }
  ```

#### 3. Popular Items Analytics

**GET** `/:restaurantId/analytics/popular-items`

- **Description**: Get most popular menu items by sales.
- **Auth**: Required (Restaurant Owner/Manager).
- **Query Params**: `period` (days, default: 30), `limit` (default: 10)
- **Response**:

  ```json
  {
    "period": "30 days",
    "popularItems": [...]
  }
  ```

#### 4. Reservation Analytics

**GET** `/:restaurantId/analytics/reservations`

- **Description**: Get reservation analytics and insights.
- **Auth**: Required (Restaurant Owner/Manager).
- **Query Params**: `period` (days, default: 30)
- **Response**:

  ```json
  {
    "period": "30 days",
    "totalReservations": "number",
    "averagePartySize": "number",
    "reservationStatusDistribution": [...]
  }
  ```

---

## Report Exports

### Base Path: `/api/reports`

#### 1. Sales Report (PDF)

**GET** `/:restaurantId/reports/sales/pdf`

- **Description**: Export sales report as PDF.
- **Auth**: Required (Restaurant Owner/Manager).
- **Query Params**: `startDate`, `endDate` (required)
- **Response**: PDF file download

#### 2. Sales Report (Excel)

**GET** `/:restaurantId/reports/sales/excel`

- **Description**: Export sales report as Excel.
- **Auth**: Required (Restaurant Owner/Manager).
- **Query Params**: `startDate`, `endDate` (required)
- **Response**: Excel file download

#### 3. Orders Report (PDF)

**GET** `/:restaurantId/reports/orders/pdf`

- **Description**: Export orders report as PDF.
- **Auth**: Required (Restaurant Owner/Manager).
- **Query Params**: `startDate`, `endDate` (required)
- **Response**: PDF file download

---

## Admin Dashboard

### Base Path: `/api/admin`

#### 1. Dashboard Overview

**GET** `/dashboard/overview`

- **Description**: Get comprehensive admin dashboard overview.
- **Auth**: Required (Admin).
- **Response**:

  ```json
  {
    "overview": {
      "totalRestaurants": "number",
      "activeRestaurants": "number",
      "totalUsers": "number",
      "todayOrders": "number",
      "todayRevenue": "number",
      "todayReservations": "number",
      "failedPayments": "number"
    },
    "recentActivity": {
      "orders": [...],
      "payments": [...]
    }
  }
  ```

#### 2. Platform Analytics

**GET** `/analytics/platform`

- **Description**: Get platform-wide analytics.
- **Auth**: Required (Admin).
- **Query Params**: `period` (days, default: 30)
- **Response**:

  ```json
  {
    "period": "30 days",
    "orderMetrics": {...},
    "orderStatusDistribution": [...],
    "paymentStatusDistribution": [...],
    "topPerformingRestaurants": [...]
  }
  ```

---

## Restaurant Dashboard

### Base Path: `/api/restaurants`

#### 1. Dashboard Stats

**GET** `/:id/dashboard/stats`

- **Description**: Get today's dashboard statistics for a restaurant.
- **Auth**: Required (Restaurant Owner/Manager).
- **Response**:

  ```json
  {
    "stats": {
      "todayOrders": "number",
      "todayRevenue": "number",
      "todayReservations": "number",
      "totalTables": "number",
      "occupiedTables": "number",
      "availableTables": "number"
    }
  }
  ```

---

## User

### Base Path: `/api/user`

#### 1. Get Restaurant Status

**GET** `/restaurant-status`

- **Description**: Get all restaurants the authenticated user has access to (as owner, manager, or staff) with their roles.
- **Auth**: Required.
- **Response**:

  ```json
  {
    "restaurants": [
      {
        "id": "string",
        "name": "string",
        "type": "string",
        "address": "string",
        "city": "string",
        "state": "string",
        "status": "active | inactive | suspended",
        "role": "owner | manager | staff"
      }
    ],
    "totalCount": "number"
  }
  ```

#### 2. Get Restaurant Role

**GET** `/restaurants/:id/my-role`

- **Description**: Get the authenticated user's role for a specific restaurant.
- **Auth**: Required.
- **Response**:

  ```json
  {
    "role": "owner | manager | staff"
  }
  ```

---

## Notes

- All prices are in **paise** (1 INR = 100 paise).
- All timestamps are in ISO 8601 format.
- Authentication is required for most endpoints unless marked as "Public".
- Role-based access control applies: `customer`, `restaurant`, `admin`.
