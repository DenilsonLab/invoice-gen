import React, { useState } from 'react';
import { 
  DndContext, 
  DragOverlay, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent
} from '@dnd-kit/core';
import { 
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { useBuilder } from '../../context/BuilderContext';
import Sidebar from './Sidebar';
import Canvas from './Canvas';
import { InvoiceBlock, BlockType } from '../../types';
import BlockRenderer from './BlockRenderer';

export default function Builder() {
  const { layout, setLayout, selectedBlockId, setSelectedBlockId } = useBuilder();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<BlockType | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    
    if (active.data.current?.type === 'new-block') {
      setActiveType(active.data.current.blockType as BlockType);
    } else if (active.data.current?.type === 'block') {
      setActiveType(active.data.current.block.type as BlockType);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveType(null);

    if (!over) return;

    if (active.data.current?.type === 'new-block') {
      // Dropping a new block from sidebar
      const newBlock: InvoiceBlock = {
        id: `block-${Date.now()}`,
        type: active.data.current.blockType as BlockType,
        content: active.data.current.blockType === 'custom-text' ? 'Texto personalizado...' : undefined
      };

      if (over.id === 'canvas') {
        // Dropped on empty canvas
        setLayout([...layout, newBlock]);
      } else {
        // Dropped over an existing block
        const overIndex = layout.findIndex(b => b.id === over.id);
        const newLayout = [...layout];
        newLayout.splice(overIndex, 0, newBlock);
        setLayout(newLayout);
      }
      setSelectedBlockId(newBlock.id);
    } else if (active.id !== over.id) {
      // Reordering existing blocks
      const oldIndex = layout.findIndex(b => b.id === active.id);
      const newIndex = layout.findIndex(b => b.id === over.id);
      setLayout(arrayMove(layout, oldIndex, newIndex));
    }
  };

  // Create a dummy block for the drag overlay
  const overlayBlock: InvoiceBlock | null = activeType ? {
    id: 'overlay',
    type: activeType,
    content: activeType === 'custom-text' ? 'Texto personalizado...' : undefined
  } : null;

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] bg-[#f5f5f4] overflow-hidden">
        <Sidebar />
        
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center print:p-0 print:block">
          <div className="w-full max-w-[210mm] transition-all" onClick={() => setSelectedBlockId(null)}>
            <Canvas />
          </div>
        </div>
      </div>

      <DragOverlay>
        {overlayBlock ? (
          <div className="opacity-80 scale-105 shadow-xl bg-white rounded-lg p-4 pointer-events-none">
            <BlockRenderer block={overlayBlock} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
