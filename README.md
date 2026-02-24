# Grid-Wars — Realtime Distributed Territory Capture System

Grid-Wars is a realtime distributed multiplayer system where users capture tiles on a shared global grid.  
The system demonstrates modern backend architecture using Go, PostgreSQL, Redis, WebSockets, and a React frontend deployed independently.

This project showcases distributed state synchronization, clean architecture, and production deployment.

---

## The project demonstrates:-

• Distributed system design with realtime synchronization  
• Clean architecture with strict separation of concerns  
• Stateless backend with Redis pub/sub for realtime messaging  
• Horizontal-scalable backend architecture  
• WebSocket realtime state propagation  
• Production deployment across multiple cloud providers  
• Database persistence with PostgreSQL  
• Modern frontend-backend separation  
• Cross-origin secure communication (CORS handling)

---

## Table of Contents:-

- Architecture Diagram  
- Core Design Principles  
- Technology Stack  
- API Design & Routes  
- Getting Started  
- Deployment  
- Author  
- License  

---

## Architecture Diagram:-
<img width="997" height="526" alt="image" src="https://github.com/user-attachments/assets/e4b26a7b-ec31-4e7d-a679-d1e6444c2333" />


---

## Core Design Principles:-

### 1. Clean Architecture
Strict separation between:

- handlers (HTTP layer)
- services (business logic)
- repositories (data access)
- realtime (WebSocket + Redis)
- database layer

This ensures scalability, testability, and maintainability.

---

### 2. Stateless Backend

The backend stores no session state in memory.

All persistent state lives in:

- PostgreSQL → permanent storage  
- Redis → realtime messaging  

This allows horizontal scaling across multiple backend instances.

---
### 3. User clicks tile
- HTTP request to backend
- Backend updates PostgreSQL
- Backend publishes Redis event
- All backend instances receive event
- WebSocket broadcasts to clients
- All clients update in realtime

### 5. Separation of Frontend and Backend

Frontend and backend are deployed independently.

This enables:

- independent scaling
- independent deployment
- fault isolation
- modern microservice architecture patterns

---

## Technology Stack

### Backend

- Go (Golang)
- Chi Router
- WebSockets
- PostgreSQL
- Redis Pub/Sub
- pgx driver

### Frontend

- React
- Vite
- CSS (custom UI)

### Infrastructure

- Railway (backend hosting)
- Netlify (frontend hosting)
- PostgreSQL (database)
- Redis (realtime messaging)

---

## API Design & Routes

### GET /tiles
```json
Response

Status: 200 OK
Content-Type: application/json

[
  {
    "id": 1,
    "ownerId": "alice",
    "updatedAt": "2026-02-13T18:28:26Z"
  },
  {
    "id": 2,
    "ownerId": null,
    "updatedAt": "2026-02-13T18:28:26Z"
  },
  {
    "id": 3,
    "ownerId": "bob",
    "updatedAt": "2026-02-13T18:29:10Z"
  }
]
```

### POST /register
```json
Request
{
  "id": "om",
  "name": "om",
  "color": "#ff0000"
}
Response

Status: 201 Created

Empty body is acceptable:

{}

OR confirmation:

{
  "id": "om",
  "name": "om",
  "color": "#ff0000"
}
Error case (duplicate user)

Status: 409 Conflict

{
  "error": "user already exists"
}
```

### POST /capture
```json
Request
{
  "tileId": 1,
  "userId": "alice"
}
Success Response

Status: 200 OK

{
  "id": 1,
  "ownerId": "alice",
  "updatedAt": "2026-02-14T10:15:30Z"
}
Error: tile already claimed

Status: 409 Conflict

{
  "error": "tile already claimed"
}
Error: invalid tile

Status: 404 Not Found

{
  "error": "tile not found"
}
```
### GET /leaderboard
```json
Response

Status: 200 OK

[
  {
    "userId": "alice",
    "name": "Alice",
    "color": "#ff0000",
    "count": 152
  },
  {
    "userId": "bob",
    "name": "Bob",
    "color": "#00ff00",
    "count": 87
  }
]

Sorted descending by count.

Go struct:

type LeaderboardEntry struct {
    UserID string `json:"userId"`
    Name   string `json:"name"`
    Color  string `json:"color"`
    Count  int    `json:"count"`
}
```


## Getting Started

### 1. Clone repository


git clone https://github.com/yourusername/grid-wars.git

cd grid-wars


---

### 2. Setup Backend
```
Create `.env`


DATABASE_URL=your_postgres_url
REDIS_URL=your_redis_url
PORT=8080


Run backend:


go run main.go

```
---

### 3. Setup Frontend

```
cd grid-frontend
npm install


Create `.env`


VITE_BACKEND_URL=http://localhost:8080


Run frontend:


npm run dev

```
---

### 4. Open browser

```
http://localhost:5173

```
---

## Deployment

### Backend

- Deploy on Railway.
- Environment variables required:

- DATABASE_URL
- REDIS_URL
- PORT


---

### Frontend

- Deploy on Netlify.

- Environment variable required:

- VITE_BACKEND_URL=https://your-backend-url


---

## Author

**Hardik Borse**  
LinkedIn: https://www.linkedin.com/in/hardik-borse-aa7729324/  
Email: borsehardik@gmail.com  

---

## License

Licensed under the Apache License 2.0
You may use, modify, and distribute this software in accordance with the license.
