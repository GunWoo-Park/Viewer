'use client';

import { useState } from 'react';

export default function StructCondTooltip({
  condition,
}: {
  condition: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!condition) return <span className="text-gray-300">-</span>;

  // 짧은 조건은 그대로 표시
  if (condition.length <= 60) {
    return <span className="text-xs text-gray-600">{condition}</span>;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-left text-xs text-gray-600 hover:text-blue-600 transition-colors cursor-pointer"
      >
        {isExpanded ? condition : `${condition.slice(0, 55)}...`}
      </button>
      {isExpanded && (
        <div className="absolute z-50 mt-1 w-96 rounded-lg border border-gray-200 bg-white p-3 shadow-lg text-xs text-gray-700 whitespace-pre-wrap">
          {condition}
        </div>
      )}
    </div>
  );
}
