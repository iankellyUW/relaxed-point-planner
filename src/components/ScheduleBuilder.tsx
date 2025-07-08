
import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Save, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Activity, categoryColors, categoryLightColors } from '../types/scheduler';

interface ScheduleBuilderProps {
  activities: Activity[];
  onAddActivity: (activity: Activity) => void;
  onUpdateActivity: (id: string, activity: Partial<Activity>) => void;
  onDeleteActivity: (id: string) => void;
  onSavePreset: (name: string, mood?: string) => void;
}

const ScheduleBuilder: React.FC<ScheduleBuilderProps> = ({
  activities,
  onAddActivity,
  onUpdateActivity,
  onDeleteActivity,
  onSavePreset
}) => {
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [presetName, setPresetName] = useState('');
  const [presetMood, setPresetMood] = useState('');
  const [showSavePreset, setShowSavePreset] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    startTime: '',
    endTime: '',
    category: 'Work' as Activity['category'],
    points: 10,
    description: ''
  });

  const resetForm = () => {
    setFormData({
      title: '',
      startTime: '',
      endTime: '',
      category: 'Work',
      points: 10,
      description: ''
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const activity: Activity = {
      id: editingActivity?.id || Date.now().toString(),
      ...formData,
      color: categoryColors[formData.category]
    };

    if (editingActivity) {
      onUpdateActivity(editingActivity.id, activity);
      setEditingActivity(null);
    } else {
      onAddActivity(activity);
    }

    resetForm();
    setIsAddingActivity(false);
  };

  const startEditing = (activity: Activity) => {
    setEditingActivity(activity);
    setFormData({
      title: activity.title,
      startTime: activity.startTime,
      endTime: activity.endTime,
      category: activity.category,
      points: activity.points,
      description: activity.description || ''
    });
    setIsAddingActivity(true);
  };

  const handleSavePreset = () => {
    if (presetName.trim()) {
      onSavePreset(presetName.trim(), presetMood.trim() || undefined);
      setPresetName('');
      setPresetMood('');
      setShowSavePreset(false);
    }
  };

  const sortedActivities = [...activities].sort((a, b) => a.startTime.localeCompare(b.startTime));

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Schedule Builder</h2>
          <p className="text-slate-600">Create and customize your daily activities</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setIsAddingActivity(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Activity
          </Button>
          {activities.length > 0 && (
            <Dialog open={showSavePreset} onOpenChange={setShowSavePreset}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Save className="w-4 h-4 mr-2" />
                  Save as Preset
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Schedule as Preset</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="presetName">Preset Name</Label>
                    <Input
                      id="presetName"
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      placeholder="e.g., Morning Routine, Productive Day"
                    />
                  </div>
                  <div>
                    <Label htmlFor="presetMood">Mood/Energy Tag (Optional)</Label>
                    <Input
                      id="presetMood"
                      value={presetMood}
                      onChange={(e) => setPresetMood(e.target.value)}
                      placeholder="e.g., High Energy, Relaxed, Focused"
                    />
                  </div>
                  <Button onClick={handleSavePreset} className="w-full">
                    Save Preset
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Activity Form */}
      {isAddingActivity && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">
            {editingActivity ? 'Edit Activity' : 'Add New Activity'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Activity Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Morning Workout"
                required
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category} onValueChange={(value: Activity['category']) => 
                setFormData({ ...formData, category: value })
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fitness">Fitness</SelectItem>
                  <SelectItem value="Work">Work</SelectItem>
                  <SelectItem value="Leisure">Leisure</SelectItem>
                  <SelectItem value="Recovery">Recovery</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="points">Points</Label>
              <Input
                id="points"
                type="number"
                min="1"
                max="100"
                value={formData.points}
                onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 10 })}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Additional details..."
              />
            </div>

            <div className="md:col-span-2 flex gap-3">
              <Button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white">
                {editingActivity ? 'Update Activity' : 'Add Activity'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsAddingActivity(false);
                  setEditingActivity(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Activities List */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Your Activities</h3>
        
        {activities.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 mb-2">No activities yet</p>
            <p className="text-sm text-slate-500">Add your first activity to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-12 rounded-full ${categoryColors[activity.category]}`} />
                  <div>
                    <h4 className="font-medium text-slate-800">{activity.title}</h4>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <span>{formatTime(activity.startTime)} - {formatTime(activity.endTime)}</span>
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
                
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => startEditing(activity)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDeleteActivity(activity.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default ScheduleBuilder;
