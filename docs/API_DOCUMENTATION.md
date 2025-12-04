# REST API v1 Documentation

## Base URL

```
https://zukmwqfqmfuyqpxfjqil.supabase.co/functions/v1/api-v1
```

## Authentication

All write operations (POST, PATCH, DELETE) and credit-related endpoints require API key authentication.

### Setting up the API Key

1. Generate a secure API key (e.g., using `openssl rand -hex 32`)
2. Store it as `TRAINER_API_KEY` in your Supabase project secrets
3. Include the key in all authenticated requests via the `X-API-Key` header

### Example Request with Authentication

```bash
curl -X POST "https://zukmwqfqmfuyqpxfjqil.supabase.co/functions/v1/api-v1/clients" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-trainer-api-key" \
  -d '{"name": "John Doe", "email": "john@example.com"}'
```

## Error Responses

All errors return a consistent JSON format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200  | Success |
| 201  | Created |
| 400  | Bad Request / Validation Error |
| 401  | Unauthorized (invalid/missing API key) |
| 404  | Resource Not Found |
| 405  | Method Not Allowed |
| 500  | Internal Server Error |

---

## Endpoints

### Health Check

```
GET /health
```

Returns API status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Clients

### List Clients

```
GET /clients
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| name | string | Filter by name (partial match) |
| active | boolean | Filter by archived status |

**Example:**
```bash
curl "https://zukmwqfqmfuyqpxfjqil.supabase.co/functions/v1/api-v1/clients?active=true"
```

**Response:**
```json
{
  "clients": [
    {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+420123456789",
      "notes": "Prefers morning sessions",
      "health_restrictions": "Knee injury",
      "training_goals": ["Weight loss", "Strength"],
      "birth_date": "1990-05-15",
      "credit_balance": 5000,
      "is_favorite": true,
      "is_archived": false,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### Get Client Detail

```
GET /clients/{id}
```

Returns client with aggregated statistics.

**Response:**
```json
{
  "client": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "stats": {
      "last_training": {
        "id": "uuid",
        "date": "2024-01-14T09:00:00.000Z",
        "status": "completed"
      },
      "last_measurement": {
        "id": "uuid",
        "date": "2024-01-10",
        "weight": 85.5,
        "body_fat_percentage": 18.2
      },
      "completed_trainings": 24,
      "credit_balance": 5000
    }
  }
}
```

### Create Client

```
POST /clients
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+420123456789",
  "notes": "Notes about client",
  "health_restrictions": "Any health issues",
  "training_goals": ["Weight loss", "Strength"],
  "birth_date": "1990-05-15",
  "credit_balance": 0
}
```

**Response (201):**
```json
{
  "client": {
    "id": "uuid",
    "name": "John Doe",
    ...
  }
}
```

### Update Client

```
PATCH /clients/{id}
```

**Request Body:** (partial update)
```json
{
  "name": "John Smith",
  "credit_balance": 6000
}
```

### Delete Client (Soft Delete)

```
DELETE /clients/{id}
```

Archives the client instead of physical deletion.

---

## Workouts (Training Sessions)

### List Workouts

```
GET /workouts
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| client_id | uuid | Filter by client |
| date_from | ISO date | Start date filter |
| date_to | ISO date | End date filter |
| status | string | Filter by status (scheduled, completed, cancelled) |

**Example:**
```bash
curl "https://zukmwqfqmfuyqpxfjqil.supabase.co/functions/v1/api-v1/workouts?client_id=uuid&date_from=2024-01-01"
```

**Response:**
```json
{
  "workouts": [
    {
      "id": "uuid",
      "client_id": "uuid",
      "date": "2024-01-15T09:00:00.000Z",
      "duration": 60,
      "status": "completed",
      "notes": "Good session",
      "participant_count": 1,
      "subjective_rating": 8,
      "clients": {
        "id": "uuid",
        "name": "John Doe"
      }
    }
  ]
}
```

### Get Workout Detail

```
GET /workouts/{id}
```

Returns workout with client info and tags.

### Create Workout

```
POST /workouts
```

**Request Body:**
```json
{
  "client_id": "uuid",
  "date": "2024-01-15T09:00:00.000Z",
  "duration": 60,
  "status": "scheduled",
  "notes": "Focus on legs",
  "participant_count": 1
}
```

### Update Workout

```
PATCH /workouts/{id}
```

**Request Body:**
```json
{
  "status": "completed",
  "subjective_rating": 8,
  "notes": "Great workout!"
}
```

### Cancel Workout

```
DELETE /workouts/{id}
```

Sets status to "cancelled" with cancellation timestamp.

---

## Measurements

### List Measurements

```
GET /measurements
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| client_id | uuid | Filter by client (recommended) |
| date_from | date | Start date filter |
| date_to | date | End date filter |

**Response:**
```json
{
  "measurements": [
    {
      "id": "uuid",
      "client_id": "uuid",
      "date": "2024-01-15",
      "weight": 85.5,
      "body_fat_percentage": 18.2,
      "muscle_mass": 35.5,
      "basal_metabolism": 1850,
      "chest": 100,
      "waist": 85,
      "hips": 95,
      "mental_state": 8,
      "notes": ""
    }
  ],
  "chart_data": {
    "dates": ["2024-01-01", "2024-01-15"],
    "weight": [86.0, 85.5],
    "body_fat_percentage": [18.5, 18.2],
    "muscle_mass": [35.2, 35.5],
    "basal_metabolism": [1840, 1850]
  }
}
```

### Create Measurement

```
POST /measurements
```

**Request Body:**
```json
{
  "client_id": "uuid",
  "date": "2024-01-15",
  "weight": 85.5,
  "body_fat_percentage": 18.2,
  "muscle_mass": 35.5,
  "basal_metabolism": 1850,
  "chest": 100,
  "waist": 85,
  "hips": 95,
  "bicep_left": 35,
  "bicep_right": 35.5,
  "thigh_left": 55,
  "thigh_right": 55,
  "calf_left": 38,
  "calf_right": 38,
  "mental_state": 8,
  "notes": "Morning measurement"
}
```

### Update Measurement

```
PATCH /measurements/{id}
```

### Delete Measurement

```
DELETE /measurements/{id}
```

---

## Diagnostics

### List Diagnostics

```
GET /diagnostics
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| client_id | uuid | Filter by client |
| area_type | string | Filter by area type (joint, muscle_group) |

**Response:**
```json
{
  "diagnostics": [
    {
      "id": "uuid",
      "client_id": "uuid",
      "date": "2024-01-15",
      "area_type": "joint",
      "area_name": "Knee",
      "findings": "Limited mobility",
      "notes": "Recommend stretching",
      "clients": {
        "id": "uuid",
        "name": "John Doe"
      }
    }
  ]
}
```

### Get Diagnostic Detail

```
GET /diagnostics/{id}
```

Returns diagnostic with associated media files.

### Create Diagnostic

```
POST /diagnostics
```

**Request Body:**
```json
{
  "client_id": "uuid",
  "date": "2024-01-15",
  "area_type": "joint",
  "area_name": "Knee",
  "findings": "Limited mobility in flexion",
  "notes": "Follow-up in 2 weeks"
}
```

### Update Diagnostic

```
PATCH /diagnostics/{id}
```

### Delete Diagnostic

```
DELETE /diagnostics/{id}
```

---

## Credits

### Get Client Credits

```
GET /credits?client_id={uuid}
```

**Response:**
```json
{
  "client_id": "uuid",
  "client_name": "John Doe",
  "credit_balance": 5000,
  "transactions": [
    {
      "id": "uuid",
      "amount": -800,
      "type": "training_deduction",
      "description": "Training session (1)",
      "created_at": "2024-01-15T10:00:00.000Z"
    },
    {
      "id": "uuid",
      "amount": 5000,
      "type": "credit_purchase",
      "description": "Credit purchase",
      "created_at": "2024-01-10T09:00:00.000Z"
    }
  ]
}
```

### Consume Credits (After Training)

```
POST /credits/consume
```

**Request Body:**
```json
{
  "client_id": "uuid",
  "session_type": "1",
  "price": 800,
  "note": "Regular training session",
  "training_session_id": "uuid"
}
```

**Session Types & Default Prices:**
| Type | Price (CZK) |
|------|-------------|
| 1 | 800 |
| 2 | 1000 |
| 3+ | 1200 |
| first | 1000 |
| diagnostic | 500 |

**Response (201):**
```json
{
  "transaction": {...},
  "new_balance": 4200,
  "deducted": 800
}
```

### Add Credits

```
POST /credits/add
```

**Request Body:**
```json
{
  "client_id": "uuid",
  "amount": 5000,
  "note": "Package purchase - 6 sessions"
}
```

**Response (201):**
```json
{
  "transaction": {...},
  "new_balance": 9200,
  "added": 5000
}
```

### Get Credit Statement

```
GET /credits/statement?client_id={uuid}&from={date}&to={date}
```

For generating PDF statements in iOS app.

**Response:**
```json
{
  "client": {
    "id": "uuid",
    "name": "John Doe",
    "current_balance": 5000
  },
  "period": {
    "from": "2024-01-01",
    "to": "2024-01-31"
  },
  "summary": {
    "total_added": 10000,
    "total_deducted": 5000,
    "net_change": 5000
  },
  "transactions": [...]
}
```

---

## Calendar Events

### List Events

```
GET /calendar-events
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| date_from | ISO date | Start date |
| date_to | ISO date | End date |
| client_id | uuid | Filter by client |

**Response:**
```json
{
  "events": [
    {
      "id": "uuid",
      "title": "John Doe",
      "start": "2024-01-15T09:00:00.000Z",
      "end": "2024-01-15T10:00:00.000Z",
      "status": "scheduled",
      "client_id": "uuid",
      "client_name": "John Doe",
      "duration_minutes": 60,
      "participant_count": 1,
      "notes": ""
    }
  ]
}
```

### Create Event

```
POST /calendar-events
```

**Request Body:**
```json
{
  "client_id": "uuid",
  "date": "2024-01-15T09:00:00.000Z",
  "duration_minutes": 60,
  "status": "scheduled",
  "notes": "Leg day",
  "participant_count": 1
}
```

### Update Event

```
PATCH /calendar-events/{id}
```

### Cancel Event

```
DELETE /calendar-events/{id}
```

---

## iOS Integration Examples

### Swift URLSession Example

```swift
func fetchClients() async throws -> [Client] {
    let url = URL(string: "https://zukmwqfqmfuyqpxfjqil.supabase.co/functions/v1/api-v1/clients")!
    var request = URLRequest(url: url)
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue(apiKey, forHTTPHeaderField: "X-API-Key")
    
    let (data, _) = try await URLSession.shared.data(for: request)
    let response = try JSONDecoder().decode(ClientsResponse.self, from: data)
    return response.clients
}
```

### Creating a Training Session

```swift
func createWorkout(clientId: String, date: Date) async throws -> Workout {
    let url = URL(string: "https://zukmwqfqmfuyqpxfjqil.supabase.co/functions/v1/api-v1/workouts")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue(apiKey, forHTTPHeaderField: "X-API-Key")
    
    let body = CreateWorkoutRequest(
        client_id: clientId,
        date: ISO8601DateFormatter().string(from: date),
        duration: 60,
        status: "scheduled"
    )
    request.httpBody = try JSONEncoder().encode(body)
    
    let (data, _) = try await URLSession.shared.data(for: request)
    let response = try JSONDecoder().decode(WorkoutResponse.self, from: data)
    return response.workout
}
```

---

## Setting Up TRAINER_API_KEY

1. **Generate a secure key:**
   ```bash
   openssl rand -hex 32
   ```

2. **Add to Supabase secrets:**
   - Go to Lovable Settings → Integrations → Lovable Cloud
   - Add secret `TRAINER_API_KEY` with the generated value

3. **Store in iOS app:**
   - Use Keychain Services for secure storage
   - Never hardcode the key in source code

---

## Rate Limits

Currently no rate limiting is implemented. For production use, consider implementing rate limiting based on your usage patterns.

## Changelog

### v1.0.0 (2024-01-15)
- Initial release
- Clients CRUD with soft delete
- Workouts (Training Sessions) management
- Measurements with chart data formatting
- Diagnostics management
- Credits system with consume/add/statement
- Calendar events integration
