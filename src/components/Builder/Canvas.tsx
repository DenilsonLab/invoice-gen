import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useBuilder } from '../../context/BuilderContext';
import SortableBlock from './SortableBlock';
import { useTranslation } from 'react-i18next';

export default function Canvas() {
  const { t } = useTranslation();
  const { layout, settings } = useBuilder();
  const { setNodeRef } = useDroppable({
    id: 'canvas',
  });

  return (
    <div 
      id="invoice-canvas"
      ref={setNodeRef}
      className="bg-white w-full max-w-[210mm] min-h-[297mm] mx-auto shadow-2xl print:shadow-none print:m-0 print:w-full print:max-w-none print:h-auto print:min-h-0 relative transition-all"
      style={{ fontFamily: settings.fontFamily }}
    >
      <div className="p-12 md:p-16 flex flex-col h-full min-h-[297mm]">
        <SortableContext items={layout.map(b => b.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col flex-grow">
            {layout.map((block) => (
              <SortableBlock key={block.id} block={block} />
            ))}
            {layout.length === 0 && (
              <div className="flex-grow flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl m-4 text-gray-400">
                {t('builder.canvas.empty')}
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}
