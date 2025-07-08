
import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Settings, Trophy, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ScheduleBuilder from './ScheduleBuilder';
import TodayView from './TodayView';
import PresetsLibrary from './PresetsLibrary';
import PointsDisplay from './PointsDisplay';
import { Activity, Preset, CompletedTask } from '../types/scheduler';

const RelaxedScheduler = () => {
  const [currentView, setCurrentView] = useState<'today' | 'builder' | 'presets'>('today');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedActivities = localStorage.getItem('relaxed-scheduler-activities');
    const savedPresets = localStorage.getItem('relaxed-scheduler-presets');
    const savedPoints = localStorage.getItem('relaxed-scheduler-points');
    const savedCompleted = localStorage.getItem('relaxed-scheduler-completed');

    if (savedActivities) setActivities(JSON.parse(savedActivities));
    if (savedPresets) setPresets(JSON.parse(savedPresets));
    if (savedPoints) setTotalPoints(parseInt(savedPoints));
    if (savedCompleted) setCompletedTasks(JSON.parse(savedCompleted));
  }, []);

  // Save to localStorage when data changes
  useEffect(() => {
    localStorage.setItem('relaxed-scheduler-activities', JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    localStorage.setItem('relaxed-scheduler-presets', JSON.stringify(presets));
  }, [presets]);

  useEffect(() => {
    localStorage.setItem('relaxed-scheduler-points', totalPoints.toString());
  }, [totalPoints]);

  useEffect(() => {
    localStorage.setItem('relaxed-scheduler-completed', JSON.stringify(completedTasks));
  }, [completedTasks]);

  const addActivity = (activity: Activity) => {
    setActivities([...activities, { ...activity, id: Date.now().toString() }]);
  };

  const updateActivity = (id: string, updatedActivity: Partial<Activity>) => {
    setActivities(activities.map(activity => 
      activity.id === id ? { ...activity, ...updatedActivity } : activity
    ));
  };

  const deleteActivity = (id: string) => {
    setActivities(activities.filter(activity => activity.id !== id));
  };

  const completeTask = (activityId: string, points: number) => {
    const today = new Date().toDateString();
    const existingTask = completedTasks.find(task => 
      task.activityId === activityId && task.date === today
    );

    if (!existingTask) {
      setCompletedTasks([...completedTasks, {
        id: Date.now().toString(),
        activityId,
        date: today,
        points
      }]);
      setTotalPoints(prev => prev + points);
    }
  };

  const uncompleteTask = (activityId: string, points: number) => {
    const today = new Date().toDateString();
    setCompletedTasks(completedTasks.filter(task => 
      !(task.activityId === activityId && task.date === today)
    ));
    setTotalPoints(prev => prev - points);
  };

  const savePreset = (name: string, mood?: string) => {
    const newPreset: Preset = {
      id: Date.now().toString(),
      name,
      activities: [...activities],
      mood,
      createdAt: new Date().toISOString()
    };
    setPresets([...presets, newPreset]);
  };

  const loadPreset = (preset: Preset) => {
    setActivities(preset.activities.map(activity => ({
      ...activity,
      id: Date.now().toString() + Math.random().toString()
    })));
    setCurrentView('builder');
  };

  const deletePreset = (id: string) => {
    setPresets(presets.filter(preset => preset.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-teal-500 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-slate-800">Relaxed Scheduler</h1>
            </div>
            
            <PointsDisplay totalPoints={totalPoints} />
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white/60 backdrop-blur-sm border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { key: 'today', label: 'Today', icon: Calendar },
              { key: 'builder', label: 'Schedule Builder', icon: Plus },
              { key: 'presets', label: 'Presets Library', icon: Settings }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setCurrentView(key as any)}
                className={`flex items-center gap-2 px-3 py-4 text-sm font-medium border-b-2 transition-colors ${
                  currentView === key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'today' && (
          <TodayView
            activities={activities}
            completedTasks={completedTasks}
            onCompleteTask={completeTask}
            onUncompleteTask={uncompleteTask}
          />
        )}
        
        {currentView === 'builder' && (
          <ScheduleBuilder
            activities={activities}
            onAddActivity={addActivity}
            onUpdateActivity={updateActivity}
            onDeleteActivity={deleteActivity}
            onSavePreset={savePreset}
          />
        )}
        
        {currentView === 'presets' && (
          <PresetsLibrary
            presets={presets}
            onLoadPreset={loadPreset}
            onDeletePreset={deletePreset}
          />
        )}
      </main>
    </div>
  );
};

export default RelaxedScheduler;
