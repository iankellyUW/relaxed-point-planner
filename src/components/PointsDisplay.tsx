
import React from 'react';
import { Trophy, TrendingUp, Calendar } from 'lucide-react';

interface PointsDisplayProps {
  totalPoints: number;
  dailyPoints?: number;
}

const PointsDisplay: React.FC<PointsDisplayProps> = ({ totalPoints, dailyPoints = 0 }) => {
  return (
    <div className="flex items-center gap-3">
      {/* Daily Points */}
      <div className="flex items-center gap-2 bg-gradient-to-r from-blue-100 to-indigo-100 px-3 py-2 rounded-full">
        <Calendar className="w-4 h-4 text-blue-600" />
        <span className="font-semibold text-blue-800">{dailyPoints.toLocaleString()}</span>
        <span className="text-xs text-blue-600">today</span>
      </div>
      
      {/* Total Points */}
      <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-100 to-orange-100 px-3 py-2 rounded-full">
        <Trophy className="w-4 h-4 text-yellow-600" />
        <span className="font-semibold text-yellow-800">{totalPoints.toLocaleString()}</span>
        <span className="text-xs text-yellow-600">total</span>
      </div>
    </div>
  );
};

export default PointsDisplay;
