import { useState, useEffect, useCallback } from 'react';
import { useToast } from './use-toast';
import { CalendarSyncService } from '../services/calendarSync';
import { Activity } from '../types/scheduler';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@southdevs/capacitor-google-auth';

interface CalendarSyncState {
  isConnected: boolean;
  isSyncing: boolean;
  isTestingConnection: boolean;
  lastSyncDate: string | null;
  notificationsEnabled: boolean;
  isGoogleApiLoaded: boolean;
  isLoadingApi: boolean;
  error: string | null;
  debugInfo: any;
}

interface CalendarSyncActions {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  syncActivities: (activities: Activity[]) => Promise<void>;
  testConnection: () => Promise<void>;
  enableNotifications: () => Promise<void>;
  clearError: () => void;
}

export function useCalendarSync(): CalendarSyncState & CalendarSyncActions {
  const [state, setState] = useState<CalendarSyncState>({
    isConnected: false,
    isSyncing: false,
    isTestingConnection: false,
    lastSyncDate: null,
    notificationsEnabled: false,
    isGoogleApiLoaded: false,
    isLoadingApi: true,
    error: null,
    debugInfo: null,
  });

  const { toast } = useToast();
  const calendarService = CalendarSyncService.getInstance();

  // Initialize the calendar sync service
  useEffect(() => {
    initializeService();
  }, []);

  // Load Google API for web platforms
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      setState(prev => ({ ...prev, isGoogleApiLoaded: true, isLoadingApi: false }));
      return;
    }

    loadGoogleAPI();
  }, []);

  const initializeService = async () => {
    try {
      // Initialize Google Auth plugin on native platforms
      if (Capacitor.isNativePlatform()) {
        await GoogleAuth.initialize();
      }
      
      await calendarService.initialize();
      
      // Check connection status
      const connected = calendarService.isConnectedToGoogleCalendar();
      
      // Get sync status and notifications
      const [syncStatus, notificationsGranted] = await Promise.all([
        calendarService.getSyncStatus(),
        calendarService.initializeNotifications()
      ]);

      setState(prev => ({
        ...prev,
        isConnected: connected,
        lastSyncDate: syncStatus.lastSyncDate,
        notificationsEnabled: notificationsGranted,
      }));

      // Test connection if already connected
      if (connected) {
        testConnection();
      }
    } catch (error) {
      console.error('Failed to initialize calendar sync:', error);
      setState(prev => ({ 
        ...prev, 
        error: `Initialization failed: ${error.message}` 
      }));
    }
  };

  const loadGoogleAPI = () => {
    // Check if already loaded
    if (typeof window !== 'undefined' && window.google?.accounts) {
      setState(prev => ({ ...prev, isGoogleApiLoaded: true, isLoadingApi: false }));
      return;
    }

    // Check if script already exists
    if (document.getElementById('google-gsi-script')) {
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      setTimeout(() => {
        const isLoaded = !!(window.google?.accounts);
        setState(prev => ({ 
          ...prev, 
          isGoogleApiLoaded: isLoaded, 
          isLoadingApi: false,
          error: isLoaded ? null : 'Google API failed to initialize'
        }));
      }, 100);
    };
    
    script.onerror = () => {
      setState(prev => ({ 
        ...prev, 
        isLoadingApi: false, 
        error: 'Failed to load Google API'
      }));
    };
    
    document.head.appendChild(script);
  };

  const connect = useCallback(async () => {
    setState(prev => ({ ...prev, error: null }));

    try {
      if (Capacitor.isNativePlatform()) {
        await connectNative();
      } else {
        await connectWeb();
      }
    } catch (error) {
      console.error('Connection failed:', error);
      setState(prev => ({ 
        ...prev, 
        error: `Connection failed: ${error.message}` 
      }));
    }
  }, []);

  const connectNative = async () => {
    try {
      console.log('🔍 DEBUG: Starting Google Auth - scopes and config come from capacitor.config.ts');
      
      // Per @southdevs/capacitor-google-auth: serverClientId comes from capacitor.config.ts
      // but scopes still need to be passed here for calendar access
      const result = await GoogleAuth.signIn({
        scopes: [
          'profile',
          'email',
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/calendar.events'
        ]
      });

      console.log('🔍 DEBUG: Auth result received:', {
        hasResult: !!result,
        resultKeys: result ? Object.keys(result) : 'No result',
        hasAuth: !!(result?.authentication),
        authKeys: result?.authentication ? Object.keys(result.authentication) : 'No auth'
      });

      if (!result.authentication) {
        throw new Error('No authentication data received from Google');
      }

      const credentials = {
        access_token: result.authentication.accessToken,
        refresh_token: result.authentication.refreshToken,
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'https://www.googleapis.com/auth/calendar'
      };

      await calendarService.setCredentials(credentials);
      await verifyConnection();
    } catch (error: any) {
      // Handle specific Android OAuth errors
      if (error.message?.includes('Something went wrong') || error.code === '10') {
        throw new Error('OAuth configuration error. Please check:\n• Android OAuth client is configured in Google Cloud Console\n• Package name: com.relaxedpointplanner.app\n• SHA-1 fingerprint matches your app keystore\n• Google Calendar API is enabled\n\nSee GOOGLE_AUTH_ANDROID_FIX.md for detailed instructions.');
      } else if (error.message?.includes('developer_error')) {
        throw new Error('Google OAuth client configuration error. Please verify your Android OAuth client setup in Google Cloud Console.');
      } else if (error.message?.includes('network_error')) {
        throw new Error('Network error during authentication. Please check your internet connection and try again.');
      } else if (error.message?.includes('cancelled')) {
        throw new Error('Google sign-in was cancelled. Please try again.');
      } else {
        throw new Error(`Google authentication failed: ${error.message || 'Unknown error'}`);
      }
    }
  };

  const connectWeb = async () => {
    if (!state.isGoogleApiLoaded) {
      throw new Error('Google API not loaded');
    }

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new Error('Google Client ID not configured');
    }

    return new Promise<void>((resolve, reject) => {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
        callback: async (response: any) => {
          try {
            if (!response.access_token) {
              throw new Error('No access token received');
            }

            const credentials = {
              access_token: response.access_token,
              expires_in: response.expires_in || 3600,
              token_type: 'Bearer',
              scope: response.scope || 'https://www.googleapis.com/auth/calendar'
            };

            await calendarService.setCredentials(credentials);
            await verifyConnection();
            resolve();
          } catch (error) {
            reject(error);
          }
        },
        error_callback: (error: any) => {
          reject(new Error(`OAuth error: ${error.type || 'Unknown error'}`));
        }
      });
      
      tokenClient.requestAccessToken();
    });
  };

  const verifyConnection = async () => {
    const testResult = await calendarService.testConnection();
    
    setState(prev => ({ 
      ...prev, 
      isConnected: testResult.isValid,
      debugInfo: testResult,
      error: testResult.isValid ? null : testResult.error
    }));

    if (testResult.isValid) {
      toast({
        title: "Calendar Connected",
        description: "Successfully connected to Google Calendar",
      });
    } else {
      throw new Error(testResult.error || "Connection verification failed");
    }
  };

  const disconnect = useCallback(async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        await GoogleAuth.signOut();
      }
      
      await calendarService.disconnect();
      
      setState(prev => ({
        ...prev,
        isConnected: false,
        lastSyncDate: null,
        debugInfo: null,
        error: null,
      }));

      toast({
        title: "Disconnected",
        description: "Successfully disconnected from Google Calendar",
      });
    } catch (error) {
      console.error('Disconnect failed:', error);
      setState(prev => ({ 
        ...prev, 
        error: `Disconnect failed: ${error.message}` 
      }));
    }
  }, [toast]);

  const syncActivities = useCallback(async (activities: Activity[]) => {
    if (activities.length === 0) {
      setState(prev => ({ 
        ...prev, 
        error: 'No activities to sync' 
      }));
      return;
    }

    if (!state.isConnected) {
      setState(prev => ({ 
        ...prev, 
        error: 'Please connect to Google Calendar first' 
      }));
      return;
    }

    setState(prev => ({ ...prev, isSyncing: true, error: null }));

    try {
      const success = await calendarService.syncActivitiesToCalendar(activities, new Date());
      
      if (success) {
        const syncStatus = await calendarService.getSyncStatus();
        setState(prev => ({ 
          ...prev, 
          lastSyncDate: syncStatus.lastSyncDate 
        }));

        toast({
          title: "Sync Successful",
          description: `Synced ${activities.length} activities to Google Calendar`,
        });
      } else {
        throw new Error('Sync operation failed');
      }
    } catch (error) {
      console.error('Sync failed:', error);
      setState(prev => ({ 
        ...prev, 
        error: `Sync failed: ${error.message}` 
      }));
    } finally {
      setState(prev => ({ ...prev, isSyncing: false }));
    }
  }, [state.isConnected, toast]);

  const testConnection = useCallback(async () => {
    setState(prev => ({ ...prev, isTestingConnection: true, error: null }));

    try {
      const result = await calendarService.testConnection();
      
      setState(prev => ({
        ...prev,
        isConnected: result.isValid,
        debugInfo: result,
        error: result.isValid ? null : result.error,
      }));
    } catch (error) {
      console.error('Connection test failed:', error);
      setState(prev => ({ 
        ...prev, 
        isConnected: false, 
        error: `Connection test failed: ${error.message}` 
      }));
    } finally {
      setState(prev => ({ ...prev, isTestingConnection: false }));
    }
  }, [toast]);

  const enableNotifications = useCallback(async () => {
    try {
      const granted = await calendarService.initializeNotifications();
      
      setState(prev => ({ 
        ...prev, 
        notificationsEnabled: granted,
        error: granted ? null : 'Notification permission denied'
      }));

      if (granted) {
        toast({
          title: "Notifications Enabled",
          description: "You'll receive reminders 15 minutes before each activity",
        });
      } else {
        toast({
          title: "Permission Denied",
          description: "Please enable notifications in your device settings",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error);
      setState(prev => ({ 
        ...prev, 
        error: `Failed to enable notifications: ${error.message}` 
      }));
    }
  }, [toast]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    // State
    ...state,
    
    // Actions
    connect,
    disconnect,
    syncActivities,
    testConnection,
    enableNotifications,
    clearError,
  };
} 