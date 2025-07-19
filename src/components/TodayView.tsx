
import React from 'react';
import { Clock, Trophy, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, CompletedTask, Preset, categoryColors, categoryLightColors } from '../types/scheduler';
import CalendarSync from './CalendarSync';

interface TodayViewProps {
  activities: Activity[];
  completedTasks: CompletedTask[];
  loadedPresetId: string | null;
  presets: Preset[];
  onCompleteTask: (activityId: string, points: number) => void;
  onUncompleteTask: (activityId: string, points: number) => void;
}

const TodayView: React.FC<TodayViewProps> = ({
  activities,
  completedTasks,
  loadedPresetId,
  presets,
  onCompleteTask,
  onUncompleteTask
}) => {
  const today = new Date().toDateString();
  const todayCompleted = completedTasks.filter(task => task.date === today);
  
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const isCompleted = (activityId: string) => {
    return todayCompleted.some(task => task.activityId === activityId);
  };

  const sortedActivities = [...activities].sort((a, b) => a.startTime.localeCompare(b.startTime));

  const todayPoints = todayCompleted.reduce((sum, task) => sum + task.points, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Today's Schedule</h2>
          <p className="text-slate-600">{new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</p>
          {loadedPresetId && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-slate-500">Loaded preset:</span>
              <span className="text-sm font-medium text-blue-600">
                {presets.find(p => p.id === loadedPresetId)?.name || 'Unknown'}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-teal-500 text-white px-4 py-2 rounded-lg">
          <Trophy className="w-5 h-5" />
          <span className="font-semibold">{todayPoints} points today</span>
        </div>
      </div>

      {/* Calendar Sync Section */}
      <CalendarSync activities={activities} />

      {/* Activities */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Activities</h3>
        
        {activities.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 mb-2">No activities scheduled</p>
            <p className="text-sm text-slate-500">Go to Schedule Builder to add activities</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedActivities.map((activity) => {
              const completed = isCompleted(activity.id);
              
              return (
                <div
                  key={activity.id}
                  className={`flex items-center justify-between p-4 border rounded-lg transition-all ${
                    completed 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-12 rounded-full ${categoryColors[activity.category]}`} />
                    <div>
                      <h4 className={`font-medium ${completed ? 'text-green-800' : 'text-slate-800'}`}>
                        {activity.title}
                      </h4>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(activity.startTime)} - {formatTime(activity.endTime)}</span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${categoryLightColors[activity.category]}`}>
                          {activity.category}
                        </span>
                        <span className="font-medium">{activity.points} pts</span>
                      </div>
                      {activity.description && (
                        <p className="text-sm text-slate-500 mt-1">{activity.description}</p>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => completed 
                      ? onUncompleteTask(activity.id, activity.points)
                      : onCompleteTask(activity.id, activity.points)
                    }
                    size="sm"
                    variant={completed ? "outline" : "default"}
                    className={completed 
                      ? "border-green-300 text-green-700 hover:bg-green-50" 
                      : "bg-blue-500 hover:bg-blue-600 text-white"
                    }
                  >
                    {completed ? 'Completed ✓' : 'Mark Complete'}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default TodayView;
