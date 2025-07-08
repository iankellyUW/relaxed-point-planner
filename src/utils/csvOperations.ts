
import { Preset } from '../types/scheduler';

export const exportPresetToCSV = (preset: Preset): string => {
  const headers = ['Title', 'Start Time', 'End Time', 'Category', 'Points', 'Description'];
  const csvContent = [
    headers.join(','),
    ...preset.activities.map(activity => [
      `"${activity.title}"`,
      activity.startTime,
      activity.endTime,
      activity.category,
      activity.points.toString(),
      `"${activity.description || ''}"`
    ].join(','))
  ].join('\n');
  
  return csvContent;
};

export const exportPresetsToCSV = (presets: Preset[]): string => {
  const headers = ['Preset Name', 'Mood', 'Activity Title', 'Start Time', 'End Time', 'Category', 'Points', 'Description'];
  const csvContent = [
    headers.join(','),
    ...presets.flatMap(preset => 
      preset.activities.map(activity => [
        `"${preset.name}"`,
        `"${preset.mood || ''}"`,
        `"${activity.title}"`,
        activity.startTime,
        activity.endTime,
        activity.category,
        activity.points.toString(),
        `"${activity.description || ''}"`
      ].join(','))
    )
  ].join('\n');
  
  return csvContent;
};

export const downloadCSV = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const parseCSVToPresets = (csvContent: string): Preset[] => {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  const dataLines = lines.slice(1);
  
  const presetMap = new Map<string, Preset>();
  
  dataLines.forEach(line => {
    const values = line.split(',').map(v => v.replace(/"/g, '').trim());
    const presetName = values[0];
    const mood = values[1];
    const activityTitle = values[2];
    const startTime = values[3];
    const endTime = values[4];
    const category = values[5] as 'Fitness' | 'Work' | 'Leisure' | 'Recovery';
    const points = parseInt(values[6]) || 0;
    const description = values[7];
    
    if (!presetMap.has(presetName)) {
      presetMap.set(presetName, {
        id: Date.now().toString() + Math.random().toString(),
        name: presetName,
        activities: [],
        mood: mood || undefined,
        createdAt: new Date().toISOString()
      });
    }
    
    const preset = presetMap.get(presetName)!;
    preset.activities.push({
      id: Date.now().toString() + Math.random().toString(),
      title: activityTitle,
      startTime,
      endTime,
      category,
      color: '', // Will be set by the component
      points,
      description: description || undefined
    });
  });
  
  return Array.from(presetMap.values());
};
