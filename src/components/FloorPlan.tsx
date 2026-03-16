import React from 'react';
import { Table, GuestGroup } from '../types';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Users, Crown } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface FloorPlanProps {
  tables: Table[];
}

export const FloorPlan: React.FC<FloorPlanProps> = ({ tables }) => {
  // Logic to arrange tables based on the user's description:
  // - Rectangular hall
  // - Stage and aisle form a T-shape
  // - Main table (Table 1) is on the left of the stage
  // - Other tables in two columns on each side, staggered

  const mainTable = tables.find(t => t.number === 1) || tables[0];
  const otherTables = tables
    .filter(t => t.id !== mainTable.id)
    .sort((a, b) => a.number - b.number);

  const half = Math.ceil(otherTables.length / 2);
  const leftSide = otherTables.slice(0, half);
  const rightSide = otherTables.slice(half);

  // Split each side into 2 columns using a Z-pattern (row-major)
  const col1 = leftSide.filter((_, i) => i % 2 === 0);
  const col2 = leftSide.filter((_, i) => i % 2 !== 0);
  const col3 = rightSide.filter((_, i) => i % 2 === 0);
  const col4 = rightSide.filter((_, i) => i % 2 !== 0);

  const renderTable = (table: Table, isMain: boolean = false) => {
    const totalGuests = table.guests.reduce((sum, g) => sum + g.total, 0);
    const occupancy = (totalGuests / table.capacity) * 100;
    
    return (
      <motion.div
        key={table.id}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "relative w-32 h-32 rounded-full flex flex-col items-center justify-center border-2 transition-all shadow-md bg-white group",
          isMain ? "border-gold bg-gold/5 ring-4 ring-gold/10" : "border-cream-dark hover:border-gold/50",
          occupancy > 100 ? "border-red-400 bg-red-50" : ""
        )}
      >
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
            {totalGuests}/{table.capacity}
          </span>
        </div>
        
        {/* Occupancy Indicator */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-cream-dark rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full transition-all duration-500",
              occupancy > 100 ? "bg-red-500" : occupancy > 80 ? "bg-gold" : "bg-emerald-500"
            )}
            style={{ width: `${Math.min(occupancy, 100)}%` }}
          />
        </div>

        {/* Guest Names Tooltip */}
        {table.guests.length > 0 && (
          <div className="absolute invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-300 z-50 bottom-full mb-4 left-1/2 -translate-x-1/2 w-48 bg-wine text-white p-3 rounded-xl shadow-2xl pointer-events-none">
            <div className="text-[10px] uppercase tracking-widest text-white/40 mb-2 border-b border-white/10 pb-1">
              賓客名單 ({totalGuests}位)
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {table.guests.map((guest, i) => (
                <div key={i} className="text-xs flex justify-between items-center">
                  <span className="font-bold truncate">{guest.name}</span>
                  <span className="text-[10px] text-white/60">{guest.total}人</span>
                </div>
              ))}
            </div>
            {/* Tooltip Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-wine" />
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="w-full h-full bg-stone-50 p-8 overflow-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto bg-white border-4 border-cream-dark rounded-3xl p-12 pb-48 shadow-inner relative min-h-[1400px]">
        
        {/* Stage Area */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-wine rounded-b-3xl flex items-center justify-center shadow-lg z-10">
          <span className="text-white font-serif text-2xl font-bold tracking-[1em] ml-[1em]">舞台 STAGE</span>
        </div>

        {/* T-Shape Aisle */}
        {/* Vertical Aisle */}
        <div className="absolute top-24 left-1/2 -translate-x-1/2 w-24 h-[calc(100%-120px)] bg-cream-dark/30 z-0" />
        {/* Horizontal Aisle (Top) */}
        <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[90%] h-12 bg-cream-dark/30 z-0" />

        {/* Main Table Position (Left of stage) */}
        <div className="absolute top-40 left-[15%] z-20">
          {renderTable(mainTable, true)}
        </div>

        {/* Tables Arrangement */}
        <div className="mt-72 flex justify-center gap-x-48 relative z-20">
          {/* Left Side Columns */}
          <div className="flex gap-x-12">
            <div className="flex flex-col gap-y-24">
              {col1.map(table => (
                <div key={table.id} className="flex justify-center">
                  {renderTable(table)}
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-y-24 mt-12">
              {col2.map(table => (
                <div key={table.id} className="flex justify-center">
                  {renderTable(table)}
                </div>
              ))}
            </div>
          </div>

          {/* Right Side Columns */}
          <div className="flex gap-x-12">
            <div className="flex flex-col gap-y-24 mt-12">
              {col3.map(table => (
                <div key={table.id} className="flex justify-center">
                  {renderTable(table)}
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-y-24">
              {col4.map(table => (
                <div key={table.id} className="flex justify-center">
                  {renderTable(table)}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Entrance */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-4 bg-gold rounded-t-full flex items-center justify-center">
          <span className="text-[10px] font-bold text-wine uppercase tracking-widest -mt-8">入口 ENTRANCE</span>
        </div>
      </div>
    </div>
  );
};
