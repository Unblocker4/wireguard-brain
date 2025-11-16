# WireGuard VPN Server API

A centralized "Brain" API service for managing WireGuard VPN configurations. This service handles user authentication, VPN configuration provisioning, and load balancing across multiple WireGuard gateway servers.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Endpoints](#api-endpoints)
- [Docker Deployment](#docker-deployment)
- [Local Development](#local-development)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)

## Overview

This service acts as the central management API for a WireGuard VPN system. It:

- **Authenticates users** and manages user accounts
- **Provisions WireGuard configurations** automatically for new users
- **Load balances** users across multiple gateway servers
- **Monitors gateway health** and tracks active user counts
- **Manages gateways** through admin endpoints

The service communicates with WireGuard gateway agents (the "Muscle") that actually run the WireGuard servers. When a user requests a VPN configuration, this API selects the least busy gateway, generates WireGuard keys, assigns an IP address, and communicates with the gateway agent to provision the peer.

## Architecture

```
┌─────────────┐
│   Client    │
│  (Android)  │
└──────┬──────┘
       │
       │ HTTP/HTTPS
       │
┌──────▼─────────────────────────────────┐
│         Brain API (This Service)      │
│  - User Authentication                │
│  - Config Provisioning                │
│  - Load Balancing                     │
│  - Gateway Management                 │
└──────┬────────────────────────────────┘
       │
       │ MongoDB Atlas
       │
┌──────▼──────┐
│  Database   │
│  (MongoDB)  │
└─────────────┘

┌───────────────────────────────────────┐
│  Gateway Agents (Muscle)              │
│  - us-east-1                          │
│  - eu-west-1                          │
│  - ...                                │
└───────────────────────────────────────┘
```

## Features

- ✅ User registration and authentication (JWT-based)
- ✅ Automatic WireGuard configuration generation
- ✅ Load balancing across multiple gateways
- ✅ Gateway health monitoring (every 30 seconds)
- ✅ Admin endpoints for gateway management
- ✅ RESTful API design
- ✅ Docker containerization support
- ✅ MongoDB integration

## Prerequisites

Before you begin, ensure you have:

- **Node.js** 24+ installed
- **MongoDB Atlas** account (or local MongoDB instance)
- **WireGuard tools** installed (for key generation)
- **Docker** and **Docker Compose** (optional, for containerized deployment)
- At least one **WireGuard Gateway Agent** running and accessible

## Installation

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd wireguard-server
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Environment Configuration

Create a `.env` file in the root directory:

```bash
cp .env.example .env  # If you have an example file
```

Or create a new `.env` file with the following variables:

```env
# Server Configuration
PORT=4000

# MongoDB Connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

### Step 4: Generate JWT Secret

Generate a secure random string for `JWT_SECRET`:

```bash
# Using OpenSSL
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Step 5: Start the Server

#### Development Mode

```bash
npm run dev
```

#### Production Mode

```bash
npm start
```

The server will start on `http://0.0.0.0:4000` (or the port specified in your `.env` file).

## Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Server port number | No | `4000` |
| `MONGODB_URI` | MongoDB connection string | Yes | - |
| `JWT_SECRET` | Secret key for JWT token signing | Yes | - |

### Gateway Configuration

Gateways must be added through the admin API endpoints. Each gateway requires:

- **name**: Unique identifier (e.g., "us-east-1")
- **apiEndpoint**: Full URL to the gateway agent API (e.g., "http://1.2.3.4:3001")
- **apiKey**: Secret key for authenticating with the gateway agent
- **subnet**: WireGuard subnet (e.g., "10.10.0.0/16")
- **wgPublicKey**: The gateway's WireGuard public key

## API Endpoints

### Authentication Endpoints

#### Register User

Creates a new user account.

**Endpoint:** `POST /auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (201 Created):**
```json
{
  "message": "User registered successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Missing email or password
- `409 Conflict`: User already exists
- `500 Internal Server Error`: Server error

**Example:**
```bash
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'
```

---

#### Login User

Authenticates a user and returns a JWT token.

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `400 Bad Request`: Missing email or password
- `401 Unauthorized`: Invalid credentials
- `500 Internal Server Error`: Server error

**Example:**
```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'
```

---

### VPN Endpoints

#### Get VPN Configuration

Retrieves or creates a WireGuard configuration for the authenticated user.

**Endpoint:** `GET /api/v1/get-config`

**Authentication:** Required (Bearer Token)

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```
[Interface]
PrivateKey = <user_private_key>
Address = 10.10.1.42/32
DNS = 1.1.1.1, 1.0.0.1

[Peer]
PublicKey = <gateway_public_key>
Endpoint = 1.2.3.4:51820
AllowedIPs = 0.0.0.0/0
```

**Content-Type:** `text/plain`

**Behavior:**
- If user already has a configuration, returns existing config
- If user is new, automatically:
  1. Selects the least busy gateway
  2. Generates WireGuard keys
  3. Assigns an IP address
  4. Provisions the peer on the gateway
  5. Returns the new configuration

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token
- `503 Service Unavailable`: No gateways available
- `500 Internal Server Error`: Failed to generate config

**Example:**
```bash
curl -X GET http://localhost:4000/api/v1/get-config \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -o wg0.conf
```

---

### Admin Endpoints

All admin endpoints require both authentication and admin role.

#### Create Gateway

Creates a new WireGuard gateway entry.

**Endpoint:** `POST /admin/gateways`

**Authentication:** Required (Bearer Token + Admin Role)

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "us-east-1",
  "apiEndpoint": "http://1.2.3.4:3001",
  "apiKey": "gateway-secret-api-key",
  "subnet": "10.10.0.0/16",
  "wgPublicKey": "gateway_public_key_here"
}
```

**Response (201 Created):**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "us-east-1",
  "apiEndpoint": "http://1.2.3.4:3001",
  "subnet": "10.10.0.0/16",
  "wgPublicKey": "gateway_public_key_here",
  "activeUserCount": 0,
  "totalPeers": 0,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Note:** The `apiKey` is not returned in the response for security.

**Error Responses:**
- `400 Bad Request`: Missing required fields
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Admin access required
- `409 Conflict`: Gateway name already exists
- `500 Internal Server Error`: Server error

**Example:**
```bash
curl -X POST http://localhost:4000/admin/gateways \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "us-east-1",
    "apiEndpoint": "http://1.2.3.4:3001",
    "apiKey": "gateway-secret-api-key",
    "subnet": "10.10.0.0/16",
    "wgPublicKey": "gateway_public_key_here"
  }'
```

---

#### List Gateways

Retrieves all configured gateways.

**Endpoint:** `GET /admin/gateways`

**Authentication:** Required (Bearer Token + Admin Role)

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "name": "us-east-1",
    "apiEndpoint": "http://1.2.3.4:3001",
    "subnet": "10.10.0.0/16",
    "wgPublicKey": "gateway_public_key_here",
    "activeUserCount": 15,
    "totalPeers": 20,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  {
    "_id": "507f1f77bcf86cd799439012",
    "name": "eu-west-1",
    "apiEndpoint": "http://5.6.7.8:3001",
    "subnet": "10.11.0.0/16",
    "wgPublicKey": "gateway_public_key_here_2",
    "activeUserCount": 8,
    "totalPeers": 12,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

**Note:** Gateways are sorted alphabetically by name. The `apiKey` is never returned.

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Admin access required
- `500 Internal Server Error`: Server error

**Example:**
```bash
curl -X GET http://localhost:4000/admin/gateways \
  -H "Authorization: Bearer <admin_token>"
```

---

#### Update Gateway

Updates an existing gateway configuration.

**Endpoint:** `PUT /admin/gateways/:id`

**Authentication:** Required (Bearer Token + Admin Role)

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**URL Parameters:**
- `id`: Gateway MongoDB ObjectId

**Request Body:**
```json
{
  "name": "us-east-1-updated",
  "apiEndpoint": "http://1.2.3.4:3001",
  "apiKey": "new-api-key",
  "subnet": "10.10.0.0/16",
  "wgPublicKey": "new_public_key"
}
```

**Note:** All fields are optional. Only provided fields will be updated.

**Response (200 OK):**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "us-east-1-updated",
  "apiEndpoint": "http://1.2.3.4:3001",
  "subnet": "10.10.0.0/16",
  "wgPublicKey": "new_public_key",
  "activeUserCount": 15,
  "totalPeers": 20,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-02T00:00:00.000Z"
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Admin access required
- `404 Not Found`: Gateway not found
- `409 Conflict`: Gateway name already exists
- `500 Internal Server Error`: Server error

**Example:**
```bash
curl -X PUT http://localhost:4000/admin/gateways/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "us-east-1-updated",
    "wgPublicKey": "new_public_key"
  }'
```

---

#### Delete Gateway

Deletes a gateway configuration.

**Endpoint:** `DELETE /admin/gateways/:id`

**Authentication:** Required (Bearer Token + Admin Role)

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**URL Parameters:**
- `id`: Gateway MongoDB ObjectId

**Response (200 OK):**
```json
{
  "message": "Gateway deleted successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Gateway has assigned users (cannot delete)
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Admin access required
- `404 Not Found`: Gateway not found
- `500 Internal Server Error`: Server error

**Security Note:** The gateway cannot be deleted if users are still assigned to it. You must reassign users first.

**Example:**
```bash
curl -X DELETE http://localhost:4000/admin/gateways/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer <admin_token>"
```

---

## Docker Deployment

### Step 1: Build the Docker Image

```bash
docker build -t wireguard-brain-api .
```

### Step 2: Create .env File

Ensure your `.env` file is configured with all required variables.

### Step 3: Run with Docker Compose

```bash
docker-compose up -d
```

This will:
- Build the image from the Dockerfile
- Start the container with environment variables from `.env`
- Expose the port specified in your `PORT` environment variable
- Automatically restart the container if it crashes

### Step 4: View Logs

```bash
docker-compose logs -f brain-api
```

### Step 5: Stop the Service

```bash
docker-compose down
```

### Manual Docker Run

If you prefer to run Docker manually:

```bash
docker run -d \
  --name vpn-brain-api \
  --env-file .env \
  -p 4000:4000 \
  --restart unless-stopped \
  wireguard-brain-api
```

## Local Development

### Prerequisites for Development

- Node.js 24+
- MongoDB (local or Atlas)
- WireGuard tools installed:

  **macOS:**
  ```bash
  brew install wireguard-tools
  ```

  **Linux:**
  ```bash
  sudo apt-get install wireguard-tools
  ```

  **Windows:**
  Download from [WireGuard website](https://www.wireguard.com/install/)

### Development Workflow

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start in development mode:**
   ```bash
   npm run dev
   ```

   This uses `nodemon` to automatically restart the server on file changes.

4. **Run production build:**
   ```bash
   npm start
   ```

### Project Structure

```
wireguard-server/
├── src/
│   ├── app.js                 # Express app setup
│   ├── server.js              # Server entry point
│   ├── config/
│   │   └── db.js              # MongoDB connection
│   ├── controllers/
│   │   ├── admin.controller.js
│   │   ├── auth.controller.js
│   │   └── vpn.controller.js
│   ├── middleware/
│   │   ├── admin.middleware.js
│   │   ├── auth.middleware.js
│   │   └── error.middleware.js
│   ├── models/
│   │   ├── gateway.model.js
│   │   └── user.model.js
│   ├── routes/
│   │   ├── admin.routes.js
│   │   ├── auth.routes.js
│   │   ├── index.js
│   │   └── vpn.routes.js
│   ├── services/
│   │   ├── axios.service.js
│   │   └── vpn.service.js
│   └── jobs/
│       └── gatewayStats.job.js  # Background job for gateway stats
├── .dockerignore
├── .env                        # Environment variables (not in git)
├── Dockerfile
├── docker-compose.yaml
├── package.json
└── README.md
```

## Security Considerations

### ⚠️ Important Security Notes

1. **JWT Secret**: Use a strong, randomly generated secret for `JWT_SECRET`. Never commit this to version control.

2. **WireGuard Private Keys**: Currently, private keys are stored in plaintext in the database. **This is a security risk!** In production, you should:
   - Encrypt private keys before storing
   - Use a key management service (KMS)
   - Consider storing keys in a secure vault

3. **API Keys**: Gateway API keys are stored in the database. Ensure:
   - Database connections use TLS/SSL
   - Database access is restricted
   - Regular security audits are performed

4. **Authentication**: All sensitive endpoints require JWT authentication. Tokens expire after 30 days.

5. **Admin Access**: Admin endpoints require both authentication and admin role. Ensure users with admin role are properly managed.

6. **HTTPS**: In production, always use HTTPS. Consider using a reverse proxy (nginx, Traefik) with SSL/TLS certificates.

7. **Rate Limiting**: Consider implementing rate limiting to prevent abuse:
   ```javascript
   // Example with express-rate-limit
   const rateLimit = require('express-rate-limit');
   app.use('/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 5 }));
   ```

8. **Input Validation**: Always validate and sanitize user input. Consider using libraries like `joi` or `express-validator`.

9. **CORS**: Configure CORS properly for production:
   ```javascript
   const cors = require('cors');
   app.use(cors({
     origin: 'https://your-frontend-domain.com',
     credentials: true
   }));
   ```

## Troubleshooting

### Common Issues

#### 1. MongoDB Connection Error

**Error:** `MongoDB connection error: ...`

**Solutions:**
- Verify `MONGODB_URI` is correct in `.env`
- Check network connectivity to MongoDB Atlas
- Ensure IP whitelist includes your server's IP
- Verify MongoDB credentials are correct

#### 2. WireGuard Key Generation Fails

**Error:** `wg genkey` command not found

**Solutions:**
- Install WireGuard tools: `brew install wireguard-tools` (macOS) or `apt-get install wireguard-tools` (Linux)
- Ensure `wg` command is in PATH
- In Docker, WireGuard tools are installed automatically

#### 3. Gateway Agent Connection Fails

**Error:** `AGENT-ERROR` in logs

**Solutions:**
- Verify gateway `apiEndpoint` is correct and accessible
- Check `apiKey` matches the gateway agent's expected key
- Ensure gateway agent is running and healthy
- Check firewall rules allow communication

#### 4. No Gateways Available

**Error:** `503 Service Unavailable: No gateways found`

**Solutions:**
- Add at least one gateway via admin API
- Verify gateways are not marked as "down" (activeUserCount = -1)
- Check gateway health in database

#### 5. JWT Token Invalid

**Error:** `401 Unauthorized: Invalid token`

**Solutions:**
- Verify token is being sent in Authorization header: `Bearer <token>`
- Check token hasn't expired (30 days)
- Ensure `JWT_SECRET` hasn't changed
- Try logging in again to get a new token

#### 6. Admin Access Denied

**Error:** `403 Forbidden: Admin access required`

**Solutions:**
- Verify user has `role: 'admin'` in database
- Update user role manually in MongoDB:
  ```javascript
  db.users.updateOne(
    { email: "admin@example.com" },
    { $set: { role: "admin" } }
  )
  ```

### Logs

View application logs:

**Docker:**
```bash
docker-compose logs -f brain-api
```

**Local:**
Logs are printed to stdout. Use a process manager like PM2 for production:
```bash
npm install -g pm2
pm2 start src/server.js --name wireguard-brain-api
pm2 logs wireguard-brain-api
```

### Health Check

The service doesn't have a dedicated health endpoint, but you can verify it's running:

```bash
curl http://localhost:4000/auth/login
# Should return 400 Bad Request (missing body) instead of connection error
```

## License

[Specify your license here]

## Contributing

[Add contribution guidelines if applicable]

## Support

For issues and questions, please [open an issue](link-to-issues) or contact [your contact information].

