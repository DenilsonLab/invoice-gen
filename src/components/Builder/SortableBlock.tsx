import React, { lazy, Suspense } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { InvoiceBlock } from '../../types';
import { useBuilder } from '../../context/BuilderContext';
import { GripVertical, Trash2 } from 'lucide-react';
import BlockRenderer from './BlockRenderer';
import 'react-quill-new/dist/quill.snow.css';
import { useTranslation } from 'react-i18next';

const ReactQuill = lazy(() => import('react-quill-new'));

interface SortableBlockProps {
  block: InvoiceBlock;
  key?: React.Key;
}

export default function SortableBlock({ block }: SortableBlockProps) {
  const { t } = useTranslation();
  const { selectedBlockId, setSelectedBlockId, layout, setLayout } = useBuilder();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id, data: { type: 'block', block } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isSelected = selectedBlockId === block.id;

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLayout(layout.filter(b => b.id !== block.id));
    if (isSelected) setSelectedBlockId(null);
  };

  const modules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'code'],
      ['code-block']
    ],
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group print:border-none print:m-0 print:p-0 ${isDragging ? 'opacity-50 z-50' : 'opacity-100'
        } ${isSelected ? 'ring-2 ring-blue-500 rounded-lg' : 'hover:ring-1 hover:ring-gray-300 rounded-lg'
        } transition-all duration-200 cursor-pointer mb-2`}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedBlockId(block.id);
      }}
    >
      {/* Controls - Hidden in print */}
      <div className="absolute -left-10 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
        <div
          {...attributes}
          {...listeners}
          className="p-1.5 bg-white border border-gray-200 rounded-md shadow-sm text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
        >
          <GripVertical size={16} />
        </div>
        <button
          onClick={handleRemove}
          className="p-1.5 bg-white border border-gray-200 rounded-md shadow-sm text-gray-400 hover:text-red-500 cursor-pointer"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Block Content */}
      <div className="print:p-0">
        {block.type === 'custom-text' && isSelected ? (
          <div className="mb-6 bg-white" onClick={(e) => e.stopPropagation()}>
            <Suspense fallback={<div className="h-28 bg-gray-50 rounded-lg border border-gray-200" />}>
              <ReactQuill
                theme="snow"
                value={block.content || ''}
                onChange={(content) => {
                  setLayout(layout.map(b => b.id === block.id ? { ...b, content } : b));
                }}
                modules={modules}
                className="min-h-[100px]"
                placeholder={t('builder.editor.placeholder')}
              />
            </Suspense>
          </div>
        ) : (
          <BlockRenderer block={block} />
        )}
      </div>
    </div>
  );
}
