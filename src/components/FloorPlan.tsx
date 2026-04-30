import React from 'react';
import { 
  DndContext, 
  closestCenter, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragEndEvent,
  DragStartEvent,
  DragOverlay
} from '@dnd-kit/core';
import { useSortable, SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Table, GuestGroup } from '../types';
import { getTableStats } from '../utils/tableUtils';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Users, Crown, GripVertical } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface FloorPlanProps {
  tables: Table[];
  onSwapTables?: (id1: string, id2: string) => void;
}

interface SortableTableProps {
  table: Table;
  isMain?: boolean;
}

const SortableTable: React.FC<SortableTableProps> = ({ table, isMain = false }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: table.id,
    disabled: isMain, // Disable sorting for main table as requested
    data: {
      table,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.3 : 1,
  };

  const { currentTotal, occupancy, isOverCapacity } = getTableStats(table);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex justify-center items-center relative",
        isDragging && "scale-110"
      )}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "relative w-32 h-32 rounded-full flex flex-col items-center justify-center border-2 transition-all shadow-md bg-white group",
          isMain ? "border-gold bg-gold/5 ring-4 ring-gold/10" : "border-cream-dark hover:border-gold/50 cursor-default",
          isOverCapacity ? "border-red-400 bg-red-50" : "",
          isDragging && "ring-4 ring-gold/30 border-gold shadow-2xl"
        )}
      >
        {!isMain && (
          <div 
            {...attributes} 
            {...listeners}
            className="absolute top-1 right-6 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-cream-dark/50 text-wine/50 hover:text-wine cursor-grab active:cursor-grabbing z-10"
          >
            <GripVertical size={14} />
          </div>
        )}

        {isMain && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gold text-white p-1.5 rounded-full shadow-sm">
            <Crown size={16} />
          </div>
        )}
        <span className={cn("text-sm font-bold", isMain ? "text-gold" : "text-wine")}>
          {isMain ? "主桌" : `第 ${table.number} 桌`}
        </span>
        {table.name && (
          <span className="text-[10px] text-wine/40 font-medium truncate max-w-[80%] text-center">
            {table.name}
          </span>
        )}
        <div className="flex items-center gap-1 mt-1">
          <Users size={12} className="text-wine/30" />
          <span className="text-xs font-mono font-bold text-wine/60">
            {currentTotal}/{table.capacity}
          </span>
        </div>
        
        {/* Occupancy Indicator */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-cream-dark rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full transition-all duration-500",
              isOverCapacity ? "bg-red-500" : occupancy > 80 ? "bg-gold" : "bg-emerald-500"
            )}
            style={{ width: `${Math.min(occupancy, 100)}%` }}
          />
        </div>

        {/* Guest Names Tooltip */}
        {table.guests.length > 0 && (
          <div className="absolute invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-300 z-50 bottom-full mb-4 left-1/2 -translate-x-1/2 w-48 bg-wine text-white p-3 rounded-xl shadow-2xl pointer-events-none">
            <div className="text-[10px] uppercase tracking-widest text-white/40 mb-2 border-b border-white/10 pb-1">
              賓客名單 ({currentTotal}位)
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {table.guests.map((guest, i) => (
                <div key={i} className="text-xs flex justify-between items-center">
                  <span className="font-bold truncate">{guest.name}</span>
                  <span className="text-[10px] text-white/60">{guest.total}人</span>
                </div>
              ))}
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-wine" />
          </div>
        )}
      </motion.div>
    </div>
  );
};

export const FloorPlan: React.FC<FloorPlanProps> = ({ tables, onSwapTables }) => {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const mainTable = tables.find(t => t.number === 1) || tables[0];
  const otherTables = tables
    .filter(t => t.id !== mainTable.id)
    .sort((a, b) => a.number - b.number);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (over && active.id !== over.id) {
      if (onSwapTables) {
        onSwapTables(active.id as string, over.id as string);
      }
    }
  };

  const activeTable = activeId ? tables.find(t => t.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="w-full h-full bg-stone-50 p-8 overflow-auto custom-scrollbar">
        <div className="max-w-6xl mx-auto bg-white border-4 border-cream-dark rounded-3xl p-12 pb-64 shadow-inner relative min-h-[1600px]">
          
          {/* Stage Area */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-wine rounded-b-3xl flex items-center justify-center shadow-lg z-10">
            <span className="text-white font-serif text-2xl font-bold tracking-[1em] ml-[1em]">舞台 STAGE</span>
          </div>

          {/* Main Aisle Visuals (T-Shape) */}
          {/* Vertical Central Aisle */}
          <div className="absolute top-24 left-1/2 -translate-x-1/2 w-24 h-[calc(100%-200px)] bg-cream-dark/10 z-0" />
          
          {/* Horizontal Aisle between Row 1 and Row 2 (approximate) */}
          <div className="absolute top-[520px] left-0 w-full h-12 bg-cream-dark/5 z-0" />

          {/* Main Table Position (Top Left near stage) */}
          {/* Centered between Table 2 & 3: which are Col 1 & Col 2 on left side */}
          <div className="absolute top-48 left-[18.5%] -translate-x-1/2 z-20">
            <SortableTable table={mainTable} isMain={true} />
          </div>

          {/* Tables Arrangement: rows of 4 with central aisle */}
          <div className="mt-[420px] relative z-20 px-8 flex flex-col items-center">
            <div className="grid grid-cols-[repeat(2,minmax(0,1fr))_6rem_repeat(2,minmax(0,1fr))] gap-y-36 w-full max-w-5xl">
              <SortableContext items={otherTables.map(t => t.id)} strategy={rectSortingStrategy}>
                {otherTables.map((table, index) => (
                  <React.Fragment key={table.id}>
                    {/* Add central aisle placeholder */}
                    {index % 4 === 2 && <div className="w-full flex items-center justify-center pointer-events-none" />}
                    
                    <div className={cn(
                      "flex justify-center",
                      // Add additional gap between Row 1 and Row 2 for horizontal aisle
                      Math.floor(index / 4) === 1 ? "mt-12" : ""
                    )}>
                      <SortableTable table={table} />
                    </div>
                  </React.Fragment>
                ))}
              </SortableContext>
            </div>
          </div>

          <DragOverlay>
            {activeTable ? (
              <div className="scale-110 opacity-80 ring-4 ring-gold border-gold rounded-full bg-white flex flex-col items-center justify-center w-32 h-32 shadow-2xl">
                <span className="text-sm font-bold text-wine">第 {activeTable.number} 桌</span>
                <div className="flex items-center gap-1 mt-1">
                  <Users size={12} className="text-wine/30" />
                  <span className="text-xs font-mono font-bold text-wine/60">
                    {activeTable.guests.reduce((s, g) => s + g.total, 0)}/{activeTable.capacity}
                  </span>
                </div>
              </div>
            ) : null}
          </DragOverlay>

          {/* Entrance Area Padding & Visual */}
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full flex flex-col items-center gap-8">
            <div className="w-3/4 h-0.5 bg-gradient-to-r from-transparent via-cream-dark to-transparent" />
            <div className="w-48 h-4 bg-gold rounded-t-full flex items-center justify-center">
              <span className="text-[10px] font-bold text-wine uppercase tracking-widest -mt-12 transition-all">入口 ENTRANCE</span>
            </div>
          </div>
        </div>
      </div>
    </DndContext>
  );
};
