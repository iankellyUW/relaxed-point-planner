import { Preferences } from '@capacitor/preferences';
import { Activity, Preset, CompletedTask } from '../types/scheduler';
import { SQLiteStorageService } from './sqliteStorage';

export interface AppData {
  activities: Activity[];
  presets: Preset[];
  totalPoints: number;
  dailyPoints: number;
  completedTasks: CompletedTask[];
  lastSyncDate: string | null;
  syncedActivities: string[];
  loadedPresetId: string | null;
  lastActivityDate: string | null;
}

export class DataPersistenceService {
  private static instance: DataPersistenceService;
  private isInitialized = false;
  private sqliteService: SQLiteStorageService;

  constructor() {
    this.sqliteService = SQLiteStorageService.getInstance();
  }

  static getInstance(): DataPersistenceService {
    if (!DataPersistenceService.instance) {
      DataPersistenceService.instance = new DataPersistenceService();
    }
    return DataPersistenceService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Initialize SQLite for presets
      await this.sqliteService.initialize();
      
      // Migrate from localStorage if available
      await this.migrateFromLocalStorage();
      
      this.isInitialized = true;
      console.log('DataPersistenceService initialized with SQLite storage');
    } catch (error) {
      console.error('Failed to initialize SQLite, falling back to Preferences only:', error);
      // Still migrate from localStorage and mark as initialized
      await this.migrateFromLocalStorage();
      this.isInitialized = true;
    }
  }

  private async migrateFromLocalStorage(): Promise<void> {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
      const activities = localStorage.getItem('relaxed-scheduler-activities');
      const presets = localStorage.getItem('relaxed-scheduler-presets');
      const points = localStorage.getItem('relaxed-scheduler-points');
      const completed = localStorage.getItem('relaxed-scheduler-completed');

      if (activities) {
        await this.saveActivities(JSON.parse(activities));
        localStorage.removeItem('relaxed-scheduler-activities');
      }
      if (presets) {
        await this.savePresets(JSON.parse(presets));
        localStorage.removeItem('relaxed-scheduler-presets');
      }
      if (points) {
        await this.saveTotalPoints(parseInt(points));
        localStorage.removeItem('relaxed-scheduler-points');
      }
      if (completed) {
        await this.saveCompletedTasks(JSON.parse(completed));
        localStorage.removeItem('relaxed-scheduler-completed');
      }
    } catch (error) {
      console.error('Error migrating from localStorage:', error);
    }
  }

  // Activities
  async saveActivities(activities: Activity[]): Promise<void> {
    await Preferences.set({
      key: 'activities',
      value: JSON.stringify(activities)
    });
  }

  async loadActivities(): Promise<Activity[]> {
    try {
      const result = await Preferences.get({ key: 'activities' });
      return result.value ? JSON.parse(result.value) : [];
    } catch (error) {
      console.error('Error loading activities:', error);
      return [];
    }
  }

  // Presets (using SQLite with Preferences fallback)
  async savePresets(presets: Preset[]): Promise<void> {
    // Try SQLite first only if initialized successfully
    if (this.isInitialized) {
      try {
        // Save each preset individually to SQLite
        for (const preset of presets) {
          await this.sqliteService.savePreset(preset);
        }
        return; // Success, no need for fallback
      } catch (error) {
        console.error('Failed to save presets to SQLite, falling back to Preferences:', error);
      }
    }
    
    // Always save to Preferences as fallback
    try {
      await Preferences.set({
        key: 'presets',
        value: JSON.stringify(presets)
      });
    } catch (fallbackError) {
      console.error('Failed to save presets to Preferences fallback:', fallbackError);
      throw fallbackError;
    }
  }

  async loadPresets(): Promise<Preset[]> {
    // Try SQLite first only if initialized successfully
    if (this.isInitialized) {
      try {
        return await this.sqliteService.loadPresets();
      } catch (error) {
        console.error('Failed to load presets from SQLite, trying Preferences fallback:', error);
      }
    }
    
    // Always try Preferences fallback
    try {
      const result = await Preferences.get({ key: 'presets' });
      return result.value ? JSON.parse(result.value) : [];
    } catch (fallbackError) {
      console.error('Error loading presets from fallback:', fallbackError);
      return [];
    }
  }

  async savePreset(preset: Preset): Promise<void> {
    try {
      // Ensure SQLite is initialized
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      await this.sqliteService.savePreset(preset);
    } catch (error) {
      console.error('Failed to save preset to SQLite:', error);
      throw error;
    }
  }

  async deletePreset(presetId: string): Promise<void> {
    try {
      // Ensure SQLite is initialized
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      // Delete from SQLite
      await this.sqliteService.deletePreset(presetId);
      
      // Also clean up from Preferences fallback to keep them in sync
      try {
        const presetsFromPrefs = await Preferences.get({ key: 'presets' });
        if (presetsFromPrefs.value) {
          const presets: Preset[] = JSON.parse(presetsFromPrefs.value);
          const updatedPresets = presets.filter(p => p.id !== presetId);
          await Preferences.set({
            key: 'presets',
            value: JSON.stringify(updatedPresets)
          });
          console.log('✅ Also cleaned up preset from Preferences fallback');
        }
      } catch (prefsError) {
        console.warn('Could not clean up Preferences fallback (non-critical):', prefsError);
      }
      
    } catch (error) {
      console.error('Failed to delete preset from SQLite:', error);
      
      // Try deleting from Preferences as fallback
      try {
        const presetsFromPrefs = await Preferences.get({ key: 'presets' });
        if (presetsFromPrefs.value) {
          const presets: Preset[] = JSON.parse(presetsFromPrefs.value);
          const updatedPresets = presets.filter(p => p.id !== presetId);
          await Preferences.set({
            key: 'presets',
            value: JSON.stringify(updatedPresets)
          });
          console.log('✅ Deleted preset from Preferences fallback');
        }
      } catch (fallbackError) {
        console.error('Failed to delete preset from both SQLite and Preferences:', fallbackError);
        throw error; // Re-throw original error
      }
    }
  }

  async getPresetById(presetId: string): Promise<Preset | null> {
    try {
      // Ensure SQLite is initialized
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      return await this.sqliteService.getPresetById(presetId);
    } catch (error) {
      console.error('Failed to get preset by ID from SQLite:', error);
      return null;
    }
  }

  async searchPresets(searchTerm: string): Promise<Preset[]> {
    try {
      // Ensure SQLite is initialized
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      return await this.sqliteService.searchPresets(searchTerm);
    } catch (error) {
      console.error('Failed to search presets in SQLite:', error);
      return [];
    }
  }

  // Points (using SQLite with Preferences fallback)
  async saveTotalPoints(points: number): Promise<void> {
    // Try SQLite first only if initialized successfully
    if (this.isInitialized) {
      try {
        await this.sqliteService.updateTotalPoints(points);
        return; // Success, no need for fallback
      } catch (error) {
        console.error('Failed to save total points to SQLite, falling back to Preferences:', error);
      }
    }
    
    // Always save to Preferences as fallback
    await Preferences.set({
      key: 'totalPoints',
      value: points.toString()
    });
  }

  async loadTotalPoints(): Promise<number> {
    // Try SQLite first only if initialized successfully
    if (this.isInitialized) {
      try {
        const pointsData = await this.sqliteService.loadPoints();
        return pointsData.totalPoints;
      } catch (error) {
        console.error('Failed to load total points from SQLite, trying Preferences fallback:', error);
      }
    }
    
    // Always try Preferences fallback
    try {
      const result = await Preferences.get({ key: 'totalPoints' });
      return result.value ? parseInt(result.value) : 0;
    } catch (error) {
      console.error('Error loading total points:', error);
      return 0;
    }
  }

  // Daily Points
  async saveDailyPoints(points: number): Promise<void> {
    // Try SQLite first only if initialized successfully
    if (this.isInitialized) {
      try {
        await this.sqliteService.updateDailyPoints(points);
        return; // Success, no need for fallback
      } catch (error) {
        console.error('Failed to save daily points to SQLite, falling back to Preferences:', error);
      }
    }
    
    // Always save to Preferences as fallback
    await Preferences.set({
      key: 'dailyPoints',
      value: points.toString()
    });
  }

  async loadDailyPoints(): Promise<number> {
    // Try SQLite first only if initialized successfully
    if (this.isInitialized) {
      try {
        const pointsData = await this.sqliteService.loadPoints();
        return pointsData.dailyPoints;
      } catch (error) {
        console.error('Failed to load daily points from SQLite, trying Preferences fallback:', error);
      }
    }
    
    // Always try Preferences fallback
    try {
      const result = await Preferences.get({ key: 'dailyPoints' });
      return result.value ? parseInt(result.value) : 0;
    } catch (error) {
      console.error('Error loading daily points:', error);
      return 0;
    }
  }

  // Loaded Preset
  async saveLoadedPresetId(presetId: string | null): Promise<void> {
    console.log('💾 SAVE: Saving loaded preset ID:', presetId);
    try {
      await Preferences.set({
        key: 'loadedPresetId',
        value: presetId || ''
      });
      console.log('💾 SAVE SUCCESS: Loaded preset ID saved successfully:', presetId);
      
      // Immediate verification
      const verification = await Preferences.get({ key: 'loadedPresetId' });
      console.log('💾 SAVE VERIFY: Immediate read-back value:', verification.value);
    } catch (error) {
      console.error('💾 SAVE ERROR: Failed to save loaded preset ID:', error);
    }
  }

  async loadLoadedPresetId(): Promise<string | null> {
    try {
      console.log('📖 LOAD: Attempting to load preset ID from storage...');
      const result = await Preferences.get({ key: 'loadedPresetId' });
      console.log('📖 LOAD RAW: Raw storage result:', JSON.stringify(result));
      
      const loadedId = result.value && result.value !== '' ? result.value : null;
      console.log('📖 LOAD FINAL: Processed preset ID:', loadedId);
      return loadedId;
    } catch (error) {
      console.error('📖 LOAD ERROR: Error loading loaded preset ID:', error);
      return null;
    }
  }

  // Last Activity Date (using SQLite with Preferences fallback)
  async saveLastActivityDate(date: string): Promise<void> {
    // Try SQLite first only if initialized successfully
    if (this.isInitialized) {
      try {
        await this.sqliteService.updateLastActivityDate(date);
        return; // Success, no need for fallback
      } catch (error) {
        console.error('Failed to save last activity date to SQLite, falling back to Preferences:', error);
      }
    }
    
    // Always save to Preferences as fallback
    await Preferences.set({
      key: 'lastActivityDate',
      value: date
    });
  }

  async loadLastActivityDate(): Promise<string | null> {
    // Try SQLite first only if initialized successfully
    if (this.isInitialized) {
      try {
        const pointsData = await this.sqliteService.loadPoints();
        return pointsData.lastActivityDate;
      } catch (error) {
        console.error('Failed to load last activity date from SQLite, trying Preferences fallback:', error);
      }
    }
    
    // Always try Preferences fallback
    try {
      const result = await Preferences.get({ key: 'lastActivityDate' });
      return result.value || null;
    } catch (error) {
      console.error('Error loading last activity date:', error);
      return null;
    }
  }

  // Completed Tasks (using SQLite with Preferences fallback)
  async saveCompletedTasks(completedTasks: CompletedTask[]): Promise<void> {
    // Try SQLite first only if initialized successfully
    if (this.isInitialized) {
      try {
        await this.sqliteService.saveCompletedTasks(completedTasks);
        return; // Success, no need for fallback
      } catch (error) {
        console.error('Failed to save completed tasks to SQLite, falling back to Preferences:', error);
      }
    }
    
    // Always save to Preferences as fallback
    try {
      await Preferences.set({
        key: 'completedTasks',
        value: JSON.stringify(completedTasks)
      });
    } catch (fallbackError) {
      console.error('Failed to save completed tasks to Preferences fallback:', fallbackError);
      throw fallbackError;
    }
  }

  async loadCompletedTasks(): Promise<CompletedTask[]> {
    // Try SQLite first only if initialized successfully
    if (this.isInitialized) {
      try {
        return await this.sqliteService.loadCompletedTasks();
      } catch (error) {
        console.error('Failed to load completed tasks from SQLite, trying Preferences fallback:', error);
      }
    }
    
    // Always try Preferences fallback
    try {
      const result = await Preferences.get({ key: 'completedTasks' });
      return result.value ? JSON.parse(result.value) : [];
    } catch (fallbackError) {
      console.error('Error loading completed tasks from fallback:', fallbackError);
      return [];
    }
  }

  // Individual completed task operations for better efficiency
  async addCompletedTask(task: CompletedTask): Promise<void> {
    // Try SQLite first only if initialized successfully
    if (this.isInitialized) {
      try {
        await this.sqliteService.addCompletedTask(task);
        return; // Success, no need for fallback
      } catch (error) {
        console.error('Failed to add completed task to SQLite, falling back to full save:', error);
      }
    }
    
    // Fallback: load all tasks, add the new one, and save all
    const allTasks = await this.loadCompletedTasks();
    const updatedTasks = [...allTasks.filter(t => !(t.activityId === task.activityId && t.date === task.date)), task];
    await this.saveCompletedTasks(updatedTasks);
  }

  async removeCompletedTask(activityId: string, date: string): Promise<void> {
    // Try SQLite first only if initialized successfully
    if (this.isInitialized) {
      try {
        await this.sqliteService.removeCompletedTask(activityId, date);
        return; // Success, no need for fallback
      } catch (error) {
        console.error('Failed to remove completed task from SQLite, falling back to full save:', error);
      }
    }
    
    // Fallback: load all tasks, remove the target one, and save all
    const allTasks = await this.loadCompletedTasks();
    const updatedTasks = allTasks.filter(t => !(t.activityId === activityId && t.date === date));
    await this.saveCompletedTasks(updatedTasks);
  }

  // Calendar Sync Data
  async saveCalendarSyncData(lastSyncDate: string | null, syncedActivities: string[]): Promise<void> {
    await Preferences.set({
      key: 'calendarSyncData',
      value: JSON.stringify({ lastSyncDate, syncedActivities })
    });
  }

  async loadCalendarSyncData(): Promise<{ lastSyncDate: string | null; syncedActivities: string[] }> {
    try {
      const result = await Preferences.get({ key: 'calendarSyncData' });
      if (result.value) {
        const data = JSON.parse(result.value);
        return {
          lastSyncDate: data.lastSyncDate || null,
          syncedActivities: data.syncedActivities || []
        };
      }
      return { lastSyncDate: null, syncedActivities: [] };
    } catch (error) {
      console.error('Error loading calendar sync data:', error);
      return { lastSyncDate: null, syncedActivities: [] };
    }
  }

  // Export all data
  async exportAllData(): Promise<AppData> {
    const [activities, presets, totalPoints, completedTasks, calendarSyncData] = await Promise.all([
      this.loadActivities(),
      this.loadPresets(),
      this.loadTotalPoints(),
      this.loadCompletedTasks(),
      this.loadCalendarSyncData()
    ]);

    return {
      activities,
      presets,
      totalPoints,
      completedTasks,
      lastSyncDate: calendarSyncData.lastSyncDate,
      syncedActivities: calendarSyncData.syncedActivities
    };
  }

  // Import all data
  async importAllData(data: AppData): Promise<void> {
    await Promise.all([
      this.saveActivities(data.activities),
      this.savePresets(data.presets),
      this.saveTotalPoints(data.totalPoints),
      this.saveCompletedTasks(data.completedTasks),
      this.saveCalendarSyncData(data.lastSyncDate, data.syncedActivities)
    ]);
  }

  // Clear all data
  async clearAllData(): Promise<void> {
    const keys = ['activities', 'presets', 'totalPoints', 'completedTasks', 'calendarSyncData'];
    await Promise.all(keys.map(key => Preferences.remove({ key })));
  }
} 