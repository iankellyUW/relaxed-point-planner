import React, { useState } from 'react';
import { Calendar, Smartphone, Bell, CheckCircle, AlertCircle, RefreshCw, LogOut, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCalendarSync } from '../hooks/use-calendar-sync';
import { Activity } from '../types/scheduler';
import { Capacitor } from '@capacitor/core';

interface CalendarSyncProps {
  activities: Activity[];
}

const CalendarSync: React.FC<CalendarSyncProps> = ({ activities }) => {
  const [showDebug, setShowDebug] = useState(false);
  
  const {
    // State
    isConnected,
    isSyncing,
    isTestingConnection,
    lastSyncDate,
    notificationsEnabled,
    isLoadingApi,
    error,
    debugInfo,
    
    // Actions
    connect,
    disconnect,
    syncActivities,
    testConnection,
    enableNotifications,
    clearError,
  } = useCalendarSync();

  const handleSyncActivities = async () => {
    await syncActivities(activities);
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Google Calendar Sync</h3>
            <p className="text-sm text-slate-600">Sync your activities and get notified</p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                <div className="text-sm text-red-800">
                  <strong>Error:</strong> {error}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearError}
                className="h-auto p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Connection Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-medium">Google Calendar</span>
            </div>
            <div className="flex items-center gap-2">
              {isTestingConnection ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                  <span className="text-sm text-blue-600">Testing...</span>
                </>
              ) : isConnected ? (
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
          {!isConnected ? (
            <Button
              onClick={connect}
              disabled={!Capacitor.isNativePlatform() && isLoadingApi}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50"
            >
              {!Capacitor.isNativePlatform() && isLoadingApi ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Loading Google API...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Connect Google Calendar
                </>
              )}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                onClick={handleSyncActivities}
                disabled={isSyncing || activities.length === 0}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Smartphone className="w-4 h-4 mr-2" />
                    Sync Activities ({activities.length})
                  </>
                )}
              </Button>
              <Button
                onClick={disconnect}
                variant="outline"
                className="flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Disconnect
              </Button>
            </div>
          )}

          {isConnected && (
            <div className="flex gap-2">
              <Button
                onClick={testConnection}
                disabled={isTestingConnection}
                variant="outline"
                className="flex-1"
              >
                {isTestingConnection ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Test Connection
                  </>
                )}
              </Button>

          {!notificationsEnabled && (
            <Button
                  onClick={enableNotifications}
              variant="outline"
                  className="flex items-center gap-2"
            >
                  <Bell className="w-4 h-4" />
              Enable Notifications
            </Button>
              )}
            </div>
          )}
        </div>

        {/* Last Sync Info */}
        {lastSyncDate && (
          <div className="pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-500 text-center">
              Last synced: {new Date(lastSyncDate).toLocaleString()}
            </p>
          </div>
        )}

        {/* Configuration Warnings */}
        {!Capacitor.isNativePlatform() && !import.meta.env.VITE_GOOGLE_CLIENT_ID && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <div className="text-sm text-yellow-800">
                <strong>Configuration Required:</strong> Google Client ID not found. 
                Please add VITE_GOOGLE_CLIENT_ID to your .env file.
              </div>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">How Calendar Sync works:</h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Activities from your app sync to Google Calendar as events</li>
            <li>• Get notifications 15 minutes before each activity</li>
          </ul>
        </div>

        {/* Debug Information */}
        {debugInfo && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-900">Connection Details</h4>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDebug(!showDebug)}
            >
              {showDebug ? 'Hide' : 'Show'} Details
            </Button>
          </div>
          
          {showDebug && (
            <div className="space-y-2">
              <div className="text-xs text-gray-600">
                <strong>Platform:</strong> {Capacitor.isNativePlatform() ? 'Native' : 'Web'}
              </div>
              <div className="text-xs text-gray-600">
                  <strong>Protocol:</strong> {debugInfo.details?.protocol || 'CalDAV'}
                </div>
                <div className="text-xs text-gray-600">
                  <strong>Status:</strong> {debugInfo.isValid ? 'Connected' : 'Failed'}
              </div>
              
                {debugInfo.details?.ctag && (
                  <div className="text-xs text-gray-600">
                    <strong>Calendar Tag:</strong> {debugInfo.details.ctag}
                  </div>
                )}
                
                {debugInfo.error && (
                  <div className="text-xs text-red-600">
                    <strong>Error:</strong> {debugInfo.error}
                  </div>
                )}

                {Capacitor.isNativePlatform() && (
                  <div className="mt-3 p-2 bg-blue-50 rounded border-l-4 border-blue-400">
                    <div className="text-xs font-medium text-blue-800 mb-2">Android Configuration:</div>
                    <div className="text-xs text-blue-700 space-y-1">
                      <div>• Package: com.relaxedpointplanner.app</div>
                      <div>• OAuth Client: {import.meta.env.VITE_GOOGLE_ANDROID_CLIENT_ID?.substring(0, 20)}...</div>
                      <div>• SHA-1: Configured in keystore</div>
                    </div>
                  </div>
                      )}
                    </div>
                  )}
                </div>
              )}
      </div>
    </Card>
  );
};

export default CalendarSync;
