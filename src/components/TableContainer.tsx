import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Table, GuestGroup } from '../types';
import { GuestCard } from './GuestCard';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AlertCircle, UserCheck, Trash2, Armchair, Leaf, CheckCircle2 } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TableContainerProps {
  table: Table;
  onDelete?: (id: string) => void;
  onUpdateName?: (id: string, name: string) => void;
  onUpdateCapacity?: (id: string, capacity: number) => void;
  onEditGuest?: (guest: GuestGroup) => void;
}

export const TableContainer: React.FC<TableContainerProps> = ({ table, onDelete, onUpdateName, onUpdateCapacity, onEditGuest }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: table.id,
    data: {
      table,
    },
  });

  const currentTotal = table.guests.reduce((sum, g) => sum + g.total, 0);
  const totalChairs = table.guests.reduce((sum, g) => sum + g.childChairs, 0);
  const totalVeg = table.guests.reduce((sum, g) => sum + g.vegetarian, 0);
  const isOverCapacity = currentTotal > table.capacity;
  const isFull = currentTotal === table.capacity;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col h-full min-h-[280px] rounded-lg border transition-all duration-300 overflow-hidden relative group/table",
        isOver ? "border-gold bg-gold/5 scale-[1.02] shadow-md" : "border-cream-dark bg-white shadow-sm",
        isOverCapacity && "animate-pulse-red border-red-500",
        isFull && !isOverCapacity && "border-wine bg-wine/[0.02]"
      )}
    >
      {/* Delete Button */}
      {onDelete && (
        <button 
          onClick={() => onDelete(table.id)}
          className="absolute top-2 right-2 p-1.5 rounded-md bg-gold text-white opacity-0 group-hover/table:opacity-100 transition-opacity z-10 hover:bg-gold-dark"
          title="刪除此桌"
        >
          <Trash2 size={14} />
        </button>
      )}
      {/* Table Header */}
      <div className={cn(
        "px-4 py-3 flex flex-col gap-2 border-b",
        isOverCapacity ? "bg-gold/5 border-gold/20" : "bg-cream border-cream-dark"
      )}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded-sm flex items-center justify-center text-sm font-bold",
              isOverCapacity ? "bg-gold text-white" : "bg-wine text-white"
            )}>
              {table.number}
            </div>
            <span className="font-bold text-wine">桌次</span>
          </div>
          
          <div className="flex items-center gap-2">
            {(totalChairs > 0 || totalVeg > 0) && (
              <div className="flex gap-2 mr-1">
                {totalChairs > 0 && (
                  <div className="flex items-center gap-0.5 text-wine/40" title={`此桌需要 ${totalChairs} 張兒童椅`}>
                    <Armchair size={12} />
                    <span className="text-[10px] font-bold">{totalChairs}</span>
                  </div>
                )}
                {totalVeg > 0 && (
                  <div className="flex items-center gap-0.5 text-wine/40" title={`此桌有 ${totalVeg} 位素食`}>
                    <Leaf size={12} />
                    <span className="text-[10px] font-bold">{totalVeg}</span>
                  </div>
                )}
              </div>
            )}
            <div className={cn(
              "flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-bold transition-colors",
              isOverCapacity ? "bg-red-500 text-white" : 
              isFull ? "bg-wine text-white" : 
              "bg-cream-dark text-wine/40"
            )}>
              {isOverCapacity ? (
                <AlertCircle size={14} className="animate-pulse" />
              ) : isFull ? (
                <CheckCircle2 size={14} />
              ) : (
                <UserCheck size={14} />
              )}
              <div className="flex items-center gap-1">
                <span>{currentTotal}</span>
                <span className="opacity-30">/</span>
                <input 
                  type="number"
                  min="1"
                  max="20"
                  value={table.capacity}
                  onChange={(e) => onUpdateCapacity?.(table.id, parseInt(e.target.value) || 1)}
                  className="w-6 bg-transparent border-none p-0 text-center focus:outline-none focus:ring-0 font-bold"
                  title="點擊修改桌位容量"
                />
              </div>
            </div>
          </div>
        </div>

        <input 
          type="text"
          value={table.name || ''}
          placeholder="輸入桌次名稱..."
          onChange={(e) => onUpdateName?.(table.id, e.target.value)}
          className="w-full px-2 py-1 bg-white/50 border border-transparent hover:border-cream-dark focus:border-gold/30 focus:bg-white rounded-md text-xs font-medium focus:outline-none transition-all"
        />
      </div>

      {/* Guests Area */}
      <div className="flex-1 p-3 overflow-y-auto custom-scrollbar bg-cream-dark/20">
        {table.guests.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-wine/20 text-xs italic">
            <div className="w-12 h-12 rounded-sm border border-dashed border-wine/10 mb-2 flex items-center justify-center">
              <span className="text-lg">+</span>
            </div>
            <span>拖曳賓客至此</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {table.guests.map((guest) => (
              <GuestCard key={guest.id} guest={guest} onEdit={onEditGuest} />
            ))}
          </div>
        )}
      </div>
      
      {/* Warning Footer */}
      {isOverCapacity && (
        <div className="px-3 py-1.5 bg-red-500 text-white text-[10px] font-bold text-center uppercase tracking-widest">
          警告：已超過桌次容量
        </div>
      )}
    </div>
  );
};
