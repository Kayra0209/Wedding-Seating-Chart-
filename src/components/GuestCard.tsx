import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Users, User, Baby, Leaf, Armchair, Edit2 } from 'lucide-react';
import { GuestGroup } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface GuestCardProps {
  guest: GuestGroup;
  isOverlay?: boolean;
  onEdit?: (guest: GuestGroup) => void;
}

export const GuestCard: React.FC<GuestCardProps> = ({ guest, isOverlay, onEdit }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: guest.id,
    disabled: !guest.attending && !isOverlay, // Only allow dragging if attending, or if it's the overlay
    data: {
      guest,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "p-3 mb-2 rounded-lg border bg-white shadow-sm transition-all",
        guest.attending ? "cursor-grab active:cursor-grabbing hover:border-gold/30 hover:shadow-md" : "opacity-60 grayscale cursor-default",
        isOverlay && "shadow-xl border-gold ring-2 ring-gold/10 scale-105 opacity-100 grayscale-0",
        "flex flex-col gap-1"
      )}
    >
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <span className="font-medium text-wine">{guest.name}</span>
            {onEdit && !isOverlay && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(guest);
                }}
                className="p-1 text-wine/20 hover:text-gold hover:bg-gold/5 rounded transition-all"
                title="編輯賓客資訊"
              >
                <Edit2 size={10} />
              </button>
            )}
            {guest.relationship && (
              <span className="text-[8px] px-1 py-0.5 bg-cream-dark text-wine/50 rounded font-bold uppercase tracking-tighter">
                {guest.relationship}
              </span>
            )}
            {guest.attending && (
              <span className="text-[10px] text-wine/40 font-normal">
                (+{guest.adults}大{guest.kids > 0 ? `${guest.kids}小` : ''})
              </span>
            )}
          </div>
          {!guest.attending && (
            <span className="text-[9px] text-gold font-bold uppercase tracking-tighter">不克出席</span>
          )}
        </div>
        {guest.attending && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-sm bg-wine/5 text-wine text-xs font-bold border border-wine/10">
            <Users size={12} className="text-gold" />
            <span>{guest.total}</span>
          </div>
        )}
      </div>
      
      {guest.attending && (
        <div className="flex gap-3 text-[10px] text-wine/40 font-medium uppercase tracking-wider">
          <div className="flex items-center gap-1">
            <User size={10} />
            <span>{guest.adults} 大</span>
          </div>
          {guest.kids > 0 && (
            <div className="flex items-center gap-1">
              <Baby size={10} />
              <span>{guest.kids} 小</span>
            </div>
          )}
          {guest.childChairs > 0 && (
            <div className="flex items-center gap-1 text-wine/60">
              <Armchair size={10} />
              <span>{guest.childChairs} 椅</span>
            </div>
          )}
          {guest.vegetarian > 0 && (
            <div className="flex items-center gap-1 text-wine/60">
              <Leaf size={10} />
              <span>{guest.vegetarian} 素</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
