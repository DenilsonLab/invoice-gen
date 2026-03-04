import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { BlockType } from '../../types';
import { GripVertical } from 'lucide-react';

interface DraggableItemProps {
  type: BlockType;
  label: string;
  icon: React.ReactNode;
}

export default function DraggableItem({ type, label, icon }: DraggableItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `draggable-${type}`,
    data: { type: 'new-block', blockType: type },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-400 transition-colors ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="text-gray-400">
        <GripVertical size={16} />
      </div>
      <div className="text-blue-600 bg-blue-50 p-1.5 rounded-md">
        {icon}
      </div>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </div>
  );
}
