# Relaxed Point Planner

A Flutter/React-based productivity app with Google Calendar integration and gamified scheduling.

## Features

### ✅ **Activity Scheduling**
- Create and manage daily activities with points
- Color-coded categories (Fitness, Work, Leisure, Recovery)
- Time-based scheduling with start/end times
- Track completed tasks and earn points

### ✅ **Google Calendar Sync**
- Connect your Google Calendar account
- Sync activities as calendar events
- Color-coded events by category
- Real-time synchronization

### ✅ **Smart Notifications**
- Local notifications 15 minutes before each activity
- Cross-platform notification support
- Notification permission management

### ✅ **Presets Library**
- Save and reuse common schedules
- Duplicate and edit existing presets
- Quick-load preset schedules

### ✅ **Persistent Data Storage**
- All data saved locally on device
- Cross-platform data persistence
- Automatic data migration

## Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- Android Studio (for Android builds)
- Google Cloud Console account

### 1. Install Dependencies
```bash
npm install
```

### 2. Google Calendar API Setup

1. **Create a Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one

2. **Enable Google Calendar API**
   - Navigate to APIs & Services > Library
   - Search for "Google Calendar API"
   - Click "Enable"

3. **Create OAuth 2.0 Credentials**
   - Go to APIs & Services > Credentials
   - Click "Create Credentials" > "OAuth Client ID"
   - Choose "Web application"
   - Add authorized JavaScript origins:
     - `http://localhost:5173` (for development)
     - Your production domain
   - Download the credentials JSON

4. **Configure Environment Variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your Google OAuth credentials:
   ```
   REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
   REACT_APP_GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```

### 3. Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Android development
npx cap sync android
npx cap open android
```

### 4. Android Build

1. **Sync Capacitor**
   ```bash
   npx cap sync android
   ```

2. **Open in Android Studio**
   ```bash
   npx cap open android
   ```

3. **Build and Run**
   - Connect your Android device
   - Enable USB debugging
   - Click Run in Android Studio

## Google Calendar Integration

### How it works:
1. **Authentication**: Uses Google OAuth 2.0 for secure authentication
2. **Event Creation**: Activities are created as calendar events with:
   - Title and description
   - Start and end times
   - Color coding by category
   - Points and category information in description
3. **Sync Status**: Tracks last sync date and synced activities
4. **Offline Support**: Local notifications work even without internet

### Event Categories:
- **Fitness** (Red): Workouts, sports, physical activities
- **Work** (Blue): Meetings, tasks, professional activities
- **Leisure** (Yellow): Entertainment, hobbies, social activities
- **Recovery** (Green): Rest, meditation, self-care

### Permissions Required:
- `https://www.googleapis.com/auth/calendar`
- `https://www.googleapis.com/auth/calendar.events`

## Architecture

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Radix UI** components
- **React Router** for navigation
- **React Query** for state management

### Mobile
- **Capacitor** for native mobile functionality
- **Local Notifications** API
- **Preferences** API for data persistence
- **Clipboard** API for enhanced UX

### Services
- **CalendarSyncService**: Handles Google Calendar integration
- **DataPersistenceService**: Manages local data storage
- **NotificationService**: Manages local notifications

## File Structure

```
src/
├── components/
│   ├── CalendarSync.tsx       # Google Calendar integration UI
│   ├── PresetsLibrary.tsx     # Preset management
│   ├── RelaxedScheduler.tsx   # Main app component
│   ├── ScheduleBuilder.tsx    # Activity creation/editing
│   ├── TodayView.tsx          # Daily schedule view
│   └── ui/                    # Reusable UI components
├── services/
│   ├── calendarSync.ts        # Google Calendar API integration
│   └── dataPersistence.ts     # Local data management
├── types/
│   └── scheduler.ts           # TypeScript interfaces
└── utils/
    └── (utility functions)
```

## Google Calendar API Integration

### Authentication Flow:
1. User clicks "Connect Google Calendar"
2. Google OAuth popup appears
3. User authorizes the app
4. Access token is stored securely
5. Connection status is updated

### Event Synchronization:
1. User clicks "Sync Activities"
2. Each activity is created as a calendar event
3. Events are color-coded by category
4. Local notifications are scheduled
5. Sync status is saved locally

### Token Management:
- Access tokens are stored securely using Capacitor Preferences
- Automatic token refresh when expired
- Secure credential storage and retrieval

## Troubleshooting

### Google Calendar Connection Issues:
1. **Invalid Client ID**: Check that `REACT_APP_GOOGLE_CLIENT_ID` is correct
2. **Unauthorized Domain**: Add your domain to authorized JavaScript origins
3. **Scope Issues**: Ensure calendar scopes are properly configured
4. **Token Expired**: The app automatically refreshes tokens

### Android Issues:
1. **Notifications Not Working**: Enable notification permissions in device settings
2. **Build Errors**: Run `npx cap sync android` after dependency changes
3. **USB Debugging**: Enable developer options on Android device

### Development Issues:
1. **Environment Variables**: Make sure `.env` file is in project root
2. **CORS Errors**: Add localhost to authorized origins in Google Cloud Console
3. **Module Errors**: Clear node_modules and reinstall: `rm -rf node_modules && npm install`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
