import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Baby, Armchair, Leaf, MapPin, Save, Users, Heart, Gift, Check } from 'lucide-react';
import { GuestGroup } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface GuestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  form: {
    name: string;
    zipCode: string;
    address: string;
    adults: number;
    kids: number;
    childChairs: number;
    vegetarian: number;
    relationship: string;
    attending: boolean;
    giftCount: number;
    giftReceived: boolean;
    redEnvelopeReceived: boolean;
  };
  setForm: React.Dispatch<React.SetStateAction<any>>;
  isEditing: boolean;
}

export const GuestFormModal: React.FC<GuestFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  form,
  setForm,
  isEditing
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-wine/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-cream-dark bg-cream flex justify-between items-center">
          <h2 className="text-xl font-bold text-wine flex items-center gap-2">
            {isEditing ? <Users size={24} className="text-gold" /> : <Heart size={24} className="text-gold" />}
            {isEditing ? '編輯賓客資訊' : '手動新增賓客'}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-cream-dark rounded-full transition-colors"
          >
            <X className="text-wine/40" size={24} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-8 space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-wine/30 uppercase tracking-widest ml-1">賓客姓名</label>
              <input 
                type="text" 
                required
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="輸入姓名..."
                className="w-full px-5 py-3 bg-cream border border-cream-dark rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gold/50 focus:border-gold transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-wine/30 uppercase tracking-widest ml-1">關係/標籤</label>
              <input 
                type="text" 
                value={form.relationship}
                onChange={e => setForm(prev => ({ ...prev, relationship: e.target.value }))}
                placeholder="例如：男方親戚、大學同學..."
                className="w-full px-5 py-3 bg-cream border border-cream-dark rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gold/50 focus:border-gold transition-all"
              />
            </div>
          </div>

          {/* Numbers */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-wine/30 uppercase tracking-widest ml-1 flex items-center gap-1">
                <User size={10} /> 大人
              </label>
              <input 
                type="number" 
                min="0"
                value={form.adults}
                onChange={e => setForm(prev => ({ ...prev, adults: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-3 bg-cream border border-cream-dark rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gold/50 focus:border-gold transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-wine/30 uppercase tracking-widest ml-1 flex items-center gap-1">
                <Baby size={10} /> 兒童
              </label>
              <input 
                type="number" 
                min="0"
                value={form.kids}
                onChange={e => setForm(prev => ({ ...prev, kids: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-3 bg-cream border border-cream-dark rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gold/50 focus:border-gold transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-wine/30 uppercase tracking-widest ml-1 flex items-center gap-1">
                <Armchair size={10} /> 兒童椅
              </label>
              <input 
                type="number" 
                min="0"
                value={form.childChairs}
                onChange={e => setForm(prev => ({ ...prev, childChairs: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-3 bg-cream border border-cream-dark rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gold/50 focus:border-gold transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-wine/30 uppercase tracking-widest ml-1 flex items-center gap-1">
                <Leaf size={10} /> 素食
              </label>
              <input 
                type="number" 
                min="0"
                value={form.vegetarian}
                onChange={e => setForm(prev => ({ ...prev, vegetarian: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-3 bg-cream border border-cream-dark rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gold/50 focus:border-gold transition-all"
              />
            </div>
          </div>

          {/* Attendance & Gift Info */}
          <div className="space-y-4 pt-4 border-t border-cream-dark">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-wine/30 uppercase tracking-widest ml-1">出席狀態</label>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, attending: true }))}
                    className={cn(
                      "flex-1 py-3 rounded-lg border font-bold transition-all text-sm",
                      form.attending 
                        ? "bg-wine text-white border-wine shadow-sm" 
                        : "bg-cream border-cream-dark text-wine/40 hover:border-gold/50"
                    )}
                  >
                    會出席
                  </button>
                  <button 
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, attending: false }))}
                    className={cn(
                      "flex-1 py-3 rounded-lg border font-bold transition-all text-sm",
                      !form.attending 
                        ? "bg-wine text-white border-wine shadow-sm" 
                        : "bg-cream border-cream-dark text-wine/40 hover:border-gold/50"
                    )}
                  >
                    不克參加
                  </button>
                </div>
              </div>
              {!form.attending && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-wine/30 uppercase tracking-widest ml-1">紅包狀態</label>
                  <button 
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, redEnvelopeReceived: !prev.redEnvelopeReceived }))}
                    className={cn(
                      "w-full flex items-center justify-center gap-3 py-3 rounded-lg border font-bold transition-all text-sm",
                      form.redEnvelopeReceived 
                        ? "bg-emerald-500 border-emerald-500 text-white shadow-sm" 
                        : "bg-cream border-cream-dark text-wine/40 hover:border-gold/50"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-sm border flex items-center justify-center transition-all",
                      form.redEnvelopeReceived ? "bg-white text-emerald-500 border-white" : "bg-white border-cream-dark text-transparent"
                    )}>
                      <Check size={12} strokeWidth={4} />
                    </div>
                    {form.redEnvelopeReceived ? '已收到紅包' : '尚未收到紅包'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Gift Info */}
          <div className="space-y-4 pt-4 border-t border-cream-dark">
            <h3 className="text-xs font-bold text-wine/40 uppercase tracking-widest flex items-center gap-2">
              <Gift size={14} /> 喜餅管理
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-wine/30 uppercase tracking-widest ml-1">喜餅份數</label>
                <div className="flex items-center gap-3">
                  <button 
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, giftCount: Math.max(0, prev.giftCount - 1) }))}
                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-cream border border-cream-dark text-wine/60 hover:bg-cream-dark transition-all"
                  >
                    -
                  </button>
                  <input 
                    type="number" 
                    min="0"
                    value={form.giftCount}
                    onChange={e => setForm(prev => ({ ...prev, giftCount: parseInt(e.target.value) || 0 }))}
                    className="flex-1 px-4 py-3 bg-cream border border-cream-dark rounded-lg text-sm text-center font-mono font-bold focus:outline-none focus:ring-1 focus:ring-gold/50 focus:border-gold transition-all"
                  />
                  <button 
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, giftCount: prev.giftCount + 1 }))}
                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-cream border border-cream-dark text-wine/60 hover:bg-cream-dark transition-all"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-wine/30 uppercase tracking-widest ml-1">領取狀態</label>
                <button 
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, giftReceived: !prev.giftReceived }))}
                  className={cn(
                    "w-full flex items-center justify-center gap-3 py-3 rounded-lg border font-bold transition-all",
                    form.giftReceived 
                      ? "bg-gold border-gold text-white shadow-sm" 
                      : "bg-cream border-cream-dark text-wine/40 hover:border-gold/50"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-sm border flex items-center justify-center transition-all",
                    form.giftReceived ? "bg-white text-gold border-white" : "bg-white border-cream-dark text-transparent"
                  )}>
                    <Check size={12} strokeWidth={4} />
                  </div>
                  {form.giftReceived ? '已領取喜餅' : '尚未領取'}
                </button>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4 pt-4 border-t border-cream-dark">
            <h3 className="text-xs font-bold text-wine/40 uppercase tracking-widest">寄送資訊 (選填)</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-wine/30 uppercase tracking-widest ml-1">郵遞區號</label>
                <input 
                  type="text" 
                  value={form.zipCode}
                  onChange={e => setForm(prev => ({ ...prev, zipCode: e.target.value }))}
                  placeholder="100"
                  className="w-full px-5 py-3 bg-cream border border-cream-dark rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gold/50 focus:border-gold transition-all"
                />
              </div>
              <div className="md:col-span-3 space-y-2">
                <label className="text-[10px] font-bold text-wine/30 uppercase tracking-widest ml-1">詳細地址</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-wine/20" size={16} />
                  <input 
                    type="text" 
                    value={form.address}
                    onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="輸入詳細地址..."
                    className="w-full pl-12 pr-5 py-3 bg-cream border border-cream-dark rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gold/50 focus:border-gold transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-6">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-cream-dark text-wine/60 font-bold rounded-xl hover:bg-cream transition-all"
            >
              取消
            </button>
            <button 
              type="submit"
              className="flex-[2] py-4 bg-wine text-white font-bold rounded-xl shadow-lg hover:bg-wine/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Save size={18} />
              {isEditing ? '儲存修改' : '確認新增'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
