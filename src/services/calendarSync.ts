
import { LocalNotifications } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';
import { Activity } from '../types/scheduler';

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  description?: string;
}

export class CalendarSyncService {
  private static instance: CalendarSyncService;
  private isGoogleCalendarConnected = false;

  static getInstance(): CalendarSyncService {
    if (!CalendarSyncService.instance) {
      CalendarSyncService.instance = new CalendarSyncService();
    }
    return CalendarSyncService.instance;
  }

  async initializeNotifications() {
    try {
      const permission = await LocalNotifications.requestPermissions();
      console.log('Notification permission:', permission);
      return permission.display === 'granted';
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  async scheduleActivityNotification(activity: Activity, date: Date) {
    try {
      const startDateTime = new Date(date);
      const [hours, minutes] = activity.startTime.split(':');
      startDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Schedule notification 15 minutes before the activity
      const notificationTime = new Date(startDateTime.getTime() - 15 * 60 * 1000);

      await LocalNotifications.schedule({
        notifications: [
          {
            title: `Upcoming: ${activity.title}`,
            body: `Starting in 15 minutes. Points: ${activity.points}`,
            id: parseInt(activity.id),
            schedule: { at: notificationTime },
            sound: 'beep.wav',
            attachments: undefined,
            actionTypeId: '',
            extra: {
              activityId: activity.id,
              category: activity.category
            }
          }
        ]
      });

      console.log(`Notification scheduled for ${activity.title} at ${notificationTime}`);
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  }

  async cancelActivityNotification(activityId: string) {
    try {
      const notifications = await LocalNotifications.getPending();
      const notification = notifications.notifications.find(n => n.extra?.activityId === activityId);
      
      if (notification) {
        await LocalNotifications.cancel({
          notifications: [{ id: notification.id }]
        });
      }
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }

  async syncActivitiesToCalendar(activities: Activity[], date: Date) {
    // This would integrate with Google Calendar API
    // For now, we'll store sync status and schedule notifications
    try {
      await Preferences.set({
        key: 'calendar_sync_date',
        value: date.toISOString()
      });

      // Schedule notifications for all activities
      for (const activity of activities) {
        await this.scheduleActivityNotification(activity, date);
      }

      await Preferences.set({
        key: 'synced_activities',
        value: JSON.stringify(activities.map(a => a.id))
      });

      return true;
    } catch (error) {
      console.error('Error syncing to calendar:', error);
      return false;
    }
  }

  async getSyncStatus(): Promise<{ lastSyncDate: string | null; syncedActivities: string[] }> {
    try {
      const lastSync = await Preferences.get({ key: 'calendar_sync_date' });
      const syncedActivities = await Preferences.get({ key: 'synced_activities' });
      
      return {
        lastSyncDate: lastSync.value,
        syncedActivities: syncedActivities.value ? JSON.parse(syncedActivities.value) : []
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      return { lastSyncDate: null, syncedActivities: [] };
    }
  }

  // Placeholder for Google Calendar integration
  async connectToGoogleCalendar(): Promise<boolean> {
    // This would handle OAuth flow with Google Calendar
    // For now, return a mock success
    console.log('Google Calendar integration would be implemented here');
    this.isGoogleCalendarConnected = true;
    return true;
  }

  isConnectedToGoogleCalendar(): boolean {
    return this.isGoogleCalendarConnected;
  }
}
