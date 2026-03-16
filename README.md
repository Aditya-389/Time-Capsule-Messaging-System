# Time Capsule Messaging System

A backend service for scheduling messages to be delivered at a future time.

Users can:
- sign up and log in
- schedule messages for future delivery
- view only their own scheduled messages
- rely on background delivery that survives server restarts

## Overview

This project is built as a REST API using:
- Node.js
- Express
- PostgreSQL
- Prisma
- Redis
- BullMQ
- JWT authentication
- Zod validation

The system stores messages in PostgreSQL and uses Redis + BullMQ to schedule delivery jobs. When the scheduled time arrives, the worker marks the message as delivered, stores the delivery timestamp, and writes a log entry to a file.

## Core Features

- JWT-based authentication
- Protected routes
- Message scheduling
- Message listing per authenticated user
- Background delivery worker
- Persistent database storage
- File-based delivery logs
- Restart-safe scheduling with BullMQ

## Tech Stack

- Backend: Node.js, Express
- Database: PostgreSQL
- ORM: Prisma
- Queue: BullMQ
- Queue storage: Redis
- Validation: Zod
- Auth: JWT + cookies / Bearer token

## Folder Structure

```text
Backend/
|-- config/
|   |-- prismaClient.js
|   `-- redis.js
|-- controller/
|   |-- auth.js
|   `-- message.js
|-- lib/
|   `-- utils/
|       `-- generatetoken.js
|-- middleware/
|   `-- protectedRoute.js
|-- prisma/
|   |-- migrations/
|   `-- schema.prisma
|-- routes/
|   |-- auth.js
|   `-- message.js
|-- services/
|   `-- message.service.js
|-- validator/
|   |-- auth.js
|   `-- message.js
|-- logs/
|-- .env
|-- package.json
`-- server.js
```

## Authentication

The API uses JWT authentication.

After signup or login:
- a JWT token is generated
- the token can be stored in cookies
- protected routes also support `Authorization: Bearer <token>`

## API Endpoints

### Auth

#### `POST /api/auth/signup`

Create a new user.

Request body:

```json
{
  "email": "user@example.com",
  "password": "password123",
  "fullName": "John Doe"
}
```

#### `POST /api/auth/login`

Login an existing user.

Request body:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### `POST /api/auth/logout`

Logout the current user.

### Messages

All message routes are protected.

#### `POST /api/messages`

Schedule a message for future delivery.

Request body:

```json
{
  "recipient_email": "recipient@example.com",
  "message": "Hello from the past!",
  "deliver_at": "2026-02-20T15:30:00Z"
}
```

Validation rules:
- `recipient_email` must be a valid email
- `message` is required
- `message` max length is 500 characters
- `deliver_at` must be a valid datetime
- `deliver_at` must be in the future

#### `GET /api/messages`

Returns all messages created by the authenticated user.

Response includes:
- `id`
- `recipient_email`
- `message`
- `deliver_at`
- `status`
- `created_at`
- `delivered_at`

## Delivery Mechanism

The delivery system uses Redis + BullMQ instead of `setTimeout` or in-memory scheduling.

### Flow

1. A user creates a message with a future `deliver_at`
2. The message is saved in PostgreSQL
3. A delayed BullMQ job is added using Redis
4. When the scheduled time arrives:
   - the worker processes the job
   - the message status is changed from `PENDING` to `DELIVERED`
   - `delivered_at` is recorded
   - a log entry is written to a file

### Why this approach is reliable

- no long-delay `setTimeout`
- no in-memory scheduling state
- jobs are stored in Redis
- messages are stored in PostgreSQL
- pending messages are re-synced on server restart

### Delivery log example

```txt
[2026-02-20T15:30:00Z] Delivered message 123 to recipient@example.com
```

## Database Models

### User

- `id`
- `email`
- `passwordHash`
- `fullName`
- `isActive`
- `createdAt`
- `updatedAt`

### Message

- `id`
- `userId`
- `recipientEmail`
- `message`
- `deliverAt`
- `status`
- `createdAt`
- `deliveredAt`

## Environment Variables

Create a `.env` file inside `Backend/`.

```env
PORT=3000

DATABASE_URL=your_postgresql_connection_url
DIRECT_URL=your_direct_postgresql_connection_url

JWT_SECRET=your_jwt_secret
NODE_ENV=development

REDIS_URL=your_redis_connection_url
BULLMQ_QUEUE_NAME=message-delivery
```

## Installation

### 1. Install dependencies

```bash
cd Backend
npm install
```

### 2. Generate Prisma client

```bash
npm run prisma:generate
```

### 3. Run database migrations

```bash
npx prisma migrate dev
```

### 4. Start Redis

Use either:
- a local Redis server
- a hosted Redis service such as Upstash

Example local Redis:

```bash
redis-server
```

### 5. Start the backend

```bash
npm run dev
```

## Quick Start

After the server starts:

1. Sign up a user
2. Login
3. Call `POST /api/messages`
4. Wait until the scheduled time
5. Call `GET /api/messages`
6. Confirm the message status changed to `delivered`

## Example curl Commands

### Signup

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"user@example.com\",\"password\":\"password123\",\"fullName\":\"John Doe\"}"
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"user@example.com\",\"password\":\"password123\"}"
```

### Schedule a message

```bash
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d "{\"recipient_email\":\"recipient@example.com\",\"message\":\"Hello from the past!\",\"deliver_at\":\"2026-02-20T15:30:00Z\"}"
```

### View messages

```bash
curl http://localhost:3000/api/messages \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Important Notes

- Users can only access their own messages
- Messages cannot be edited after creation
- Delivery status is updated automatically by the background worker
- Delivery is logged to a file
- `deliver_at` should be sent carefully with timezone awareness
- A timestamp ending with `Z` means UTC

## Current Status

Implemented:
- authentication
- protected routes
- Prisma schema and database integration
- message scheduling
- message listing
- BullMQ-based delivery worker
- delivery logs

Not yet implemented:
- actual outbound email sending to an inbox

Important:
In the current codebase, "delivered" means the scheduled delivery job was successfully processed by the backend. It does not yet mean that an actual email was sent through SMTP or an email provider.

## Future Improvements

- integrate real email sending
- add retry dashboard / monitoring
- add automated tests
- add deployment guide
- add API docs

## Submission Notes

This project satisfies the main backend requirements for:
- authentication
- message creation
- message listing
- future scheduling
- automatic delivery
- persistent storage
- restart-safe delivery jobs

## Author

Aditya Chouhan  
Backend Developer 

GitHub: https://github.com/Aditya-389

LinkedIn: https://www.linkedin.com/in/aditya-chouhan-262458289/
