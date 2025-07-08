
import React from 'react';
import { CheckCircle2, Circle, Clock, Trophy } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Activity, CompletedTask, categoryColors, categoryLightColors } from '../types/scheduler';

interface TodayViewProps {
  activities: Activity[];
  completedTasks: CompletedTask[];
  onCompleteTask: (activityId: string, points: number) => void;
  onUncompleteTask: (activityId: string, points: number) => void;
}

const TodayView: React.FC<TodayViewProps> = ({
  activities,
  completedTasks,
  onCompleteTask,
  onUncompleteTask
}) => {
  const today = new Date().toDateString();
  const todayCompleted = completedTasks.filter(task => task.date === today);
  const todayPoints = todayCompleted.reduce((sum, task) => sum + task.points, 0);
  
  const isCompleted = (activityId: string) => {
    return todayCompleted.some(task => task.activityId === activityId);
  };

  const sortedActivities = [...activities].sort((a, b) => {
    return a.startTime.localeCompare(b.startTime);
  });

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getCurrentTime = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  };

  const currentTime = getCurrentTime();

  return (
    <div className="space-y-6">
      {/* Today's Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-600">Today's Schedule</p>
              <p className="text-2xl font-bold text-blue-800">{activities.length} tasks</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-600">Completed</p>
              <p className="text-2xl font-bold text-green-800">{todayCompleted.length} / {activities.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
          <div className="flex items-center gap-3">
            <Trophy className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="text-sm font-medium text-yellow-600">Today's Points</p>
              <p className="text-2xl font-bold text-yellow-800">{todayPoints}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Today's Schedule */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Today's Schedule</h2>
        
        {activities.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 mb-2">No activities scheduled for today</p>
            <p className="text-sm text-slate-500">Go to Schedule Builder to create your daily routine</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedActivities.map((activity) => {
              const completed = isCompleted(activity.id);
              const isPast = activity.endTime < currentTime;
              const isCurrent = activity.startTime <= currentTime && currentTime <= activity.endTime;
              
              return (
                <div
                  key={activity.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-all duration-200 ${
                    completed 
                      ? 'bg-green-50 border-green-200' 
                      : isCurrent
                      ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200'
                      : isPast
                      ? 'bg-gray-50 border-gray-200 opacity-75'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <button
                    onClick={() => {
                      if (completed) {
                        onUncompleteTask(activity.id, activity.points);
                      } else {
                        onCompleteTask(activity.id, activity.points);
                      }
                    }}
                    className="flex-shrink-0 hover:scale-110 transition-transform"
                  >
                    {completed ? (
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    ) : (
                      <Circle className="w-6 h-6 text-slate-400 hover:text-slate-600" />
                    )}
                  </button>

                  <div className="flex-grow">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className={`font-medium ${completed ? 'line-through text-green-700' : 'text-slate-800'}`}>
                        {activity.title}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${categoryLightColors[activity.category]}`}>
                        {activity.category}
                      </span>
                      {isCurrent && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 animate-pulse">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <span>{formatTime(activity.startTime)} - {formatTime(activity.endTime)}</span>
                      <span className="flex items-center gap-1">
                        <Trophy className="w-3 h-3" />
                        {activity.points} pts
                      </span>
                      {activity.description && (
                        <span className="text-slate-500">{activity.description}</span>
                      )}
                    </div>
                  </div>
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
