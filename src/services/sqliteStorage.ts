import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';
import { Preset, Activity, CompletedTask } from '../types/scheduler';

interface DatabasePreset {
  id: string;
  name: string;
  mood: string | null;
  created_at: string;
}

interface DatabaseActivity {
  id: string;
  preset_id: string;
  title: string;
  start_time: string;
  end_time: string;
  category: string;
  points: number;
  description: string | null;
  color: string;
  sort_order: number;
}

interface DatabaseCompletedTask {
  id: string;
  activity_id: string;
  date: string;
  points: number;
  created_at: string;
}

interface DatabasePoints {
  id: string;
  total_points: number;
  daily_points: number;
  last_activity_date: string;
  updated_at: string;
}

export class SQLiteStorageService {
  private static instance: SQLiteStorageService;
  private sqlite: SQLiteConnection;
  private db: SQLiteDBConnection | null = null;
  private readonly dbName = 'relaxed_planner.db';
  private readonly dbVersion = 1;
  private isInitialized = false;
  private operationQueue: Promise<any> = Promise.resolve();

  private constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
  }

  // Queue operations to prevent concurrent database access
  private async queueOperation<T>(operation: () => Promise<T>): Promise<T> {
    const currentQueue = this.operationQueue;
    let resolve: (value: T) => void;
    let reject: (error: any) => void;
    
    const newOperation = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    
    this.operationQueue = currentQueue.then(async () => {
      try {
        const result = await operation();
        resolve(result);
        return result;
      } catch (error) {
        reject(error);
        throw error;
      }
    }).catch(() => {}); // Prevent unhandled rejection
    
    return newOperation;
  }

  static getInstance(): SQLiteStorageService {
    if (!SQLiteStorageService.instance) {
      SQLiteStorageService.instance = new SQLiteStorageService();
    }
    return SQLiteStorageService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Check if platform supports SQLite
      const platform = Capacitor.getPlatform();
      console.log('Initializing SQLite for platform:', platform);
      
      // Create or open database
      const ret = await this.sqlite.checkConnectionsConsistency();
      const isConn = (await this.sqlite.isConnection(this.dbName, false)).result;
      
      if (ret.result && isConn) {
        this.db = await this.sqlite.retrieveConnection(this.dbName, false);
      } else {
        this.db = await this.sqlite.createConnection(
          this.dbName,
          false,
          'no-encryption',
          this.dbVersion,
          false
        );
      }

      await this.db.open();
      await this.createTables();
      
      this.isInitialized = true;
      console.log('SQLite database initialized successfully');
      
      // Migrate existing data from Preferences if any
      await this.migrateFromPreferences();
      
    } catch (error) {
      console.error('Failed to initialize SQLite database:', error);
      // Don't throw error, just mark as not initialized so we can fallback
      this.isInitialized = false;
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // First, check if we need to recreate tables due to schema changes
    try {
      // Try to query the existing table structure
      const tableInfoQuery = 'PRAGMA table_info(preset_activities)';
      const tableInfo = await this.db.query(tableInfoQuery);
      
      if (tableInfo.values && tableInfo.values.length > 0) {
        console.log('Existing preset_activities table schema:', tableInfo.values);
        
        // Check if we have the expected number of columns (10)
        if (tableInfo.values.length !== 10) {
          console.log('Schema mismatch detected, dropping and recreating tables');
          await this.db.execute('DROP TABLE IF EXISTS preset_activities');
          await this.db.execute('DROP TABLE IF EXISTS presets');
        }
      }
    } catch (error) {
      console.log('Could not check table schema, proceeding with creation:', error);
    }

    const createPresetsTable = `
      CREATE TABLE IF NOT EXISTS presets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        mood TEXT,
        created_at TEXT NOT NULL
      );
    `;

    const createActivitiesTable = `
      CREATE TABLE IF NOT EXISTS preset_activities (
        id TEXT PRIMARY KEY,
        preset_id TEXT NOT NULL,
        title TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        category TEXT NOT NULL,
        points INTEGER NOT NULL,
        description TEXT,
        color TEXT NOT NULL,
        sort_order INTEGER NOT NULL,
        FOREIGN KEY (preset_id) REFERENCES presets (id) ON DELETE CASCADE
      );
    `;

    const createCompletedTasksTable = `
      CREATE TABLE IF NOT EXISTS completed_tasks (
        id TEXT PRIMARY KEY,
        activity_id TEXT NOT NULL,
        date TEXT NOT NULL,
        points INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(activity_id, date)
      );
    `;

    const createPointsTable = `
      CREATE TABLE IF NOT EXISTS points_tracking (
        id TEXT PRIMARY KEY,
        total_points INTEGER NOT NULL DEFAULT 0,
        daily_points INTEGER NOT NULL DEFAULT 0,
        last_activity_date TEXT,
        updated_at TEXT NOT NULL
      );
    `;

    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_preset_activities_preset_id ON preset_activities(preset_id);
      CREATE INDEX IF NOT EXISTS idx_preset_activities_sort_order ON preset_activities(sort_order);
      CREATE INDEX IF NOT EXISTS idx_completed_tasks_date ON completed_tasks(date);
      CREATE INDEX IF NOT EXISTS idx_completed_tasks_activity_id ON completed_tasks(activity_id);
    `;

    await this.db.execute(createPresetsTable);
    await this.db.execute(createActivitiesTable);
    await this.db.execute(createCompletedTasksTable);
    await this.db.execute(createPointsTable);
    await this.db.execute(createIndexes);
    
    // Initialize points table if empty
    const pointsCheckQuery = 'SELECT COUNT(*) as count FROM points_tracking';
    const pointsResult = await this.db.query(pointsCheckQuery);
    if (pointsResult.values && pointsResult.values[0].count === 0) {
      const initPointsQuery = `
        INSERT INTO points_tracking (id, total_points, daily_points, updated_at)
        VALUES ('main', 0, 0, datetime('now'))
      `;
      await this.db.run(initPointsQuery);
      console.log('Initialized points tracking table');
    }
    
    console.log('Tables created successfully');
  }

  private async migrateFromPreferences(): Promise<void> {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      const result = await Preferences.get({ key: 'presets' });
      
      if (result.value) {
        const existingPresets: Preset[] = JSON.parse(result.value);
        if (existingPresets.length > 0) {
          console.log(`Migrating ${existingPresets.length} presets from Preferences to SQLite`);
          
          // Check if presets already exist in SQLite to avoid duplicate migration
          const existingSqlitePresets = await this.loadPresets();
          if (existingSqlitePresets.length === 0) {
            for (const preset of existingPresets) {
              try {
                await this.savePreset(preset);
              } catch (saveError) {
                console.warn('Failed to migrate preset:', preset.name, saveError);
                // Continue with other presets even if one fails
              }
            }
            console.log('Migration completed successfully');
          } else {
            console.log('SQLite presets already exist, skipping migration');
          }
        }
      }
    } catch (error) {
      console.warn('Could not migrate data from Preferences (this is normal for new installations):', error);
    }
  }

  async savePreset(preset: Preset): Promise<void> {
    return this.queueOperation(async () => {
      if (!this.db) throw new Error('Database not initialized');

      try {
        // Use individual SQL commands without explicit transaction management
        // This avoids the transaction state issues with the SQLite plugin
        
        // Insert or update preset
        const insertPresetQuery = `
          INSERT OR REPLACE INTO presets (id, name, mood, created_at)
          VALUES (?, ?, ?, ?);
        `;
        
        await this.db.run(insertPresetQuery, [
          preset.id,
          preset.name,
          preset.mood || null,
          preset.createdAt
        ]);

        // Delete existing activities for this preset
        const deleteActivitiesQuery = 'DELETE FROM preset_activities WHERE preset_id = ?';
        await this.db.run(deleteActivitiesQuery, [preset.id]);

        // Insert activities one by one
        const insertActivityQuery = `
          INSERT INTO preset_activities (id, preset_id, title, start_time, end_time, category, points, description, color, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `;

        for (let i = 0; i < preset.activities.length; i++) {
          const activity = preset.activities[i];
          await this.db.run(insertActivityQuery, [
            activity.id,
            preset.id,
            activity.title,
            activity.startTime,
            activity.endTime,
            activity.category,
            activity.points,
            activity.description || null,
            activity.color,
            i
          ]);
        }

        console.log(`Saved preset: ${preset.name} with ${preset.activities.length} activities`);
        
      } catch (error) {
        console.error('Error saving preset:', error);
        throw error;
      }
    });
  }

  async loadPresets(): Promise<Preset[]> {
    return this.queueOperation(async () => {
      if (!this.db) throw new Error('Database not initialized');

      try {
        // Load all presets
        const presetsQuery = 'SELECT * FROM presets ORDER BY created_at DESC';
        const presetsResult = await this.db.query(presetsQuery);
        
        if (!presetsResult.values || presetsResult.values.length === 0) {
          return [];
        }

        const presets: Preset[] = [];

        for (const presetRow of presetsResult.values) {
          const dbPreset = presetRow as DatabasePreset;
          
          // Load activities for this preset
          const activitiesQuery = `
            SELECT * FROM preset_activities 
            WHERE preset_id = ? 
            ORDER BY sort_order ASC
          `;
          const activitiesResult = await this.db.query(activitiesQuery, [dbPreset.id]);
          
          const activities: Activity[] = [];
          if (activitiesResult.values) {
            console.log(`Loading ${activitiesResult.values.length} activities for preset ${dbPreset.id}`);
            for (let i = 0; i < activitiesResult.values.length; i++) {
              try {
                const activityRow = activitiesResult.values[i];
                console.log(`Activity row ${i}:`, Object.keys(activityRow), activityRow);
                
                const dbActivity = activityRow as DatabaseActivity;
                activities.push({
                  id: dbActivity.id,
                  title: dbActivity.title,
                  startTime: dbActivity.start_time,
                  endTime: dbActivity.end_time,
                  category: dbActivity.category as Activity['category'],
                  points: dbActivity.points,
                  description: dbActivity.description || undefined,
                  color: dbActivity.color
                });
                console.log(`Successfully loaded activity: ${dbActivity.title}`);
              } catch (activityError) {
                console.error(`Error processing activity row ${i}:`, activityError);
                // Skip corrupted activity but continue with others
              }
            }
          }

          presets.push({
            id: dbPreset.id,
            name: dbPreset.name,
            mood: dbPreset.mood || undefined,
            createdAt: dbPreset.created_at,
            activities
          });
        }

        console.log(`Loaded ${presets.length} presets from SQLite`);
        return presets;
        
      } catch (error) {
        console.error('Error loading presets:', error);
        return [];
      }
    });
  }

  async deletePreset(presetId: string): Promise<void> {
    return this.queueOperation(async () => {
      if (!this.db) throw new Error('Database not initialized');

      try {
        // Use individual SQL commands without explicit transaction management
        
        // Delete activities first (foreign key constraint)
        const deleteActivitiesQuery = 'DELETE FROM preset_activities WHERE preset_id = ?';
        await this.db.run(deleteActivitiesQuery, [presetId]);

        // Delete preset
        const deletePresetQuery = 'DELETE FROM presets WHERE id = ?';
        await this.db.run(deletePresetQuery, [presetId]);

        console.log(`Deleted preset: ${presetId}`);
        
      } catch (error) {
        console.error('Error deleting preset:', error);
        throw error;
      }
    });
  }

  async getPresetById(presetId: string): Promise<Preset | null> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Load preset
      const presetQuery = 'SELECT * FROM presets WHERE id = ?';
      const presetResult = await this.db.query(presetQuery, [presetId]);
      
      if (!presetResult.values || presetResult.values.length === 0) {
        return null;
      }

      const dbPreset = presetResult.values[0] as DatabasePreset;
      
      // Load activities for this preset
      const activitiesQuery = `
        SELECT * FROM preset_activities 
        WHERE preset_id = ? 
        ORDER BY sort_order ASC
      `;
      const activitiesResult = await this.db.query(activitiesQuery, [presetId]);
      
      const activities: Activity[] = [];
      if (activitiesResult.values) {
        for (const activityRow of activitiesResult.values) {
          const dbActivity = activityRow as DatabaseActivity;
          activities.push({
            id: dbActivity.id,
            title: dbActivity.title,
            startTime: dbActivity.start_time,
            endTime: dbActivity.end_time,
            category: dbActivity.category as Activity['category'],
            points: dbActivity.points,
            description: dbActivity.description || undefined,
            color: dbActivity.color
          });
        }
      }

      return {
        id: dbPreset.id,
        name: dbPreset.name,
        mood: dbPreset.mood || undefined,
        createdAt: dbPreset.created_at,
        activities
      };
      
    } catch (error) {
      console.error('Error loading preset by ID:', error);
      return null;
    }
  }

  async searchPresets(searchTerm: string): Promise<Preset[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const searchQuery = `
        SELECT DISTINCT p.* FROM presets p
        LEFT JOIN preset_activities pa ON p.id = pa.preset_id
        WHERE p.name LIKE ? OR p.mood LIKE ? OR pa.title LIKE ?
        ORDER BY p.created_at DESC
      `;
      
      const searchPattern = `%${searchTerm}%`;
      const result = await this.db.query(searchQuery, [searchPattern, searchPattern, searchPattern]);
      
      if (!result.values || result.values.length === 0) {
        return [];
      }

      const presets: Preset[] = [];
      for (const presetRow of result.values) {
        const preset = await this.getPresetById(presetRow.id);
        if (preset) {
          presets.push(preset);
        }
      }

      return presets;
      
    } catch (error) {
      console.error('Error searching presets:', error);
      return [];
    }
  }

  async getPresetStats(): Promise<{ totalPresets: number; totalActivities: number }> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const presetsCountQuery = 'SELECT COUNT(*) as count FROM presets';
      const activitiesCountQuery = 'SELECT COUNT(*) as count FROM preset_activities';
      
      const [presetsResult, activitiesResult] = await Promise.all([
        this.db.query(presetsCountQuery),
        this.db.query(activitiesCountQuery)
      ]);

      return {
        totalPresets: presetsResult.values?.[0]?.count || 0,
        totalActivities: activitiesResult.values?.[0]?.count || 0
      };
      
    } catch (error) {
      console.error('Error getting preset stats:', error);
      return { totalPresets: 0, totalActivities: 0 };
    }
  }

  // Completed Tasks Methods
  async saveCompletedTasks(completedTasks: CompletedTask[]): Promise<void> {
    return this.queueOperation(async () => {
      if (!this.db) throw new Error('Database not initialized');

      try {
        // Clear existing completed tasks first
        await this.db.run('DELETE FROM completed_tasks');

        // Insert all completed tasks
        const insertTaskQuery = `
          INSERT INTO completed_tasks (id, activity_id, date, points, created_at)
          VALUES (?, ?, ?, ?, ?)
        `;

        for (const task of completedTasks) {
          await this.db.run(insertTaskQuery, [
            task.id,
            task.activityId,
            task.date,
            task.points,
            new Date().toISOString()
          ]);
        }

        console.log(`Saved ${completedTasks.length} completed tasks to SQLite`);
        
      } catch (error) {
        console.error('Error saving completed tasks:', error);
        throw error;
      }
    });
  }

  async loadCompletedTasks(): Promise<CompletedTask[]> {
    return this.queueOperation(async () => {
      if (!this.db) throw new Error('Database not initialized');

      try {
        const query = 'SELECT * FROM completed_tasks ORDER BY created_at DESC';
        const result = await this.db.query(query);
        
        if (!result.values || result.values.length === 0) {
          return [];
        }

        const completedTasks: CompletedTask[] = [];
        for (const row of result.values) {
          const dbTask = row as DatabaseCompletedTask;
          completedTasks.push({
            id: dbTask.id,
            activityId: dbTask.activity_id,
            date: dbTask.date,
            points: dbTask.points
          });
        }

        console.log(`Loaded ${completedTasks.length} completed tasks from SQLite`);
        return completedTasks;
        
      } catch (error) {
        console.error('Error loading completed tasks:', error);
        return [];
      }
    });
  }

  async addCompletedTask(task: CompletedTask): Promise<void> {
    return this.queueOperation(async () => {
      if (!this.db) throw new Error('Database not initialized');

      try {
        const insertTaskQuery = `
          INSERT OR REPLACE INTO completed_tasks (id, activity_id, date, points, created_at)
          VALUES (?, ?, ?, ?, ?)
        `;

        await this.db.run(insertTaskQuery, [
          task.id,
          task.activityId,
          task.date,
          task.points,
          new Date().toISOString()
        ]);

        console.log(`Added completed task: ${task.activityId} for ${task.points} points`);
        
      } catch (error) {
        console.error('Error adding completed task:', error);
        throw error;
      }
    });
  }

  async removeCompletedTask(activityId: string, date: string): Promise<void> {
    return this.queueOperation(async () => {
      if (!this.db) throw new Error('Database not initialized');

      try {
        const deleteTaskQuery = 'DELETE FROM completed_tasks WHERE activity_id = ? AND date = ?';
        await this.db.run(deleteTaskQuery, [activityId, date]);

        console.log(`Removed completed task: ${activityId} for date ${date}`);
        
      } catch (error) {
        console.error('Error removing completed task:', error);
        throw error;
      }
    });
  }

  // Points Tracking Methods
  async savePoints(totalPoints: number, dailyPoints: number, lastActivityDate?: string): Promise<void> {
    return this.queueOperation(async () => {
      if (!this.db) throw new Error('Database not initialized');

      try {
        const updatePointsQuery = `
          UPDATE points_tracking 
          SET total_points = ?, daily_points = ?, last_activity_date = ?, updated_at = datetime('now')
          WHERE id = 'main'
        `;

        await this.db.run(updatePointsQuery, [
          totalPoints,
          dailyPoints,
          lastActivityDate || null
        ]);

        console.log(`Updated points: total=${totalPoints}, daily=${dailyPoints}, lastDate=${lastActivityDate}`);
        
      } catch (error) {
        console.error('Error saving points:', error);
        throw error;
      }
    });
  }

  async loadPoints(): Promise<{ totalPoints: number; dailyPoints: number; lastActivityDate: string | null }> {
    return this.queueOperation(async () => {
      if (!this.db) throw new Error('Database not initialized');

      try {
        const query = 'SELECT * FROM points_tracking WHERE id = \'main\'';
        const result = await this.db.query(query);
        
        if (!result.values || result.values.length === 0) {
          return { totalPoints: 0, dailyPoints: 0, lastActivityDate: null };
        }

        const dbPoints = result.values[0] as DatabasePoints;
        return {
          totalPoints: dbPoints.total_points,
          dailyPoints: dbPoints.daily_points,
          lastActivityDate: dbPoints.last_activity_date || null
        };
        
      } catch (error) {
        console.error('Error loading points:', error);
        return { totalPoints: 0, dailyPoints: 0, lastActivityDate: null };
      }
    });
  }

  async updateTotalPoints(totalPoints: number): Promise<void> {
    return this.queueOperation(async () => {
      if (!this.db) throw new Error('Database not initialized');

      try {
        const updateQuery = `
          UPDATE points_tracking 
          SET total_points = ?, updated_at = datetime('now')
          WHERE id = 'main'
        `;

        await this.db.run(updateQuery, [totalPoints]);
        console.log(`Updated total points: ${totalPoints}`);
        
      } catch (error) {
        console.error('Error updating total points:', error);
        throw error;
      }
    });
  }

  async updateDailyPoints(dailyPoints: number): Promise<void> {
    return this.queueOperation(async () => {
      if (!this.db) throw new Error('Database not initialized');

      try {
        const updateQuery = `
          UPDATE points_tracking 
          SET daily_points = ?, updated_at = datetime('now')
          WHERE id = 'main'
        `;

        await this.db.run(updateQuery, [dailyPoints]);
        console.log(`Updated daily points: ${dailyPoints}`);
        
      } catch (error) {
        console.error('Error updating daily points:', error);
        throw error;
      }
    });
  }

  async updateLastActivityDate(date: string): Promise<void> {
    return this.queueOperation(async () => {
      if (!this.db) throw new Error('Database not initialized');

      try {
        const updateQuery = `
          UPDATE points_tracking 
          SET last_activity_date = ?, updated_at = datetime('now')
          WHERE id = 'main'
        `;

        await this.db.run(updateQuery, [date]);
        console.log(`Updated last activity date: ${date}`);
        
      } catch (error) {
        console.error('Error updating last activity date:', error);
        throw error;
      }
    });
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
    this.isInitialized = false;
  }

  private async resetConnection(): Promise<void> {
    if (this.db) {
      try {
        await this.db.close();
      } catch (error) {
        console.warn('Error closing database connection:', error);
      }
      this.db = null;
    }
    
    try {
      // Check if connection exists and remove it first
      const isConn = (await this.sqlite.isConnection(this.dbName, false)).result;
      if (isConn) {
        await this.sqlite.closeConnection(this.dbName, false);
      }
    } catch (error) {
      console.warn('Error checking/closing existing connection:', error);
    }
    
    // Recreate the connection
    this.db = await this.sqlite.createConnection(
      this.dbName,
      false,
      'no-encryption',
      this.dbVersion,
      false
    );
    await this.db.open();
  }
} 