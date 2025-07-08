import React, { useRef } from 'react';
import { Calendar, Trash2, Edit, Copy, Heart, Zap, Coffee, Sunset, Download, Upload, FolderOpen } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Preset, categoryColors, categoryLightColors } from '../types/scheduler';
import { exportPresetToCSV, exportPresetsToCSV, downloadCSV, parseCSVToPresets } from '../utils/csvOperations';

interface PresetsLibraryProps {
  presets: Preset[];
  onLoadPreset: (preset: Preset) => void;
  onDeletePreset: (id: string) => void;
  onDuplicatePreset: (preset: Preset) => void;
  onImportPresets: (presets: Preset[]) => void;
}

const PresetsLibrary: React.FC<PresetsLibraryProps> = ({
  presets,
  onLoadPreset,
  onDeletePreset,
  onDuplicatePreset,
  onImportPresets
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleExportAll = () => {
    if (presets.length === 0) return;
    const csvContent = exportPresetsToCSV(presets);
    downloadCSV(csvContent, `relaxed-scheduler-presets-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportPreset = (preset: Preset) => {
    const csvContent = exportPresetToCSV(preset);
    downloadCSV(csvContent, `preset-${preset.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`);
  };

  const handleImportCSV = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvContent = e.target?.result as string;
        const importedPresets = parseCSVToPresets(csvContent);
        if (importedPresets.length > 0) {
          onImportPresets(importedPresets);
        }
      } catch (error) {
        console.error('Error parsing CSV:', error);
      }
    };
    reader.readAsText(file);
    
    // Reset input
    event.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Presets Library</h2>
          <p className="text-slate-600">Saved schedules you can quickly load and customize</p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={handleImportCSV}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </Button>
          <Button
            onClick={handleExportAll}
            variant="outline"
            disabled={presets.length === 0}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export All
          </Button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="hidden"
      />

      {presets.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-800 mb-2">No presets yet</h3>
            <p className="text-slate-600 mb-4">Create your first schedule in the Schedule Builder and save it as a preset</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {presets.map((preset) => {
            const categoryBreakdown = getCategoryBreakdown(preset);
            const totalPoints = getTotalPoints(preset);
            const timeRange = getTimeRange(preset);
            
            return (
              <Card key={preset.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        {getMoodIcon(preset.mood)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-800 truncate">{preset.name}</h3>
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

                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">
                      {preset.activities.length} activities
                    </span>
                    <span className="font-medium text-blue-600">
                      {totalPoints} total points
                    </span>
                  </div>

                  {/* Category Pills */}
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

                  {/* Time Range */}
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

                  {/* Activities Preview */}
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

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => onLoadPreset(preset)}
                      size="sm"
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      <FolderOpen className="w-4 h-4 mr-1" />
                      Load
                    </Button>
                    <Button
                      onClick={() => onLoadPreset(preset)}
                      size="sm"
                      variant="outline"
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </div>

                  {/* Secondary Actions */}
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
                      onClick={() => handleExportPreset(preset)}
                      size="sm"
                      variant="outline"
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Export CSV
                    </Button>
                  </div>

                  {/* Created Date */}
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
