import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Settings, Trophy, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ScheduleBuilder from './ScheduleBuilder';
import TodayView from './TodayView';
import PresetsLibrary from './PresetsLibrary';
import PointsDisplay from './PointsDisplay';
import { Activity, Preset, CompletedTask } from '../types/scheduler';
import { CalendarSyncService } from '../services/calendarSync';
import { DataPersistenceService } from '../services/dataPersistence';

const RelaxedScheduler = () => {
  console.log('🚀 RelaxedScheduler component is rendering...');
  
  const [currentView, setCurrentView] = useState<'today' | 'builder' | 'presets'>('today');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [dailyPoints, setDailyPoints] = useState(0);
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const [loadedPresetId, setLoadedPresetId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Debug initial state
  useEffect(() => {
    console.log('RelaxedScheduler component mounted. Initial loadedPresetId:', loadedPresetId);
  }, []);
  
  // Debug loadedPresetId changes
  useEffect(() => {
    console.log('🎯 STATE: loadedPresetId state changed to:', loadedPresetId);
    // Log stack trace to see what caused the change
    console.trace('🎯 STATE: Stack trace for loadedPresetId change');
  }, [loadedPresetId]);

  // Initialize mobile services and load data
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('Starting app initialization...');
      const dataService = DataPersistenceService.getInstance();
      await dataService.initialize();
      
      const calendarService = CalendarSyncService.getInstance();
      await calendarService.initialize();
      await calendarService.initializeNotifications();
      
      // Load all data with error handling
      console.log('Starting to load all data...');
      const [activities, presets, totalPoints, dailyPoints, completedTasks, loadedPresetId, lastActivityDate] = await Promise.all([
        dataService.loadActivities().catch(err => { console.warn('Failed to load activities:', err); return []; }),
        dataService.loadPresets().catch(err => { console.warn('Failed to load presets:', err); return []; }),
        dataService.loadTotalPoints().catch(err => { console.warn('Failed to load total points:', err); return 0; }),
        dataService.loadDailyPoints().catch(err => { console.warn('Failed to load daily points:', err); return 0; }),
        dataService.loadCompletedTasks().catch(err => { console.warn('Failed to load completed tasks:', err); return []; }),
        dataService.loadLoadedPresetId().catch(err => { console.warn('Failed to load preset ID:', err); return null; }),
        dataService.loadLastActivityDate().catch(err => { console.warn('Failed to load last date:', err); return null; })
      ]);
      console.log('Finished loading all data.');
      
      // Calculate daily points simply from today's completed tasks
      const today = new Date().toDateString();
      const todayCompletedTasks = completedTasks.filter(task => task.date === today);
      const calculatedDailyPoints = todayCompletedTasks.reduce((sum, task) => sum + task.points, 0);
      
      console.log('📊 POINTS: Daily points calculation:');
      console.log('📊 POINTS: - Today completed tasks:', todayCompletedTasks.length);
      console.log('📊 POINTS: - Calculated daily points:', calculatedDailyPoints);
      console.log('📊 POINTS: - Stored daily points:', dailyPoints);
      
      console.log('Loaded data:', {
        activities: activities.length,
        presets: presets.length,
        totalPoints,
        dailyPoints,
        completedTasks: completedTasks.length,
        loadedPresetId,
        todayTasksCount: todayCompletedTasks.length,
        calculatedDailyPoints
      });
      
      // Debug preset contents
      if (presets.length > 0) {
        console.log('Available presets:', presets.map(p => ({
          id: p.id,
          name: p.name,
          activitiesCount: p.activities.length,
          activities: p.activities.map(a => ({ id: a.id, title: a.title }))
        })));
      }

      setActivities(activities);
      setPresets(presets);
      setTotalPoints(totalPoints);
      setDailyPoints(calculatedDailyPoints); // Use calculated daily points
      setCompletedTasks(completedTasks);
      setLoadedPresetId(loadedPresetId);
      
      // Auto-load the last loaded preset if we have a saved preset ID
      if (loadedPresetId && presets.length > 0) {
        const loadedPreset = presets.find(p => p.id === loadedPresetId);
        if (loadedPreset) {
          console.log('✅ AUTO-LOAD: Auto-loading preset:', loadedPreset.name, 'with', loadedPreset.activities.length, 'activities');
          console.log('✅ AUTO-LOAD: Preset activities:', loadedPreset.activities.map(a => ({ id: a.id, title: a.title })));
          console.log('✅ AUTO-LOAD: Current completion states:', completedTasks.length, 'completed tasks');
          console.log('✅ AUTO-LOAD: Current points - total:', totalPoints, 'daily:', dailyPoints);
          
          // Check if any of the preset activities are already completed
          const today = new Date().toDateString();
          const todayCompleted = completedTasks.filter(task => task.date === today);
          const completedActivityIds = todayCompleted.map(task => task.activityId);
          const presetCompletedActivities = loadedPreset.activities.filter(a => completedActivityIds.includes(a.id));
          
          console.log('✅ AUTO-LOAD: Completed activities from preset:', presetCompletedActivities.length);
          console.log('✅ AUTO-LOAD: Completed activity IDs:', completedActivityIds);
          
          // Always load the preset activities, regardless of current activities
          setActivities(loadedPreset.activities);
        } else {
          console.warn('⚠️ AUTO-LOAD: Loaded preset ID not found in presets list:', loadedPresetId, 'Available presets:', presets.map(p => ({ id: p.id, name: p.name })));
          // Only clear if we're absolutely sure the preset doesn't exist
          // Wait a bit to see if presets are still loading
          setTimeout(async () => {
            const updatedPresets = await dataService.loadPresets();
            const stillNotFound = !updatedPresets.find(p => p.id === loadedPresetId);
            if (stillNotFound) {
              console.warn('⚠️ AUTO-LOAD: Preset still not found after retry, clearing invalid ID');
              setLoadedPresetId(null);
              await dataService.saveLoadedPresetId(null);
            } else {
              console.log('✅ AUTO-LOAD: Preset found on retry, keeping ID');
            }
          }, 1000);
        }
      } else {
        console.log('Auto-load conditions not met:', JSON.stringify({
          hasLoadedPresetId: !!loadedPresetId,
          loadedPresetId: loadedPresetId,
          hasPresets: presets.length > 0,
          presetsLength: presets.length,
          availablePresets: presets.map(p => ({ id: p.id, name: p.name }))
        }));
      }
      
      // Save the current date as last activity date and corrected daily points
      await dataService.saveLastActivityDate(today);
      if (calculatedDailyPoints !== dailyPoints) {
        console.log('📊 POINTS: Saving corrected daily points:', calculatedDailyPoints);
        await dataService.saveDailyPoints(calculatedDailyPoints);
      }
      
      console.log('App initialization completed successfully');
      setIsInitializing(false); // Mark initialization as complete
      } catch (error) {
        console.error('🚨 ERROR: App initialization failed:', error);
        console.error('🚨 ERROR: This error caused loadedPresetId to be cleared!');
        // Set default values to ensure app still works, but preserve loadedPresetId
        setActivities([]);
        setPresets([]);
        setTotalPoints(0);
        setDailyPoints(0);
        setCompletedTasks([]);
        // DO NOT clear loadedPresetId here - it destroys persistence!
        // setLoadedPresetId(null); // REMOVED - this was clearing saved presets!
      }
    };
    
    initializeApp();
  }, []);

  // Save data when it changes
  useEffect(() => {
    const saveData = async () => {
      const dataService = DataPersistenceService.getInstance();
      await dataService.saveActivities(activities);
    };
    
    if (activities.length > 0 || activities.length === 0) {
      saveData();
    }
  }, [activities]);

  useEffect(() => {
    const saveData = async () => {
      const dataService = DataPersistenceService.getInstance();
      await dataService.savePresets(presets);
    };
    
    if (presets.length > 0 || presets.length === 0) {
      saveData();
    }
  }, [presets]);

  useEffect(() => {
    const saveData = async () => {
      const dataService = DataPersistenceService.getInstance();
      await dataService.saveTotalPoints(totalPoints);
    };
    
    saveData();
  }, [totalPoints]);

  useEffect(() => {
    const saveData = async () => {
      const dataService = DataPersistenceService.getInstance();
      await dataService.saveCompletedTasks(completedTasks);
    };
    
    if (completedTasks.length > 0 || completedTasks.length === 0) {
      saveData();
    }
  }, [completedTasks]);

  useEffect(() => {
    const saveData = async () => {
      const dataService = DataPersistenceService.getInstance();
      await dataService.saveDailyPoints(dailyPoints);
    };
    
    saveData();
  }, [dailyPoints]);

  useEffect(() => {
    const saveData = async () => {
      console.log('💿 EFFECT: useEffect triggered to save loadedPresetId:', loadedPresetId);
      console.log('💿 EFFECT: isInitializing:', isInitializing);
      console.trace('💿 EFFECT: Stack trace for save trigger');
      
      // CRITICAL: Don't save during initialization - it can overwrite good values!
      if (isInitializing) {
        console.warn('⚠️ EFFECT: Skipping save during initialization to prevent overwriting good values');
        return;
      }
      
      // Only save after initialization is complete (user actions only)
      console.log('💿 EFFECT: Saving loadedPresetId after initialization:', loadedPresetId);
      const dataService = DataPersistenceService.getInstance();
      await dataService.saveLoadedPresetId(loadedPresetId);
    };
    
    saveData();
  }, [loadedPresetId, isInitializing]);

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

  const completeTask = async (activityId: string, points: number) => {
    const today = new Date().toDateString();
    const existingTask = completedTasks.find(task => 
      task.activityId === activityId && task.date === today
    );

    if (!existingTask) {
      console.log('✅ COMPLETE: Completing task:', activityId, 'for', points, 'points');
      
      const newTask: CompletedTask = {
        id: Date.now().toString(),
        activityId,
        date: today,
        points
      };

      // Update local state
      setCompletedTasks([...completedTasks, newTask]);
      setTotalPoints(prev => prev + points);
      setDailyPoints(prev => prev + points);
      
      // Persist individual task efficiently
      try {
        const dataService = DataPersistenceService.getInstance();
        await dataService.addCompletedTask(newTask);
        await dataService.saveTotalPoints(totalPoints + points);
        await dataService.saveDailyPoints(dailyPoints + points);
        await dataService.saveLastActivityDate(today);
        console.log('✅ COMPLETE: Successfully persisted task completion');
      } catch (error) {
        console.error('❌ COMPLETE: Failed to persist task completion:', error);
      }
    }
  };

  const uncompleteTask = async (activityId: string, points: number) => {
    const today = new Date().toDateString();
    console.log('❌ UNCOMPLETE: Uncompleting task:', activityId, 'removing', points, 'points');
    
    // Update local state
    setCompletedTasks(completedTasks.filter(task => 
      !(task.activityId === activityId && task.date === today)
    ));
    setTotalPoints(prev => prev - points);
    setDailyPoints(prev => prev - points);
    
    // Persist individual task removal efficiently
    try {
      const dataService = DataPersistenceService.getInstance();
      await dataService.removeCompletedTask(activityId, today);
      await dataService.saveTotalPoints(totalPoints - points);
      await dataService.saveDailyPoints(dailyPoints - points);
      await dataService.saveLastActivityDate(today);
      console.log('❌ UNCOMPLETE: Successfully persisted task removal');
    } catch (error) {
      console.error('❌ UNCOMPLETE: Failed to persist task removal:', error);
    }
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
    console.log('Loading preset:', preset.name, 'with ID:', preset.id);
    // Preserve original activity IDs to maintain completion state
    setActivities(preset.activities);
    setLoadedPresetId(preset.id);
    setCurrentView('builder');
  };

  const editPreset = (preset: Preset) => {
    // Preserve original activity IDs to maintain completion state
    setActivities(preset.activities);
    // Remove the existing preset since we'll be editing it
    setPresets(presets.filter(p => p.id !== preset.id));
    setLoadedPresetId(null); // Clear loaded preset when editing
    setCurrentView('builder');
  };

  const deletePreset = async (id: string) => {
    try {
      // Delete from persistence layer first
      const dataService = DataPersistenceService.getInstance();
      await dataService.deletePreset(id);
      
      // If currently loaded preset is being deleted, clear it
      if (loadedPresetId === id) {
        setLoadedPresetId(null);
        setActivities([]); // Clear activities when deleting the loaded preset
      }
      
      // Update local state
      setPresets(presets.filter(preset => preset.id !== id));
      
      console.log(`✅ Successfully deleted preset: ${id}`);
    } catch (error) {
      console.error('❌ Failed to delete preset:', error);
      // Still update local state even if persistence fails
      setPresets(presets.filter(preset => preset.id !== id));
      if (loadedPresetId === id) {
        setLoadedPresetId(null);
        setActivities([]);
      }
    }
  };

  const duplicatePreset = (preset: Preset) => {
    const duplicatedPreset: Preset = {
      ...preset,
      id: Date.now().toString(),
      name: `${preset.name} (Copy)`,
      createdAt: new Date().toISOString(),
      activities: preset.activities.map(activity => ({
        ...activity,
        id: Date.now().toString() + Math.random().toString() // Generate new IDs for duplicated activities
      }))
    };
    setPresets([...presets, duplicatedPreset]);
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
            
            <PointsDisplay totalPoints={totalPoints} dailyPoints={dailyPoints} />
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
            loadedPresetId={loadedPresetId}
            presets={presets}
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
            loadedPresetId={loadedPresetId}
            onLoadPreset={loadPreset}
            onEditPreset={editPreset}
            onDeletePreset={deletePreset}
            onDuplicatePreset={duplicatePreset}
          />
        )}
      </main>
    </div>
  );
};

export default RelaxedScheduler;
