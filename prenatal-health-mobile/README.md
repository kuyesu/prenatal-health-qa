# Prenatal Health Assistant Mobile App

A React Native Expo application providing prenatal health guidance and AI-powered Q&A for pregnant mothers in multiple languages.

## Features

### 🔐 Authentication
- **User Registration**: Create new accounts with email/password
- **User Login**: Secure login system
- **Profile Management**: Complete user profiles with pregnancy information

### 📝 Onboarding
- **Multi-step Setup**: Comprehensive onboarding process
- **Personal Information**: Name, age, pregnancy details
- **Health Assessment**: Previous pregnancies, health conditions, concerns
- **Language Selection**: Support for English, Swahili, Luganda, and Runyankore

### 💬 AI Chat System
- **Multilingual Support**: Ask questions in your preferred language
- **Prenatal Guidance**: Expert advice on pregnancy, nutrition, and health
- **Suggested Questions**: Context-aware follow-up questions
- **Chat History**: Persistent conversation storage
- **Real-time Responses**: Simulated AI responses for demonstration

### 🎨 Design System
- **Health-focused Colors**: Calming blue and green color palette
- **Responsive Layout**: Optimized for mobile devices
- **Accessibility**: Clear typography and touch targets
- **Modern UI**: Clean, intuitive interface design

## Tech Stack

- **React Native**: Mobile app framework
- **Expo**: Development platform and toolchain
- **TypeScript**: Type-safe JavaScript
- **AsyncStorage**: Local data persistence
- **React Context**: State management
- **Custom Components**: Reusable UI components

## Getting Started

### Prerequisites
- Node.js (v16 or later)
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

### Installation

1. **Clone the repository**
   ```bash
   git clone [repository-url]
   cd prenatal-health-qa/prenatal-health-mobile
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Run on device/simulator**
   - **iOS**: Press `i` in the terminal or scan QR code with Camera app
   - **Android**: Press `a` in the terminal or scan QR code with Expo Go app
   - **Web**: Press `w` in the terminal

## Project Structure

```
prenatal-health-mobile/
├── App.tsx                 # Main app component
├── app.json               # Expo configuration
├── package.json           # Dependencies and scripts
├── assets/                # Images and icons
├── components/            # Reusable UI components
│   ├── Button.tsx
│   └── Input.tsx
├── constants/             # App constants and translations
│   └── index.ts
├── contexts/              # React contexts
│   └── AuthContext.tsx
├── screens/               # App screens
│   ├── LoginScreen.tsx
│   ├── RegisterScreen.tsx
│   ├── OnboardingScreen.tsx
│   └── MainChatScreen.tsx
├── types/                 # TypeScript type definitions
│   └── index.ts
└── utils/                 # Utility functions
    └── storage.ts
```

## Key Components

### Authentication Flow
- **LoginScreen**: User login with email/password
- **RegisterScreen**: New user registration
- **AuthContext**: Authentication state management

### Onboarding Process
- **8-step questionnaire**: Comprehensive user profiling
- **Language selection**: Choose preferred language
- **Health assessment**: Medical history and concerns
- **Profile completion**: Required before accessing main features

### Main Chat Interface
- **Message display**: User questions and AI responses
- **Input system**: Text input with send functionality
- **Suggestions**: Dynamic question suggestions
- **History**: Persistent chat history storage

## Language Support

The app supports four languages with full translations:

- **English (en)**: Default language
- **Swahili (sw)**: Widely spoken in East Africa
- **Luganda (lg)**: Primary language in Uganda
- **Runyankore (ru)**: Regional language in Uganda

## Data Storage

- **AsyncStorage**: Local device storage for:
  - User authentication data
  - Chat message history
  - Onboarding responses
  - User preferences

## Development Notes

### Mock AI Responses
The current implementation uses mock AI responses for demonstration. In production, this would connect to a real AI service or API.

### Package Updates
Some packages may show version warnings. These are handled gracefully by Expo and don't affect functionality.

### Platform Compatibility
- **iOS**: Fully supported with iOS 13+
- **Android**: Fully supported with Android 6.0+
- **Web**: Basic support for testing

## Customization

### Adding New Languages
1. Add language code to `Language` type in `types/index.ts`
2. Add translations to `constants/index.ts`
3. Update language selector components

### Styling Changes
- Colors are defined in component StyleSheets
- Main theme colors: `#00bfff` (primary), `#7dd3fc` (secondary), `#e11d48` (accent)
- Background: `#f8fafc` (light gray)

### Adding New Features
1. Create new components in `components/`
2. Add new screens in `screens/`
3. Update navigation in `App.tsx`
4. Add type definitions in `types/`

## Building for Production

### iOS
```bash
expo build:ios
```

### Android
```bash
expo build:android
```

### Web
```bash
npm run web
```

## Contributing

1. Follow TypeScript best practices
2. Maintain consistent styling
3. Add proper type definitions
4. Test on multiple devices/simulators
5. Update documentation for new features

## Security Considerations

- User data is stored locally on device
- No sensitive data transmission in demo mode
- Production deployment would require secure API endpoints
- Implement proper authentication tokens for real backend

## Future Enhancements

- **Real AI Integration**: Connect to actual AI/ML services
- **Push Notifications**: Appointment reminders and health tips
- **Offline Support**: Enhanced offline functionality
- **Voice Input**: Speech-to-text for questions
- **Healthcare Provider Integration**: Connect with medical professionals
- **Health Tracking**: Pregnancy milestone tracking
- **Community Features**: Connect with other expectant mothers

## License

[Add appropriate license information]

## Support

For technical support or questions, please [contact information].
