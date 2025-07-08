
export interface Activity {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  category: 'Fitness' | 'Work' | 'Leisure' | 'Recovery';
  color: string;
  points: number;
  description?: string;
}

export interface Preset {
  id: string;
  name: string;
  activities: Activity[];
  mood?: string;
  createdAt: string;
}

export interface CompletedTask {
  id: string;
  activityId: string;
  date: string;
  points: number;
}

export const categoryColors = {
  Fitness: 'bg-emerald-500',
  Work: 'bg-blue-500',
  Leisure: 'bg-purple-500',
  Recovery: 'bg-teal-500'
};

export const categoryLightColors = {
  Fitness: 'bg-emerald-100 text-emerald-800',
  Work: 'bg-blue-100 text-blue-800',
  Leisure: 'bg-purple-100 text-purple-800',
  Recovery: 'bg-teal-100 text-teal-800'
};
