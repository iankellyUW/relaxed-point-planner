
import { LocalNotifications } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';
import { Activity } from '../types/scheduler';

export interface GoogleCalendarCredentials {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  source?: {
    title: string;
    url: string;
  };
}

export interface SyncStatus {
  lastSyncDate: string | null;
  syncedActivities: string[];
}

export class CalendarSyncService {
  private static instance: CalendarSyncService;
  private credentials: GoogleCalendarCredentials | null = null;
  private isConnected = false;

  static getInstance(): CalendarSyncService {
    if (!CalendarSyncService.instance) {
      CalendarSyncService.instance = new CalendarSyncService();
    }
    return CalendarSyncService.instance;
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    console.log('Initializing CalendarSync service...');
    
    try {
      // Load stored credentials
      const stored = await this.loadStoredCredentials();
      if (stored) {
        this.credentials = stored;
        this.isConnected = true;
        console.log('Loaded credentials from storage');
        
        // Check if token is still valid
        const isValid = await this.validateToken();
        if (!isValid) {
          console.log('Token expired, clearing credentials');
          await this.clearCredentials();
        }
      }
    } catch (error) {
      console.error('Error initializing calendar sync:', error);
      await this.clearCredentials();
    }
  }

  /**
   * Set credentials from OAuth flow
   */
  async setCredentials(credentials: GoogleCalendarCredentials): Promise<void> {
    console.log('Setting calendar credentials...');
    
    this.credentials = credentials;
    this.isConnected = true;
    
    try {
      await this.saveCredentials(credentials);
      console.log('Credentials saved successfully');
    } catch (error) {
      console.error('Error saving credentials:', error);
      throw new Error(`Failed to save credentials: ${error.message}`);
    }
  }

  /**
   * Test if the connection is working
   */
  async testConnection(): Promise<{isValid: boolean, error?: string, details?: any}> {
    console.log('Testing calendar connection...');

    if (!this.isConnected || !this.credentials) {
      return {
        isValid: false,
        error: 'Not connected to Google Calendar',
        details: { hasCredentials: !!this.credentials, isConnected: this.isConnected }
      };
    }

    try {
      // Try to fetch calendar list to test the connection
      const response = await this.makeApiRequest('GET', '/users/me/calendarList');
      
      if (response.ok) {
        const data = await response.json();
        return {
          isValid: true,
          details: {
            calendarsCount: data.items?.length || 0,
            primaryCalendar: data.items?.find((cal: any) => cal.primary)?.summary || 'Not found'
          }
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          isValid: false,
          error: `API error: ${response.status} - ${errorData.error?.message || response.statusText}`,
          details: { status: response.status, errorData }
        };
      }
    } catch (error: any) {
      console.error('Connection test failed:', error);
      return {
        isValid: false,
        error: `Connection test failed: ${error.message}`,
        details: { errorType: error.constructor.name }
      };
    }
  }

  /**
   * Sync activities to Google Calendar
   */
  async syncActivitiesToCalendar(activities: Activity[], date: Date): Promise<boolean> {
    if (!this.isConnected || !this.credentials) {
      throw new Error('Not connected to Google Calendar');
    }

    console.log(`Syncing ${activities.length} activities to calendar for ${date.toDateString()}`);

    try {
      let successCount = 0;
      const errors: string[] = [];

      for (const activity of activities) {
        try {
          const event = this.createCalendarEvent(activity, date);
          const success = await this.createEvent(event);
          
          if (success) {
            successCount++;
            // Schedule notification
            await this.scheduleNotification(activity, date);
          } else {
            errors.push(`Failed to create event for ${activity.title}`);
          }
        } catch (error: any) {
          console.error(`Error syncing activity ${activity.title}:`, error);
          errors.push(`${activity.title}: ${error.message}`);
        }
      }

      // Save sync status
      await this.saveSyncStatus({
        lastSyncDate: new Date().toISOString(),
        syncedActivities: activities.map(a => a.id)
      });

      console.log(`Sync completed: ${successCount}/${activities.length} successful`);
      
      if (errors.length > 0) {
        console.warn('Some activities failed to sync:', errors);
      }

      return successCount > 0;
    } catch (error: any) {
      console.error('Sync failed:', error);
      throw new Error(`Sync failed: ${error.message}`);
    }
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<SyncStatus> {
    try {
      const result = await Preferences.get({ key: 'calendar_sync_status' });
      if (result.value) {
        return JSON.parse(result.value);
      }
    } catch (error) {
      console.error('Error loading sync status:', error);
    }
    
    return { lastSyncDate: null, syncedActivities: [] };
  }

  /**
   * Initialize notifications
   */
  async initializeNotifications(): Promise<boolean> {
    try {
      const permission = await LocalNotifications.requestPermissions();
      return permission.display === 'granted';
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Check if connected to Google Calendar
   */
  isConnectedToGoogleCalendar(): boolean {
    return this.isConnected && !!this.credentials;
  }

  /**
   * Disconnect from Google Calendar
   */
  async disconnect(): Promise<void> {
    console.log('Disconnecting from Google Calendar...');
    await this.clearCredentials();
  }

  // Private helper methods

  private async makeApiRequest(method: string, endpoint: string, body?: any): Promise<Response> {
    if (!this.credentials) {
      throw new Error('No credentials available');
    }

    const url = `https://www.googleapis.com/calendar/v3${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.credentials.access_token}`,
      'Content-Type': 'application/json',
    };

    const config: RequestInit = {
      method,
      headers,
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    console.log(`🌐 Making ${method} request to: ${endpoint}`);
    console.log(`🔑 Using token: ${this.credentials.access_token.substring(0, 20)}...`);
    
    const response = await fetch(url, config);
    
    console.log(`📡 Response: ${response.status} ${response.statusText}`);
    
    // Handle token expiry
    if (response.status === 401) {
      console.log('🔄 Token expired, attempting refresh...');
      const refreshed = await this.refreshToken();
      if (refreshed) {
        console.log('✅ Token refreshed, retrying request...');
        // Retry the request with new token
        headers['Authorization'] = `Bearer ${this.credentials!.access_token}`;
        const retryResponse = await fetch(url, { ...config, headers });
        console.log(`🔄 Retry response: ${retryResponse.status} ${retryResponse.statusText}`);
        return retryResponse;
      } else {
        console.error('❌ Token refresh failed');
      }
    }

    return response;
  }

  private createCalendarEvent(activity: Activity, date: Date): CalendarEvent {
    try {
      const startDateTime = new Date(date);
      const [startHours, startMinutes] = activity.startTime.split(':');
      startDateTime.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);

      const endDateTime = new Date(date);
      const [endHours, endMinutes] = activity.endTime.split(':');
      endDateTime.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

      // Validate dates
      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        throw new Error(`Invalid date/time for activity ${activity.title}`);
      }

      if (endDateTime <= startDateTime) {
        console.warn(`End time is not after start time for ${activity.title}, adjusting...`);
        endDateTime.setTime(startDateTime.getTime() + 60 * 60 * 1000); // Add 1 hour
      }

      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.log(`📅 Creating event for ${activity.title}:`, {
        startTime: activity.startTime,
        endTime: activity.endTime,
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
        timeZone
      });

      return {
        id: `relaxed-planner-${activity.id}-${date.toISOString().split('T')[0]}`,
        summary: activity.title,
        description: `${activity.description || ''}\n\nPoints: ${activity.points}\nCategory: ${activity.category}\n\nCreated by Relaxed Point Planner`,
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: timeZone,
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: timeZone,
        },
        source: {
          title: 'Relaxed Point Planner',
          url: 'https://relaxed-point-planner.app'
        }
      };
    } catch (error: any) {
      console.error(`❌ Error creating calendar event for ${activity.title}:`, error);
      throw error;
    }
  }

  private async createEvent(event: CalendarEvent): Promise<boolean> {
    try {
      const eventData = {
        summary: event.summary,
        description: event.description,
        start: event.start,
        end: event.end,
        source: event.source,
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 15 }
          ]
        }
      };

      console.log(`Creating event: ${event.summary}`, JSON.stringify(eventData, null, 2));

      const response = await this.makeApiRequest('POST', '/calendars/primary/events', eventData);

      if (response.ok) {
        console.log(`✅ Created event: ${event.summary}`);
        return true;
      } else {
        // Get detailed error information
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { rawError: errorText };
        }

        console.error(`❌ Failed to create event ${event.summary}:`, {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          eventData: eventData
        });
        return false;
      }
    } catch (error: any) {
      console.error(`💥 Error creating event ${event.summary}:`, {
        message: error.message,
        stack: error.stack,
        error: error
      });
      return false;
    }
  }

  private async scheduleNotification(activity: Activity, date: Date): Promise<void> {
    try {
      const startDateTime = new Date(date);
      const [hours, minutes] = activity.startTime.split(':');
      startDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Schedule notification 15 minutes before
      const notificationTime = new Date(startDateTime.getTime() - 15 * 60 * 1000);

      // Only schedule if the notification time is in the future
      if (notificationTime > new Date()) {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: `Upcoming: ${activity.title}`,
            body: `Starting in 15 minutes. Points: ${activity.points}`,
              id: parseInt(activity.id) + Math.floor(Date.now() / 1000), // Unique ID
            schedule: { at: notificationTime },
            extra: {
              activityId: activity.id,
              category: activity.category
            }
          }
        ]
      });

        console.log(`Notification scheduled for ${activity.title} at ${notificationTime}`);
      }
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  }

  private async validateToken(): Promise<boolean> {
    if (!this.credentials) return false;

    try {
      const response = await this.makeApiRequest('GET', '/users/me/calendarList');
      return response.ok;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  }

  private async refreshToken(): Promise<boolean> {
    if (!this.credentials?.refresh_token) {
      console.error('No refresh token available');
      return false;
    }

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
          client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '',
          refresh_token: this.credentials.refresh_token,
          grant_type: 'refresh_token'
        })
      });

      if (response.ok) {
        const data = await response.json();
        this.credentials.access_token = data.access_token;
        await this.saveCredentials(this.credentials);
        console.log('Token refreshed successfully');
        return true;
      } else {
        const error = await response.json().catch(() => ({}));
        console.error('Token refresh failed:', error);
        await this.clearCredentials();
        return false;
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      return false;
    }
  }

  private async loadStoredCredentials(): Promise<GoogleCalendarCredentials | null> {
    try {
      const result = await Preferences.get({ key: 'google_calendar_credentials' });
      return result.value ? JSON.parse(result.value) : null;
    } catch (error) {
      console.error('Error loading stored credentials:', error);
      return null;
    }
  }

  private async saveCredentials(credentials: GoogleCalendarCredentials): Promise<void> {
    await Preferences.set({
      key: 'google_calendar_credentials',
      value: JSON.stringify(credentials)
    });
  }

  private async saveSyncStatus(status: SyncStatus): Promise<void> {
    await Preferences.set({
      key: 'calendar_sync_status',
      value: JSON.stringify(status)
    });
  }

  private async clearCredentials(): Promise<void> {
    try {
      await Promise.all([
        Preferences.remove({ key: 'google_calendar_credentials' }),
        Preferences.remove({ key: 'calendar_sync_status' })
      ]);
      
      this.credentials = null;
      this.isConnected = false;
      console.log('Credentials cleared');
    } catch (error) {
      console.error('Error clearing credentials:', error);
    }
  }
}
