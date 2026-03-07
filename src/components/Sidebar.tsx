import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { GuestGroup } from '../types';
import { GuestCard } from './GuestCard';
import { Users, Search, UserCheck, UserX, Settings, Trash2, Download, UserPlus } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  guests: GuestGroup[];
  onSearch: (term: string) => void;
  onRelationshipFilter: (relationship: string) => void;
  onClearAll?: () => void;
  onEditGuest?: (guest: GuestGroup) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ guests, onSearch, onRelationshipFilter, onClearAll, onEditGuest }) => {
  const [activeTab, setActiveTab] = useState<'attending' | 'not-attending'>('attending');
  const [selectedRelationship, setSelectedRelationship] = useState<string>('all');
  const { setNodeRef, isOver } = useDroppable({
    id: 'unassigned-sidebar',
  });

  const attendingGuests = guests.filter(g => g.attending);
  const notAttendingGuests = guests.filter(g => !g.attending);
  
  const relationships = Array.from(new Set(attendingGuests.map(g => g.relationship))).filter(Boolean);

  const displayedGuests = activeTab === 'attending' ? attendingGuests : notAttendingGuests;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col h-full bg-white border-r border-cream-dark transition-colors",
        isOver && "bg-cream"
      )}
    >
      <div className="p-6 border-b border-cream-dark bg-cream">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-wine flex items-center gap-2">
            <Users size={24} className="text-gold" />
            賓客名單
          </h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => onEditGuest?.({
                id: '',
                name: '',
                adults: 1,
                kids: 0,
                total: 1,
                attending: true,
                childChairs: 0,
                vegetarian: 0,
                source: 'manual',
                isPrepared: false,
                relationship: ''
              })}
              className="p-1.5 text-wine/20 hover:text-gold hover:bg-gold/5 rounded-md transition-all"
              title="手動新增賓客"
            >
              <UserPlus size={16} />
            </button>
            <span className="px-3 py-1 bg-gold text-white text-[10px] font-bold rounded-sm">
              共 {attendingGuests.reduce((sum, g) => sum + g.total, 0)} 人出席
            </span>
          </div>
        </div>
        
        <div className="space-y-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-wine/30" size={16} />
            <input
              type="text"
              placeholder="搜尋賓客姓名..."
              onChange={(e) => onSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-cream-dark rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gold/50 focus:border-gold transition-all"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => {
                setSelectedRelationship('all');
                onRelationshipFilter('all');
              }}
              className={cn(
                "px-2.5 py-1 rounded-md text-[10px] font-bold transition-all border",
                selectedRelationship === 'all'
                  ? "bg-wine text-white border-wine"
                  : "bg-white text-wine/50 border-cream-dark hover:border-gold/50"
              )}
            >
              全部
            </button>
            {relationships.map(rel => (
              <button
                key={rel}
                onClick={() => {
                  setSelectedRelationship(rel);
                  onRelationshipFilter(rel);
                }}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[10px] font-bold transition-all border",
                  selectedRelationship === rel
                    ? "bg-wine text-white border-wine"
                    : "bg-white text-wine/50 border-cream-dark hover:border-gold/50"
                )}
              >
                {rel}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-cream-dark rounded-lg">
          <button
            onClick={() => setActiveTab('attending')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-md transition-all",
              activeTab === 'attending' 
                ? "bg-white text-gold shadow-sm" 
                : "text-wine/40 hover:text-wine/60"
            )}
          >
            <UserCheck size={14} />
            出席未排座 ({attendingGuests.length})
          </button>
          <button
            onClick={() => setActiveTab('not-attending')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-md transition-all",
              activeTab === 'not-attending' 
                ? "bg-white text-wine shadow-sm" 
                : "text-wine/40 hover:text-wine/60"
            )}
          >
            <UserX size={14} />
            不克 ({notAttendingGuests.length})
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {displayedGuests.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-stone-400 text-sm italic text-center px-4">
            <p>{activeTab === 'attending' ? '目前沒有未分配的出席賓客' : '沒有不克出席的賓客記錄'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {displayedGuests.map((guest) => (
              <GuestCard key={guest.id} guest={guest} onEdit={onEditGuest} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
