
import React from 'react';
import { Trophy, TrendingUp } from 'lucide-react';

interface PointsDisplayProps {
  totalPoints: number;
}

const PointsDisplay: React.FC<PointsDisplayProps> = ({ totalPoints }) => {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-100 to-orange-100 px-4 py-2 rounded-full">
        <Trophy className="w-4 h-4 text-yellow-600" />
        <span className="font-semibold text-yellow-800">{totalPoints.toLocaleString()}</span>
        <span className="text-xs text-yellow-600">points</span>
      </div>
    </div>
  );
};

export default PointsDisplay;
