# Prenatal Health QA API Documentation

## Base URL
`http://localhost:3000/api` (development)

## Authentication
Most endpoints require JWT authentication. Include the access token in the Authorization header:
```
Authorization: Bearer <access_token>
```

## API Endpoints

### Authentication

#### POST `/auth/signup`
Register a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "Jane Doe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": "Jane Doe",
      "profileCompleted": false,
      // ... other user fields
    },
    "accessToken": "jwt_access_token",
    "refreshToken": "jwt_refresh_token"
  }
}
```

#### POST `/auth/login`
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** Same as signup

#### POST `/auth/refresh`
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "jwt_refresh_token"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "new_jwt_access_token"
  }
}
```

#### POST `/auth/logout`
Logout and revoke refresh tokens.

**Request Body:**
```json
{
  "refreshToken": "jwt_refresh_token" // optional, if not provided, all tokens are revoked
}
```

#### POST `/auth/reset-password`
Request password reset (generates reset token).

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

### User Management

#### GET `/user/profile`
Get current user's profile. Requires authentication.

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": "Jane Doe",
      "profileCompleted": true,
      "pregnancyWeek": 24,
      "dueDate": "2024-06-15",
      // ... other user fields
    }
  }
}
```

#### PUT `/user/profile`
Update user profile. Requires authentication.

**Request Body:**
```json
{
  "name": "Jane Smith",
  "pregnancyWeek": 25,
  "dueDate": "2024-06-15",
  "previousPregnancies": 1,
  "healthConditions": ["gestational_diabetes"],
  "concerns": ["back_pain", "fatigue"],
  "preferredLanguage": "en"
}
```

#### POST `/user/onboarding`
Complete user onboarding. Requires authentication.

**Request Body:**
```json
{
  "name": "Jane Doe",
  "age": 28,
  "pregnancyWeek": 20,
  "dueDate": "2024-06-15",
  "previousPregnancies": 0,
  "healthConditions": ["none"],
  "concerns": ["first_time_mother"],
  "preferredLanguage": "en"
}
```

#### GET `/user/onboarding`
Get user's onboarding data. Requires authentication.

### Chat & Messaging

#### POST `/chat/sessions`
Create a new chat session and send initial message. Requires authentication.

**Request Body:**
```json
{
  "message": "I'm experiencing morning sickness. What can I do?",
  "type": "text" // or "voice"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "chatSession": {
      "id": "session_id",
      "userId": "user_id",
      "platform": "web",
      "language": "en",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "chatMessage": {
      "id": "message_id",
      "userMessage": "I'm experiencing morning sickness. What can I do?",
      "aiResponse": "Here are some tips for managing morning sickness...",
      "suggestedQuestions": ["What foods help with nausea?", ...]
    },
    "response": "Here are some tips for managing morning sickness..."
  }
}
```

#### GET `/chat/sessions`
Get user's chat sessions. Requires authentication.

**Query Parameters:**
- `limit` (optional): Number of sessions to return (default: 10)
- `offset` (optional): Number of sessions to skip (default: 0)

#### POST `/chat/sessions/[sessionId]`
Send message to existing chat session. Requires authentication.

**Request Body:**
```json
{
  "message": "What about ginger tea?"
}
```

#### GET `/chat/sessions/[sessionId]`
Get chat session with all messages. Requires authentication.

### Health Tips

#### GET `/health-tips`
Get health tips, optionally filtered by pregnancy week and category.

**Query Parameters:**
- `pregnancyWeek` (optional): Filter by pregnancy week
- `category` (optional): Filter by category (nutrition, exercise, symptoms, etc.)
- `limit` (optional): Number of tips to return (default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "healthTips": [
      {
        "id": "tip_id",
        "title": "Prenatal Vitamins",
        "content": "Taking prenatal vitamins is important...",
        "category": "nutrition",
        "pregnancyWeekMin": 1,
        "pregnancyWeekMax": 40,
        "tags": ["vitamins", "nutrition"],
        "language": "en",
        "isActive": true,
        "priority": 5
      }
    ]
  }
}
```

#### POST `/health-tips` (Admin)
Create new health tip. Requires authentication.

### FAQs

#### GET `/faqs`
Get frequently asked questions.

**Query Parameters:**
- `category` (optional): Filter by category
- `pregnancyWeek` (optional): Filter by pregnancy week
- `search` (optional): Search in questions and answers
- `limit` (optional): Number of FAQs to return (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "faqs": [
      {
        "id": "faq_id",
        "question": "Is it safe to exercise during pregnancy?",
        "answer": "Yes, exercise is generally safe and beneficial...",
        "category": "exercise",
        "pregnancyWeekMin": 1,
        "pregnancyWeekMax": 40,
        "tags": ["exercise", "safety"],
        "language": "en",
        "popularity": 10
      }
    ]
  }
}
```

### Analytics

#### POST `/analytics`
Track user events (works for both authenticated and anonymous users).

**Request Body:**
```json
{
  "eventType": "question_asked",
  "eventData": {
    "question": "morning sickness",
    "pregnancyWeek": 8
  },
  "platform": "mobile",
  "language": "en"
}
```

#### GET `/analytics` (Admin)
Get analytics data. Requires authentication.

### Feedback

#### POST `/feedback`
Submit user feedback. Requires authentication.

**Request Body:**
```json
{
  "type": "bug", // or "feature_request", "general"
  "title": "App crashes on startup",
  "description": "The app crashes when I try to open it...",
  "rating": 3,
  "platform": "mobile",
  "appVersion": "1.0.0",
  "deviceInfo": {
    "os": "iOS",
    "version": "17.0"
  }
}
```

#### GET `/feedback`
Get user's feedback history. Requires authentication.

## Error Responses

All endpoints return errors in this format:
```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `400`: Bad Request (missing or invalid parameters)
- `401`: Unauthorized (invalid or missing authentication)
- `404`: Not Found (resource doesn't exist)
- `409`: Conflict (resource already exists)
- `500`: Internal Server Error

## Environment Variables Required

```env
DATABASE_URL="mongodb+srv://..."
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret-key"
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"
```
