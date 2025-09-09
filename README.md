# Prenatal Health QA API

A comprehensive NextJS API backend for the Prenatal Health mobile application, providing authentication, chat functionality, health tips, FAQs, and more.

## 🚀 Features

- **Authentication System**: JWT-based auth with refresh tokens
- **User Management**: Profile management and onboarding
- **Chat System**: AI-powered chat sessions with message history
- **Health Content**: Pregnancy tips and FAQs by week
- **Analytics**: Event tracking and user behavior analytics
- **Feedback System**: User feedback and bug reporting

## 📋 Prerequisites

- Node.js 18+ 
- MongoDB database
- npm or yarn

## 🛠️ Installation

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
Create a `.env` file in the root directory:
```env
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/database"
JWT_SECRET="your-super-secret-jwt-key"
JWT_REFRESH_SECRET="your-super-secret-refresh-key"
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"
```

3. **Set up the database:**
```bash
# Push schema to database
npx prisma db push

# Seed with initial data
npm run db:seed
```

4. **Start the development server:**
```bash
npm run dev
```

The API will be available at `http://localhost:3000/api`

## 📚 API Documentation

### Quick Test
Visit `http://localhost:3000/api/status` to verify the API is running and see available endpoints.

### Authentication Endpoints
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout and revoke tokens

### User Management
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `POST /api/user/onboarding` - Complete onboarding
- `GET /api/user/onboarding` - Get onboarding data

### Chat System
- `POST /api/chat/sessions` - Create new chat session
- `GET /api/chat/sessions` - Get user's chat sessions
- `POST /api/chat/sessions/[id]` - Send message to session
- `GET /api/chat/sessions/[id]` - Get session with messages

### Content APIs
- `GET /api/health-tips` - Get health tips (filterable by week/category)
- `GET /api/faqs` - Get FAQs (searchable and filterable)
- `POST /api/analytics` - Track events
- `POST /api/feedback` - Submit feedback

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for detailed documentation with request/response examples.

## 🗄️ Database Schema

The application uses Prisma ORM with MongoDB and includes these models:

- **User**: Authentication and profile data
- **OnboardingData**: User onboarding information
- **ChatSession**: Chat conversations
- **ChatMessage**: Individual messages in chats
- **HealthTip**: Pregnancy health tips
- **FAQ**: Frequently asked questions
- **Analytics**: Event tracking
- **Feedback**: User feedback and bug reports
- **RefreshToken**: JWT refresh token management

## 🔧 Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Database
npm run db:seed         # Seed database with initial data
npm run db:reset        # Reset database and reseed
npx prisma studio       # Open Prisma Studio (database GUI)
npx prisma db push      # Push schema changes to database
```

## 🔐 Authentication

The API uses JWT authentication with access and refresh tokens:

1. **Access Token**: Short-lived (1 hour), used for API requests
2. **Refresh Token**: Long-lived (7 days), used to get new access tokens

Include the access token in the Authorization header:
```
Authorization: Bearer <access_token>
```

## 📱 Mobile App Integration

This API is designed to work with the React Native mobile app. The mobile app's `apiService.ts` makes requests to these endpoints for:

- User authentication and profile management
- Real-time chat with AI assistant
- Pregnancy week-specific health tips
- FAQ search and browsing
- Usage analytics and feedback

## 🚦 API Response Format

All endpoints return JSON responses with this structure:

**Success Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error Response:**
```json
{
  "error": "Error message description"
}
```

## 🔍 Monitoring and Analytics

The API includes built-in analytics tracking for:
- User login/signup events
- Chat interactions
- Health tip views
- FAQ searches
- Error occurrences

Analytics data helps improve the user experience and app functionality.

## 🛡️ Security Features

- Password hashing with bcrypt
- JWT token validation
- Refresh token rotation
- Input validation and sanitization
- Rate limiting (can be added)
- CORS configuration

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test the API endpoints
4. Update documentation if needed
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
