import React, { useState, useEffect } from 'react';
import { Calendar, Trash2, Edit, Copy, Heart, Zap, Coffee, Sunset, FolderOpen, Search, BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Preset, categoryColors, categoryLightColors } from '../types/scheduler';
import { DataPersistenceService } from '../services/dataPersistence';

interface PresetsLibraryProps {
  presets: Preset[];
  loadedPresetId: string | null;
  onLoadPreset: (preset: Preset) => void;
  onDeletePreset: (id: string) => void;
  onDuplicatePreset: (preset: Preset) => void;
  onEditPreset: (preset: Preset) => void;
}

const PresetsLibrary: React.FC<PresetsLibraryProps> = ({
  presets,
  loadedPresetId,
  onLoadPreset,
  onDeletePreset,
  onDuplicatePreset,
  onEditPreset
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPresets, setFilteredPresets] = useState<Preset[]>(presets);
  const [stats, setStats] = useState<{ totalPresets: number; totalActivities: number }>({ 
    totalPresets: 0, 
    totalActivities: 0 
  });

  // Update filtered presets when presets or search term changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredPresets(presets);
    } else {
      const filtered = presets.filter(preset => 
        preset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        preset.mood?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        preset.activities.some(activity => 
          activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          activity.category.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      setFilteredPresets(filtered);
    }
  }, [presets, searchTerm]);

  // Load stats from SQLite
  useEffect(() => {
    const loadStats = async () => {
      try {
        const dataService = DataPersistenceService.getInstance();
        // Try to get stats from SQLite, fallback to counting current presets
        const totalActivities = presets.reduce((sum, preset) => sum + preset.activities.length, 0);
        setStats({
          totalPresets: presets.length,
          totalActivities
        });
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    };
    
    loadStats();
  }, [presets]);

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getMoodIcon = (mood?: string) => {
    if (!mood) return <Calendar className="w-4 h-4" />;
    
    const moodLower = mood.toLowerCase();
    if (moodLower.includes('energy') || moodLower.includes('high')) return <Zap className="w-4 h-4" />;
    if (moodLower.includes('relaxed') || moodLower.includes('calm')) return <Sunset className="w-4 h-4" />;
    if (moodLower.includes('focused') || moodLower.includes('productive')) return <Coffee className="w-4 h-4" />;
    if (moodLower.includes('love') || moodLower.includes('heart')) return <Heart className="w-4 h-4" />;
    
    return <Calendar className="w-4 h-4" />;
  };

  const getTotalPoints = (preset: Preset) => {
    return preset.activities.reduce((sum, activity) => sum + activity.points, 0);
  };

  const getCategoryBreakdown = (preset: Preset) => {
    const breakdown: Record<string, number> = {};
    preset.activities.forEach(activity => {
      breakdown[activity.category] = (breakdown[activity.category] || 0) + 1;
    });
    return breakdown;
  };

  const getTimeRange = (preset: Preset) => {
    if (preset.activities.length === 0) return null;
    
    const startTimes = preset.activities.map(a => a.startTime);
    const endTimes = preset.activities.map(a => a.endTime);
    
    const earliestStart = startTimes.reduce((earliest, current) => 
      current < earliest ? current : earliest
    );
    const latestEnd = endTimes.reduce((latest, current) => 
      current > latest ? current : latest
    );
    
    return { start: earliestStart, end: latestEnd };
  };



  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Presets Library</h2>
          <p className="text-slate-600">Saved schedules you can quickly load and customize</p>
        </div>
        
        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-slate-600">
          <div className="flex items-center gap-1">
            <BarChart3 className="w-4 h-4" />
            <span>{stats.totalPresets} presets</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{stats.totalActivities} activities</span>
          </div>
        </div>
      </div>

      {/* Search */}
      {presets.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            placeholder="Search presets by name, mood, or activities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {presets.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-800 mb-2">No presets yet</h3>
            <p className="text-slate-600 mb-4">Create your first schedule in the Schedule Builder and save it as a preset</p>
          </div>
        </Card>
      ) : filteredPresets.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Search className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-800 mb-2">No matching presets</h3>
            <p className="text-slate-600 mb-4">Try a different search term or browse all presets</p>
            <Button
              variant="outline"
              onClick={() => setSearchTerm('')}
              className="mt-2"
            >
              Clear Search
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPresets.map((preset) => {
            const categoryBreakdown = getCategoryBreakdown(preset);
            const totalPoints = getTotalPoints(preset);
            const timeRange = getTimeRange(preset);
            
            return (
              <Card key={preset.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${
                        loadedPresetId === preset.id 
                          ? 'bg-green-100 border-2 border-green-300' 
                          : 'bg-blue-100'
                      }`}>
                        {getMoodIcon(preset.mood)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-800 truncate">{preset.name}</h3>
                          {loadedPresetId === preset.id && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                              Loaded
                            </span>
                          )}
                        </div>
                        {preset.mood && (
                          <p className="text-sm text-slate-500">{preset.mood}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDeletePreset(preset.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">
                      {preset.activities.length} activities
                    </span>
                    <span className="font-medium text-blue-600">
                      {totalPoints} total points
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {Object.entries(categoryBreakdown).map(([category, count]) => (
                      <span
                        key={category}
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          categoryLightColors[category as keyof typeof categoryLightColors]
                        }`}
                      >
                        {count} {category}
                      </span>
                    ))}
                  </div>

                  {timeRange && (
                    <div className="text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {formatTime(timeRange.start)} - {formatTime(timeRange.end)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {preset.activities.slice(0, 3).map((activity, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <div className={`w-2 h-2 rounded-full ${categoryColors[activity.category]}`} />
                        <span className="text-slate-700 truncate flex-1">{activity.title}</span>
                        <span className="text-slate-500 text-xs">
                          {formatTime(activity.startTime)}
                        </span>
                      </div>
                    ))}
                    {preset.activities.length > 3 && (
                      <p className="text-xs text-slate-500 text-center">
                        +{preset.activities.length - 3} more activities
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        console.log('Load button clicked for preset:', preset.name, 'ID:', preset.id);
                        onLoadPreset(preset);
                      }}
                      size="sm"
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      <FolderOpen className="w-4 h-4 mr-1" />
                      Load
                    </Button>
                    <Button
                      onClick={() => onEditPreset(preset)}
                      size="sm"
                      variant="outline"
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => onDuplicatePreset(preset)}
                      size="sm"
                      variant="outline"
                      className="flex-1"
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Duplicate
                    </Button>
                    <Button
                      onClick={() => onDeletePreset(preset.id)}
                      size="sm"
                      variant="outline"
                      className="flex-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>

                  <p className="text-xs text-slate-400 text-center">
                    Created {new Date(preset.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PresetsLibrary;
