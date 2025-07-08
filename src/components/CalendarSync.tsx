import React, { useState, useEffect } from 'react';
import { Calendar, Smartphone, Bell, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CalendarSyncService } from '../services/calendarSync';
import { Activity } from '../types/scheduler';

interface CalendarSyncProps {
  activities: Activity[];
}

const CalendarSync: React.FC<CalendarSyncProps> = ({ activities }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncDate, setLastSyncDate] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const { toast } = useToast();

  const calendarService = CalendarSyncService.getInstance();

  useEffect(() => {
    checkSyncStatus();
    initializeNotifications();
  }, []);

  const checkSyncStatus = async () => {
    const status = await calendarService.getSyncStatus();
    setLastSyncDate(status.lastSyncDate);
    setIsConnected(calendarService.isConnectedToGoogleCalendar());
  };

  const initializeNotifications = async () => {
    const granted = await calendarService.initializeNotifications();
    setNotificationsEnabled(granted);
  };

  const handleConnectCalendar = async () => {
    try {
      const connected = await calendarService.connectToGoogleCalendar();
      setIsConnected(connected);
      
      if (connected) {
        toast({
          title: "Calendar Connected",
          description: "Successfully connected to Google Calendar",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Google Calendar",
        variant: "destructive"
      });
    }
  };

  const handleSyncActivities = async () => {
    if (activities.length === 0) {
      toast({
        title: "No Activities",
        description: "Add some activities first before syncing",
        variant: "destructive"
      });
      return;
    }

    setIsSyncing(true);
    try {
      const success = await calendarService.syncActivitiesToCalendar(activities, new Date());
      
      if (success) {
        setLastSyncDate(new Date().toISOString());
        toast({
          title: "Sync Successful",
          description: `Synced ${activities.length} activities and set up notifications`,
        });
      } else {
        throw new Error('Sync failed');
      }
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Failed to sync activities to calendar",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleEnableNotifications = async () => {
    const granted = await calendarService.initializeNotifications();
    setNotificationsEnabled(granted);
    
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
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Calendar Sync</h3>
            <p className="text-sm text-slate-600">Sync activities and set notifications</p>
          </div>
        </div>

        {/* Connection Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-medium">Google Calendar</span>
            </div>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600">Connected</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-500">Not connected</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <span className="text-sm font-medium">Notifications</span>
            </div>
            <div className="flex items-center gap-2">
              {notificationsEnabled ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600">Enabled</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-500">Disabled</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {!isConnected && (
            <Button
              onClick={handleConnectCalendar}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Connect Google Calendar
            </Button>
          )}

          {!notificationsEnabled && (
            <Button
              onClick={handleEnableNotifications}
              variant="outline"
              className="w-full"
            >
              <Bell className="w-4 h-4 mr-2" />
              Enable Notifications
            </Button>
          )}

          <Button
            onClick={handleSyncActivities}
            disabled={isSyncing || activities.length === 0}
            variant="outline"
            className="w-full"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <Smartphone className="w-4 h-4 mr-2" />
                Sync Today's Activities
              </>
            )}
          </Button>
        </div>

        {/* Last Sync Info */}
        {lastSyncDate && (
          <div className="pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-500 text-center">
              Last synced: {new Date(lastSyncDate).toLocaleString()}
            </p>
          </div>
        )}

        {/* Info */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-start gap-2">
            <Bell className="w-4 h-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">Notification Settings</p>
              <p>Activities will trigger notifications 15 minutes before start time. Make sure notifications are enabled in your device settings.</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default CalendarSync;
