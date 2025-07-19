# Android App Setup Guide

## Getting Your Relaxed Point Planner App on Android

### Prerequisites
1. **Android Studio** - Download and install from [developer.android.com](https://developer.android.com/studio)
2. **Android Device** - Your phone with USB debugging enabled
3. **USB Cable** - To connect your phone to your computer
4. **Google Cloud Console Account** - For Google Calendar API access

### Step 1: Enable Developer Options on Your Android Phone
1. Go to **Settings** > **About phone**
2. Tap **Build number** 7 times to enable developer options
3. Go back to **Settings** > **System** > **Developer options**
4. Enable **USB debugging**

### Step 2: Google Calendar API Setup

1. **Create a Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one

2. **Enable Google Calendar API**
   - Navigate to **APIs & Services** > **Library**
   - Search for **Google Calendar API** and enable it

3. **Create OAuth 2.0 Credentials**
   - Go to **APIs & Services** > **Credentials**
   - Click **Create Credentials** > **OAuth Client ID**
   - Choose **Web application**
   - Add authorized JavaScript origins:
     - `http://localhost:5173` (for development)
     - `https://your-domain.com` (for production)
   - Download the credentials JSON file

4. **Configure Environment Variables**
   ```bash
   cp .env.example .env
   ```
   Edit the `.env` file and add your Google OAuth credentials:
   ```
   REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
   REACT_APP_GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```

### Step 3: Build and Run the App

#### Option A: Using Android Studio (Recommended)
1. Open Android Studio
2. Click **Open an existing project**
3. Navigate to your project folder and select the `android` folder
4. Wait for the project to sync and build
5. Connect your Android phone via USB
6. Click the green **Run** button (▶️) in Android Studio
7. Select your device and click **OK**

#### Option B: Using Command Line
1. Open a terminal in your project folder
2. Run: `npx cap sync android`
3. Run: `npx cap open android`
4. This will open Android Studio with your project
5. Follow steps 4-7 from Option A

### Step 4: Install the App
- The app will automatically install on your phone
- You may need to allow installation from unknown sources
- The app will appear as "Relaxed Point Planner" in your app drawer

### Features Now Available on Mobile

#### ✅ **Google Calendar Integration**
- **OAuth 2.0 Authentication**: Secure login with your Google account
- **Real-time Sync**: Activities are synced as calendar events
- **Color-coded Events**: Events are colored by category (Fitness=Red, Work=Blue, Leisure=Yellow, Recovery=Green)
- **Automatic Token Management**: Tokens are refreshed automatically
- **Offline Notifications**: Local notifications work even without internet

#### ✅ **Persistent Data Storage**
- All your activities, presets, and points are saved locally on your device
- Data persists between app restarts and device reboots
- Secure credential storage using Capacitor Preferences API

#### ✅ **Enhanced Mobile Experience**
- **Local Notifications**: Get reminded 15 minutes before each activity
- **Native Android Integration**: Uses Capacitor for native mobile functionality
- **Offline Support**: App works offline with local data storage
- **Cross-platform Compatibility**: Same codebase works on web and mobile

### Google Calendar Sync Process

1. **Connect**: Tap "Connect Google Calendar" to authorize the app
2. **Authenticate**: Sign in with your Google account
3. **Grant Permissions**: Allow calendar access
4. **Sync**: Tap "Sync Activities" to create calendar events
5. **Notifications**: Local notifications are scheduled automatically

### Permissions Required

#### Google Calendar API Scopes:
- `https://www.googleapis.com/auth/calendar`
- `https://www.googleapis.com/auth/calendar.events`

#### Android Permissions:
- **Local Notifications**: For activity reminders
- **Internet**: For Google Calendar API access
- **Storage**: For local data persistence

### Event Categories and Colors

- **Fitness** (Red): Workouts, sports, physical activities
- **Work** (Blue): Meetings, tasks, professional activities  
- **Leisure** (Yellow): Entertainment, hobbies, social activities
- **Recovery** (Green): Rest, meditation, self-care

### Troubleshooting

#### Google Calendar Connection Issues:
1. **Invalid Client ID**: 
   - Check that `REACT_APP_GOOGLE_CLIENT_ID` is correct in `.env`
   - Verify the client ID in Google Cloud Console

2. **Unauthorized Domain**: 
   - Add your domain to authorized JavaScript origins
   - Include `http://localhost:5173` for development

3. **Scope Issues**: 
   - Ensure calendar scopes are properly configured
   - Check that Google Calendar API is enabled

4. **Token Expired**: 
   - The app automatically refreshes tokens
   - If issues persist, disconnect and reconnect

#### App Installation Issues:
- Make sure USB debugging is enabled
- Allow installation from unknown sources
- Try a different USB cable
- Restart both device and computer

#### Notification Issues:
- Enable notification permissions in device settings
- Check that "Do Not Disturb" mode is off
- Verify notification settings in the app

#### Data Persistence Issues:
- Check that the app has storage permissions
- Restart the app if data doesn't persist
- Clear app data and re-sync if needed

### Development Tips

1. **Environment Variables**: 
   - Never commit your `.env` file to version control
   - Use `.env.example` as a template
   - Keep your Google credentials secure

2. **Testing**:
   - Test on different Android versions
   - Verify notifications work in background
   - Test offline functionality

3. **Building**:
   - Run `npx cap sync android` after dependency changes
   - Use `npx cap copy android` to copy web assets
   - Build in release mode for production

### Next Steps

1. **Test the app** thoroughly on your Android device
2. **Connect Google Calendar** and test sync functionality
3. **Create and sync activities** to verify everything works
4. **Test notifications** by creating activities with near-future times
5. **Try offline mode** to ensure local functionality works

### Security Notes

- **OAuth 2.0**: Secure authentication with Google
- **Token Storage**: Credentials stored securely using Capacitor Preferences
- **Automatic Refresh**: Tokens are refreshed automatically when expired
- **Local Storage**: All data is stored locally on device
- **No Server**: No external server required for basic functionality

This setup provides a production-ready Android app with full Google Calendar integration and offline capability. 