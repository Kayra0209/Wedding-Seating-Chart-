import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  DndContext, 
  DragOverlay, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import { 
  sortableKeyboardCoordinates, 
  SortableContext,
  rectSortingStrategy,
  arrayMove
} from '@dnd-kit/sortable';
import { 
  Plus, 
  Download, 
  Upload,
  FileJson,
  FileSpreadsheet,
  Link as LinkIcon, 
  RefreshCw,
  Wine,
  Info,
  Settings as SettingsIcon,
  Trash2,
  LayoutDashboard,
  Mail,
  PieChart,
  Users,
  Baby,
  Leaf,
  Armchair,
  MapPin,
  Check,
  Copy,
  UserPlus,
  UserCheck,
  Edit,
  Edit2,
  Gift,
  Search,
  AlertCircle,
  ArrowRight,
  Map as MapIcon,
  Save,
  FileText
} from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { TableContainer } from './components/TableContainer';
import { GuestCard } from './components/GuestCard';
import { GuestFormModal } from './components/GuestFormModal';
import { FloorPlan } from './components/FloorPlan';
import { GuestGroup, Table, SeatingState } from './types';
import { parseCSVFromUrl } from './utils/csv';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DEFAULT_TABLE_CAPACITY = 10;
const INITIAL_TABLE_COUNT = 25;

export default function App() {
  const [state, setState] = useState<SeatingState>(() => {
    const saved = localStorage.getItem('wedding-seating-state');
    if (saved) return JSON.parse(saved);
    
    return {
      unassigned: [],
      tables: Array.from({ length: INITIAL_TABLE_COUNT }, (_, i) => ({
        id: `table-${i + 1}`,
        number: i + 1,
        guests: [],
        capacity: DEFAULT_TABLE_CAPACITY,
      })),
    };
  });

  const [csvUrl, setCsvUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [giftSearchQuery, setGiftSearchQuery] = useState('');
  const [giftTagFilter, setGiftTagFilter] = useState<string | null>(null);
  const [giftAttendanceFilter, setGiftAttendanceFilter] = useState<'attending' | 'not-attending'>('attending');
  const [invitationSearchQuery, setInvitationSearchQuery] = useState('');
  const [invitationTagFilter, setInvitationTagFilter] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [relationshipFilter, setRelationshipFilter] = useState('all');
  const [activeGuest, setActiveGuest] = useState<GuestGroup | null>(null);
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'seating' | 'floorplan' | 'invitations' | 'gifts' | 'settings'>('dashboard');
  const [isManualFormOpen, setIsManualFormOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<GuestGroup | null>(null);
  const [manualForm, setManualForm] = useState({ 
    name: '', 
    zipCode: '', 
    address: '',
    adults: 1,
    kids: 0,
    childChairs: 0,
    vegetarian: 0,
    relationship: '',
    attending: true,
    giftCount: 1,
    giftReceived: false,
    redEnvelopeReceived: false,
    isHandDelivered: false
  });

  const handleEditGuest = (guest: GuestGroup) => {
    setEditingGuest(guest);
    setManualForm({
      name: guest.name,
      zipCode: guest.zipCode || '',
      address: guest.address || '',
      adults: guest.adults,
      kids: guest.kids,
      childChairs: guest.childChairs,
      vegetarian: guest.vegetarian,
      relationship: guest.relationship || '',
      attending: guest.attending,
      giftCount: guest.giftCount ?? 1,
      giftReceived: guest.giftReceived || false,
      redEnvelopeReceived: guest.redEnvelopeReceived || false,
      isHandDelivered: guest.isHandDelivered || false
    });
    setIsManualFormOpen(true);
  };

  useEffect(() => {
    localStorage.setItem('wedding-seating-state', JSON.stringify(state));
  }, [state]);

  const handleSwapTables = (id1: string, id2: string) => {
    setState(prev => {
      const index1 = prev.tables.findIndex(t => t.id === id1);
      const index2 = prev.tables.findIndex(t => t.id === id2);
      
      if (index1 === -1 || index2 === -1) return prev;
      
      const newTables = [...prev.tables];
      const temp = { ...newTables[index1] };
      
      // Swap content but keep original structure if needed? 
      // Usually swapping means the tables literally switch spots in the list.
      // However, we want to keep the IDs and objects mostly intact, just swap their positions.
      newTables[index1] = { 
        ...newTables[index2], 
        number: temp.number // Keep the original number so the list reordering doesn't happen automatically by sort
      };
      newTables[index2] = { 
        ...temp, 
        number: prev.tables[index2].number // Keep the original number
      };
      
      // Better yet: just swap the number property to change their sorted order?
      // Since our FloorPlan sorts by number: .sort((a, b) => a.number - b.number)
      
      const t1 = prev.tables[index1];
      const t2 = prev.tables[index2];
      
      return {
        ...prev,
        tables: prev.tables.map(t => {
          if (t.id === id1) return { ...t, number: t2.number, name: t2.name, guests: t2.guests, capacity: t2.capacity };
          if (t.id === id2) return { ...t, number: t1.number, name: t1.name, guests: t1.guests, capacity: t1.capacity };
          return t;
        })
      };
    });
  };

  const allGuests = useMemo(() => {
    const tableGuests = state.tables.flatMap(t => t.guests);
    return [...state.unassigned, ...tableGuests];
  }, [state]);

  const uniqueTags = useMemo(() => {
    const tags = new Set<string>();
    allGuests.forEach(g => {
      if (g.relationship) tags.add(g.relationship);
    });
    return Array.from(tags).sort();
  }, [allGuests]);

  const filteredGiftGuests = useMemo(() => {
    return allGuests.filter(guest => {
      const matchesTag = !giftTagFilter || guest.relationship === giftTagFilter;
      const matchesSearch = !giftSearchQuery || 
        guest.name.toLowerCase().includes(giftSearchQuery.toLowerCase()) ||
        (guest.relationship && guest.relationship.toLowerCase().includes(giftSearchQuery.toLowerCase()));
      return matchesTag && matchesSearch;
    });
  }, [allGuests, giftTagFilter, giftSearchQuery]);

  const stats = useMemo(() => {
    const attending = allGuests.filter(g => g.attending);
    const invitationList = attending.filter(g => g.address && g.address.trim().length > 0);
    const totalSeated = state.tables.reduce((s, t) => s + t.guests.reduce((gs, g) => gs + g.total, 0), 0);
    const totalPeople = attending.reduce((s, g) => s + g.total, 0);
    const totalGifts = allGuests.reduce((s, g) => s + (g.giftCount ?? 1), 0);
    const receivedGifts = allGuests.filter(g => g.giftReceived).reduce((s, g) => s + (g.giftCount ?? 1), 0);
    
    const statsByRelationship = uniqueTags.map(tag => {
      const tagGuests = allGuests.filter(g => g.relationship === tag);
      const tagAttending = tagGuests.filter(g => g.attending);
      const tagInvitations = tagAttending.filter(g => g.address && g.address.trim().length > 0);
      const tagTotalGifts = tagGuests.reduce((s, g) => s + (g.giftCount ?? 1), 0);
      const tagReceivedGifts = tagGuests.filter(g => g.giftReceived).reduce((s, g) => s + (g.giftCount ?? 1), 0);
      
      return {
        tag,
        invitations: tagInvitations.length,
        preparedInvitations: tagInvitations.filter(g => g.isPrepared).length,
        gifts: tagTotalGifts,
        receivedGifts: tagReceivedGifts
      };
    });
    
    return {
      totalRespondents: attending.length,
      totalPeople,
      totalAdults: attending.reduce((s, g) => s + g.adults, 0),
      totalKids: attending.reduce((s, g) => s + g.kids, 0),
      totalChairs: attending.reduce((s, g) => s + g.childChairs, 0),
      totalVeg: attending.reduce((s, g) => s + g.vegetarian, 0),
      needInvitation: invitationList,
      sheetCount: invitationList.filter(g => g.source === 'sheet').length,
      manualCount: invitationList.filter(g => g.source === 'manual').length,
      totalSeated,
      totalUnassigned: state.unassigned.reduce((s, g) => s + g.total, 0),
      totalGifts,
      receivedGifts,
      seatingProgress: totalPeople > 0 ? Math.round((totalSeated / totalPeople) * 100) : 0,
      giftProgress: totalGifts > 0 ? Math.round((receivedGifts / totalGifts) * 100) : 0,
      invitationProgress: invitationList.length > 0 ? Math.round((invitationList.filter(g => g.isPrepared).length / invitationList.length) * 100) : 0,
      tablesCount: state.tables.length,
      activeTables: state.tables.filter(t => t.guests.length > 0).length,
      statsByRelationship
    };
  }, [allGuests, state, uniqueTags]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const filteredUnassigned = useMemo(() => {
    let filtered = state.unassigned;
    
    if (searchTerm) {
      filtered = filtered.filter(g => 
        g.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (relationshipFilter !== 'all') {
      filtered = filtered.filter(g => g.relationship === relationshipFilter);
    }
    
    return filtered;
  }, [state.unassigned, searchTerm, relationshipFilter]);

  const handleImport = async () => {
    if (!csvUrl) return;
    setIsImporting(true);
    console.log('handleImport triggered with URL:', csvUrl);
    try {
      const incomingGuests = await parseCSVFromUrl(csvUrl);
      console.log('CSV parsed successfully, guest count:', incomingGuests.length);
      if (incomingGuests.length === 0) {
        alert('匯入成功但沒有找到賓客資料。請檢查：\n1. 欄位名稱是否包含「姓名」、「是否出席」、「大人」、「兒童」\n2. 「是否出席」欄位內容應包含「準時」或「無法」');
      } else {
        const hasExistingData = state.unassigned.length > 0 || state.tables.some(t => t.guests.length > 0);
        console.log('Existing data check:', hasExistingData);
        
        if (hasExistingData) {
          const choice = window.confirm(
            '目前已有賓客資料。請選擇匯入方式：\n\n' +
            '【確定】：清除所有資料，重新匯入（適合名單大改）\n' +
            '【取消】：智慧同步（保留現有座位，僅更新資訊並補齊新賓客）'
          );
          
          if (choice) {
            console.log('User chose to REPLACE existing data');
            setState(prev => ({
              ...prev,
              unassigned: incomingGuests,
              tables: prev.tables.map(t => ({ ...t, guests: [] })),
            }));
            alert(`已清除舊資料，並成功匯入 ${incomingGuests.length} 筆新資料！`);
          } else {
            console.log('User chose SMART SYNC');
            setState(prev => {
              const currentUnassigned = [...prev.unassigned];
              const currentTables = prev.tables.map(t => ({ ...t, guests: [...t.guests] }));
              
              let addedCount = 0;
              let updatedCount = 0;

              incomingGuests.forEach(incoming => {
                let existingGuest: GuestGroup | undefined;
                let location: { type: 'unassigned' | 'table'; index: number; tableId?: string } | undefined;

                // Search in unassigned
                const unassignedIdx = currentUnassigned.findIndex(g => g.name === incoming.name);
                if (unassignedIdx !== -1) {
                  existingGuest = currentUnassigned[unassignedIdx];
                  location = { type: 'unassigned', index: unassignedIdx };
                } else {
                  // Search in tables
                  for (let i = 0; i < currentTables.length; i++) {
                    const tableGuestIdx = currentTables[i].guests.findIndex(g => g.name === incoming.name);
                    if (tableGuestIdx !== -1) {
                      existingGuest = currentTables[i].guests[tableGuestIdx];
                      location = { type: 'table', index: tableGuestIdx, tableId: currentTables[i].id };
                      break;
                    }
                  }
                }

                if (existingGuest && location) {
                  updatedCount++;
                  const updatedGuest = {
                    ...existingGuest,
                    ...incoming,
                    id: existingGuest.id, // Preserve ID
                    source: existingGuest.source // Preserve source (manual/sheet)
                  };

                  if (location.type === 'unassigned') {
                    currentUnassigned[location.index] = updatedGuest;
                  } else {
                    const tableIdx = currentTables.findIndex(t => t.id === location!.tableId);
                    currentTables[tableIdx].guests[location.index] = updatedGuest;
                  }
                } else {
                  currentUnassigned.push(incoming);
                  addedCount++;
                }
              });

              setTimeout(() => {
                alert(`智慧同步完成！\n\n- 新增賓客：${addedCount} 位\n- 更新資訊：${updatedCount} 位\n- 現有座位安排已完整保留。`);
              }, 100);

              return {
                ...prev,
                unassigned: currentUnassigned,
                tables: currentTables
              };
            });
          }
        } else {
          console.log('No existing data, direct import');
          setState(prev => ({
            ...prev,
            unassigned: incomingGuests,
          }));
          alert(`成功匯入 ${incomingGuests.length} 筆賓客資料！`);
        }
        
        setCsvUrl('');
      }
    } catch (error: any) {
      console.error('Import failed:', error);
      if (error.message === 'URL_IS_HTML') {
        alert('讀取失敗！這似乎是一個網頁而不是 CSV 檔案。\n\n請確保：\n1. 您的 Google Sheet 已設定為「任何人都可以查看」\n2. 您使用的是「檔案 > 共用 > 發布到網路」所產生的 CSV 網址，而不是一般的試算表網址。');
      } else {
        alert('匯入失敗，請檢查網址是否正確且已發布為 CSV 格式。');
      }
    } finally {
      setIsImporting(false);
    }
  };

  const handleAddTable = () => {
    setState(prev => ({
      ...prev,
      tables: [
        ...prev.tables,
        {
          id: `table-${prev.tables.length + 1}-${Date.now()}`,
          number: prev.tables.length + 1,
          guests: [],
          capacity: DEFAULT_TABLE_CAPACITY,
        },
      ],
    }));
  };

  const handleDeleteTable = (id: string) => {
    const table = state.tables.find(t => t.id === id);
    if (!table) return;
    
    if (table.guests.length > 0) {
      if (!window.confirm('此桌已有賓客，刪除後賓客將回到未分配列表。確定要刪除嗎？')) {
        return;
      }
    }

    setState(prev => {
      const updatedTables = prev.tables
        .filter(t => t.id !== id)
        .map((t: Table, index: number) => ({
          ...t,
          number: index + 1
        }));

      return {
        ...prev,
        unassigned: [...prev.unassigned, ...table.guests],
        tables: updatedTables,
      };
    });
  };

  const handleReset = () => {
    try {
      console.log('handleReset triggered');
      const confirmed = window.confirm('⚠️ 確定要重設所有資料嗎？\n這將會【清空所有賓客名單】以及【所有桌次的座位安排】，此動作無法復原。');
      
      if (confirmed) {
        console.log('Reset confirmed by user');
        const newState: SeatingState = {
          unassigned: [],
          tables: Array.from({ length: INITIAL_TABLE_COUNT }, (_, i) => ({
            id: `table-${i + 1}`,
            number: i + 1,
            guests: [],
            capacity: DEFAULT_TABLE_CAPACITY,
          })),
        };
        setState(newState);
        localStorage.removeItem('wedding-seating-state');
        console.log('State reset and localStorage cleared');
        alert('資料已成功清空。');
      } else {
        console.log('Reset cancelled by user');
      }
    } catch (err) {
      console.error('Reset failed:', err);
      alert('重設失敗，請重新整理頁面再試一次。');
    }
  };

  const handleExport = () => {
    const headers = ['桌號', '桌名', '賓客姓名', '大人', '兒童', '總人數', '兒童椅', '素食', '關係/標籤', '備註', '來源'];
    const rows: string[][] = [];

    state.tables.forEach(t => {
      t.guests.forEach(g => {
        rows.push([
          t.number.toString(),
          t.name || '',
          g.name,
          g.adults.toString(),
          g.kids.toString(),
          g.total.toString(),
          g.childChairs.toString(),
          g.vegetarian.toString(),
          g.relationship || '',
          g.note || '',
          g.source === 'sheet' ? '表單' : '手動'
        ]);
      });
      // Add a blank row between tables for readability
      if (t.guests.length > 0) rows.push([]);
    });

    // Add unassigned guests
    if (state.unassigned.length > 0) {
      rows.push(['---', '未分配', '', '', '', '', '', '', '', '', '']);
      state.unassigned.forEach(g => {
        rows.push([
          '未分配',
          '',
          g.name,
          g.adults.toString(),
          g.kids.toString(),
          g.total.toString(),
          g.childChairs.toString(),
          g.vegetarian.toString(),
          g.relationship || '',
          g.note || '',
          g.source === 'sheet' ? '表單' : '手動'
        ]);
      });
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `婚禮排座表-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Title
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text('婚禮座位安排表', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`匯出日期: ${new Date().toLocaleDateString()}`, pageWidth / 2, 28, { align: 'center' });

    let currentY = 40;

    state.tables.forEach((table) => {
      if (table.guests.length === 0) return;

      // Check if we need a new page
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(184, 158, 101); // Gold color
      doc.text(`第 ${table.number} 桌 ${table.name ? `(${table.name})` : ''}`, 14, currentY);
      currentY += 5;

      const tableData = table.guests.map(g => [
        g.name,
        g.adults.toString(),
        g.kids.toString(),
        g.total.toString(),
        g.vegetarian > 0 ? `素食 x${g.vegetarian}` : '-',
        g.relationship || '',
        g.note || ''
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['姓名', '大人', '兒童', '總計', '飲食', '關係', '備註']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [100, 30, 30], textColor: [255, 255, 255] }, // Wine color
        styles: { fontSize: 9, font: 'helvetica' },
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => {
          currentY = data.cursor?.y || currentY;
        }
      });

      currentY += 15;
    });

    // Unassigned
    if (state.unassigned.length > 0) {
      if (currentY > 230) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(150, 150, 150);
      doc.text('未分配賓客', 14, currentY);
      currentY += 5;

      const unassignedData = state.unassigned.map(g => [
        g.name,
        g.total.toString(),
        g.relationship || '',
        g.note || ''
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['姓名', '人數', '關係', '備註']],
        body: unassignedData,
        theme: 'grid',
        headStyles: { fillColor: [150, 150, 150] },
        styles: { fontSize: 9 },
        didDrawPage: (data) => {
          currentY = data.cursor?.y || currentY;
        }
      });
    }

    doc.save(`婚禮座位安排表-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleExportInvitations = () => {
    const headers = ['姓名', '郵遞區號', '收件地址', '關係/標籤', '大人', '兒童', '總人數', '備註'];
    const rows = stats.needInvitation.map(g => [
      g.name,
      g.zipCode || '',
      g.address || '',
      g.relationship || '',
      g.adults.toString(),
      g.kids.toString(),
      g.total.toString(),
      g.note || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `喜帖寄送名單-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleBackupJSON = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `婚禮排座備份-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRestoreJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedState = JSON.parse(content) as SeatingState;
        
        // Basic validation
        if (!importedState.tables || !importedState.unassigned) {
          throw new Error('無效的備份檔案格式');
        }

        if (window.confirm('確定要還原備份嗎？這將會覆蓋目前的進度。')) {
          setState(importedState);
          alert('還原成功！');
        }
      } catch (err) {
        console.error('Restore failed:', err);
        alert('還原失敗，請確保檔案格式正確。');
      }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
  };

  const handleDownloadTemplate = () => {
    const headers = ['姓名', '是否出席', '大人', '兒童', '兒童椅', '素食', '關係/標籤', '備註'];
    const example = ['王小明', '準時出席', '2', '1', '1', '0', '男方親戚', ''];
    const csvContent = [headers.join(','), example.join(',')].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `婚禮賓客名單範本.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyToClipboard = () => {
    const headers = ['桌號', '桌名', '姓名', '大人', '兒童', '總人數', '兒童椅', '素食', '關係/標籤', '備註'];
    const rows = state.tables.flatMap((table) => {
      return table.guests.map(guest => [
        table.number.toString(),
        table.name || '',
        guest.name,
        guest.adults.toString(),
        guest.kids.toString(),
        guest.total.toString(),
        guest.childChairs.toString(),
        guest.vegetarian.toString(),
        guest.relationship || '',
        guest.note || ''
      ].join('\t'));
    });

    const content = [headers.join('\t'), ...rows].join('\n');
    
    navigator.clipboard.writeText(content).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy:', err);
      alert('複製失敗，請手動匯出 CSV。');
    });
  };

  const handleUpdateTableName = (id: string, name: string) => {
    setState(prev => ({
      ...prev,
      tables: prev.tables.map(t => t.id === id ? { ...t, name } : t)
    }));
  };

  const handleUpdateTableCapacity = (id: string, capacity: number) => {
    setState(prev => ({
      ...prev,
      tables: prev.tables.map(t => t.id === id ? { ...t, capacity } : t)
    }));
  };

  const filteredInvitationGuests = useMemo(() => {
    return stats.needInvitation.filter(guest => {
      const matchesTag = !invitationTagFilter || guest.relationship === invitationTagFilter;
      const matchesSearch = !invitationSearchQuery || 
        guest.name.toLowerCase().includes(invitationSearchQuery.toLowerCase()) ||
        (guest.address && guest.address.toLowerCase().includes(invitationSearchQuery.toLowerCase())) ||
        (guest.relationship && guest.relationship.toLowerCase().includes(invitationSearchQuery.toLowerCase()));
      return matchesTag && matchesSearch;
    });
  }, [stats.needInvitation, invitationTagFilter, invitationSearchQuery]);

  const handleToggleGift = (id: string) => {
    setState(prev => ({
      ...prev,
      unassigned: prev.unassigned.map(g => {
        if (g.id === id) {
          // If not attending, must have red envelope to receive gift
          if (!g.attending && !g.redEnvelopeReceived && !g.giftReceived) return g;
          return { ...g, giftReceived: !g.giftReceived };
        }
        return g;
      }),
      tables: prev.tables.map(t => ({
        ...t,
        guests: t.guests.map(g => {
          if (g.id === id) {
            if (!g.attending && !g.redEnvelopeReceived && !g.giftReceived) return g;
            return { ...g, giftReceived: !g.giftReceived };
          }
          return g;
        })
      }))
    }));
  };

  const handleToggleHandDelivered = (id: string) => {
    setState(prev => ({
      ...prev,
      unassigned: prev.unassigned.map(g => 
        g.id === id ? { ...g, isHandDelivered: !g.isHandDelivered } : g
      ),
      tables: prev.tables.map(t => ({
        ...t,
        guests: t.guests.map(g => 
          g.id === id ? { ...g, isHandDelivered: !g.isHandDelivered } : g
        )
      }))
    }));
  };

  const handleToggleRedEnvelope = (id: string) => {
    setState(prev => ({
      ...prev,
      unassigned: prev.unassigned.map(g => {
        if (g.id === id) {
          const newValue = !g.redEnvelopeReceived;
          return { 
            ...g, 
            redEnvelopeReceived: newValue,
            giftReceived: !g.attending && !newValue ? false : g.giftReceived
          };
        }
        return g;
      }),
      tables: prev.tables.map(t => ({
        ...t,
        guests: t.guests.map(g => {
          if (g.id === id) {
            const newValue = !g.redEnvelopeReceived;
            return { 
              ...g, 
              redEnvelopeReceived: newValue,
              giftReceived: !g.attending && !newValue ? false : g.giftReceived
            };
          }
          return g;
        })
      }))
    }));
  };

  const handleUpdateGiftCount = (id: string, count: number) => {
    setState(prev => ({
      ...prev,
      unassigned: prev.unassigned.map(g => 
        g.id === id ? { ...g, giftCount: Math.max(0, count) } : g
      ),
      tables: prev.tables.map(t => ({
        ...t,
        guests: t.guests.map(g => 
          g.id === id ? { ...g, giftCount: Math.max(0, count) } : g
        )
      }))
    }));
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.guest) {
      setActiveGuest(active.data.current.guest as GuestGroup);
      setActiveTableId(null);
    } else if (active.data.current?.table) {
      setActiveTableId(active.id as string);
      setActiveGuest(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveGuest(null);
    setActiveTableId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Handle Table Reordering
    if (active.data.current?.table && over.data.current?.table) {
      if (activeId !== overId) {
        setState(prev => {
          const oldIndex = prev.tables.findIndex(t => t.id === activeId);
          const newIndex = prev.tables.findIndex(t => t.id === overId);
          const movedTables = arrayMove(prev.tables, oldIndex, newIndex);
          
          // Auto-update table numbers sequentially
          const updatedTables = movedTables.map((t: Table, index: number) => ({
            ...t,
            number: index + 1
          }));

          return {
            ...prev,
            tables: updatedTables
          };
        });
      }
      return;
    }

    // Handle Guest Movement
    const guestId = activeId;
    const destinationId = overId;

    // Find where the guest is currently
    let sourceTableId: string | null = null;
    let guestToMove: GuestGroup | null = null;

    // Check unassigned
    const unassignedIndex = state.unassigned.findIndex(g => g.id === guestId);
    if (unassignedIndex !== -1) {
      guestToMove = state.unassigned[unassignedIndex];
    } else {
      // Check tables
      for (const table of state.tables) {
        const index = table.guests.findIndex(g => g.id === guestId);
        if (index !== -1) {
          sourceTableId = table.id;
          guestToMove = table.guests[index];
          break;
        }
      }
    }

    if (!guestToMove) return;

    // Destination logic
    setState(prev => {
      const newState = { ...prev };

      // Remove from source
      if (sourceTableId) {
        newState.tables = newState.tables.map(t => 
          t.id === sourceTableId 
            ? { ...t, guests: t.guests.filter(g => g.id !== guestId) }
            : t
        );
      } else {
        newState.unassigned = newState.unassigned.filter(g => g.id !== guestId);
      }

      // Add to destination
      if (destinationId === 'unassigned-sidebar') {
        newState.unassigned = [...newState.unassigned, guestToMove!];
      } else {
        // If dropped over a table or a guest in a table
        let targetTableId = destinationId;
        
        // Check if dropped over a guest
        if (over.data.current?.guest) {
          // Find which table that guest belongs to
          for (const table of prev.tables) {
            if (table.guests.some(g => g.id === destinationId)) {
              targetTableId = table.id;
              break;
            }
          }
        }

        newState.tables = newState.tables.map(t => 
          t.id === targetTableId 
            ? { ...t, guests: [...t.guests, guestToMove!] }
            : t
        );
      }

      return newState;
    });
  };

  const handleTogglePrepared = (guestId: string) => {
    setState(prev => ({
      ...prev,
      unassigned: prev.unassigned.map(g => 
        g.id === guestId ? { ...g, isPrepared: !g.isPrepared } : g
      ),
      tables: prev.tables.map(t => ({
        ...t,
        guests: t.guests.map(g => 
          g.id === guestId ? { ...g, isPrepared: !g.isPrepared } : g
        )
      }))
    }));
  };

  const handleSaveManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.name) {
      alert('請填寫姓名');
      return;
    }

    const total = Number(manualForm.adults) + Number(manualForm.kids);

    if (editingGuest) {
      setState(prev => ({
        ...prev,
        unassigned: prev.unassigned.map(g => 
          g.id === editingGuest.id ? { ...g, ...manualForm, total } : g
        ),
        tables: prev.tables.map(t => ({
          ...t,
          guests: t.guests.map(g => 
            g.id === editingGuest.id ? { ...g, ...manualForm, total } : g
          )
        }))
      }));
      setEditingGuest(null);
      setIsManualFormOpen(false);
    } else {
      const newGuest: GuestGroup = {
        id: `manual-${Date.now()}`,
        ...manualForm,
        total,
        source: 'manual',
        isPrepared: false,
        relationship: manualForm.relationship || '手動新增'
      };
      setState(prev => ({
        ...prev,
        unassigned: [...prev.unassigned, newGuest]
      }));
      setIsManualFormOpen(false);
    }
    setManualForm({ 
      name: '', 
      zipCode: '', 
      address: '',
      adults: 1,
      kids: 0,
      childChairs: 0,
      vegetarian: 0,
      relationship: '',
      attending: true,
      giftCount: 1,
      giftReceived: false,
      redEnvelopeReceived: false
    });
  };

  const handleDeleteManual = (id: string) => {
    if (!window.confirm('確定要刪除此手動新增的賓客嗎？')) return;
    setState(prev => ({
      ...prev,
      unassigned: prev.unassigned.filter(g => g.id !== id),
      tables: prev.tables.map(t => ({
        ...t,
        guests: t.guests.filter(g => g.id !== id)
      }))
    }));
  };

  return (
    <div className="flex h-screen bg-stone-50 font-sans overflow-hidden">
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Sidebar */}
        <aside className={cn(
          "w-80 flex-shrink-0 shadow-2xl z-20 transition-all duration-500",
          currentView !== 'seating' && "w-0 opacity-0 pointer-events-none overflow-hidden"
        )}>
          <Sidebar 
            guests={filteredUnassigned} 
            totalPeople={stats.totalPeople}
            onSearch={setSearchTerm}
            onRelationshipFilter={setRelationshipFilter}
            onClearAll={handleReset}
            onEditGuest={handleEditGuest}
          />
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden relative bg-cream">
          {/* Header */}
          <header className="h-20 bg-white text-wine flex items-center justify-between px-8 border-b-2 border-gold z-10 shadow-sm">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-cream-dark flex items-center justify-center border border-cream-dark">
                  <Wine className="text-gold" size={24} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight font-serif">婚禮排座位系統</h1>
                  <p className="text-wine/50 text-[10px] uppercase tracking-widest font-medium">Wedding Seating Management</p>
                </div>
              </div>

              {/* Navigation */}
              <nav className="flex items-center bg-cream-dark p-1 rounded-xl border border-cream-dark">
                <button 
                  onClick={() => setCurrentView('dashboard')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                    currentView === 'dashboard' ? "bg-white text-gold shadow-sm" : "text-wine/60 hover:text-wine hover:bg-white/50"
                  )}
                >
                  <LayoutDashboard size={18} />
                  <span>儀表板</span>
                </button>
                <button 
                  onClick={() => setCurrentView('seating')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                    currentView === 'seating' ? "bg-white text-gold shadow-sm" : "text-wine/60 hover:text-wine hover:bg-white/50"
                  )}
                >
                  <Armchair size={18} />
                  <span>座位安排</span>
                </button>
                <button 
                  onClick={() => setCurrentView('floorplan')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                    currentView === 'floorplan' ? "bg-white text-gold shadow-sm" : "text-wine/60 hover:text-wine hover:bg-white/50"
                  )}
                >
                  <MapIcon size={18} />
                  <span>平面圖</span>
                </button>
                <button 
                  onClick={() => setCurrentView('invitations')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                    currentView === 'invitations' ? "bg-white text-gold shadow-sm" : "text-wine/60 hover:text-wine hover:bg-white/50"
                  )}
                >
                  <Mail size={18} />
                  <span>喜帖寄送</span>
                </button>
                <button 
                  onClick={() => setCurrentView('gifts')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                    currentView === 'gifts' ? "bg-white text-gold shadow-sm" : "text-wine/60 hover:text-wine hover:bg-white/50"
                  )}
                >
                  <Gift size={18} />
                  <span>喜餅管理</span>
                </button>
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-2.5 rounded-xl bg-cream-dark hover:bg-cream text-wine/60 hover:text-wine transition-all border border-cream-dark"
                title="系統設定"
              >
                <SettingsIcon size={20} />
              </button>
            </div>
          </header>

          {/* Settings Modal */}
          <AnimatePresence>
            {isSettingsOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-8">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsSettingsOpen(false)}
                  className="absolute inset-0 bg-wine/60 backdrop-blur-sm"
                />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="relative w-full h-full md:h-[90vh] md:max-w-5xl bg-white rounded-none md:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                >
                  <div className="p-6 border-b border-cream-dark bg-cream flex justify-between items-center">
                    <h2 className="text-xl font-bold text-wine flex items-center gap-2">
                      <SettingsIcon size={24} className="text-gold" />
                      系統設定
                    </h2>
                    <button 
                      onClick={() => setIsSettingsOpen(false)}
                      className="p-2 hover:bg-cream-dark rounded-full transition-colors"
                    >
                      <Plus className="rotate-45 text-wine/40" size={24} />
                    </button>
                  </div>
                  <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      {/* Left Column: Import & Sync */}
                      <div className="space-y-8">
                        {/* Import Section */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-wine font-bold">
                            <LinkIcon size={18} className="text-gold" />
                            <h3 className="text-sm">匯入 Google Sheets 賓客名單</h3>
                            <div className="group relative ml-1">
                              <Info size={14} className="text-wine/20 cursor-help" />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-wine text-white text-[10px] rounded-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl leading-relaxed">
                                請至 Google Sheets 點選「檔案」{'>'}「共用」{'>'}「發布到網路」，選擇「整份文件」與「逗號分隔值 (.csv)」，再將產生的網址貼至下方。
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              value={csvUrl}
                              onChange={(e) => setCsvUrl(e.target.value)}
                              placeholder="貼上 Google Sheets CSV 網址..."
                              className="flex-1 px-4 py-2 bg-cream border border-cream-dark rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-gold/50 focus:border-gold transition-all"
                            />
                            <button 
                              onClick={handleImport}
                              disabled={isImporting || !csvUrl}
                              className="px-4 py-2 bg-wine text-white font-bold rounded-lg shadow-sm hover:bg-wine/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-xs"
                            >
                              {isImporting ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                              <span>匯入</span>
                            </button>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <p className="text-[10px] text-wine/40">
                              * 支援 Google Sheets 發布的 CSV 網址
                            </p>
                            <button 
                              onClick={handleDownloadTemplate}
                              className="text-[10px] text-gold hover:underline font-bold"
                            >
                              下載 CSV 範例範本
                            </button>
                          </div>
                        </div>

                        <div className="h-px bg-cream-dark" />

                        <div className="space-y-4">
                          <h3 className="text-sm font-bold text-wine/80 uppercase tracking-widest flex items-center gap-2">
                            <FileJson size={18} className="text-gold" />
                            資料同步與備份
                          </h3>
                          <p className="text-[10px] text-wine/40 leading-relaxed bg-wine/5 p-3 rounded-lg">
                            💡 提示：若要在不同裝置同步進度，請先在原裝置點擊「備份進度」下載檔案，再到新裝置點擊「還原進度」上傳該檔案即可。
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={() => {
                                handleBackupJSON();
                                setIsSettingsOpen(false);
                              }}
                              className="flex flex-col items-center justify-center gap-2 py-4 bg-gold/5 hover:bg-gold/10 text-gold rounded-xl font-bold transition-all border border-gold/20"
                            >
                              <FileJson size={24} />
                              <span className="text-xs">備份進度 (JSON)</span>
                            </button>
                            <button
                              onClick={() => {
                                fileInputRef.current?.click();
                              }}
                              className="flex flex-col items-center justify-center gap-2 py-4 bg-cream hover:bg-cream-dark text-wine rounded-xl font-bold transition-all border border-cream-dark"
                            >
                              <Upload size={24} />
                              <span className="text-xs">還原進度 (JSON)</span>
                            </button>
                            <input 
                              type="file"
                              ref={fileInputRef}
                              onChange={handleRestoreJSON}
                              accept=".json"
                              className="hidden"
                            />
                          </div>

                          <button
                            onClick={() => {
                              handleExport();
                              setIsSettingsOpen(false);
                            }}
                            className="w-full flex items-center justify-center gap-2 py-4 bg-cream hover:bg-cream-dark text-wine rounded-xl font-bold transition-all border border-cream-dark"
                          >
                            <FileSpreadsheet size={20} />
                            匯出座位安排 (CSV)
                          </button>

                          <button
                            onClick={() => {
                              handleExportPDF();
                              setIsSettingsOpen(false);
                            }}
                            className="w-full flex items-center justify-center gap-2 py-4 bg-cream hover:bg-cream-dark text-wine rounded-xl font-bold transition-all border border-cream-dark"
                          >
                            <FileText size={20} />
                            匯出座位安排 (PDF)
                          </button>

                          <button
                            onClick={handleCopyToClipboard}
                            className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold transition-all border ${
                              isCopied 
                                ? 'bg-emerald/10 border-emerald text-emerald' 
                                : 'bg-cream hover:bg-cream-dark text-wine border-cream-dark'
                            }`}
                          >
                            {isCopied ? <Check size={20} /> : <Copy size={20} />}
                            {isCopied ? '已複製到剪貼簿' : '複製座位表 (可直接貼上 Excel)'}
                          </button>
                        </div>
                      </div>

                      {/* Right Column: System Info & Danger Zone */}
                      <div className="space-y-8">
                        <div className="p-6 bg-cream rounded-xl border border-cream-dark space-y-6">
                          <div>
                            <h3 className="text-[10px] font-bold text-wine/30 uppercase tracking-widest mb-3">統計資訊</h3>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-white p-4 rounded-lg border border-cream-dark shadow-sm">
                                <span className="block text-[10px] text-wine/30 font-bold uppercase mb-1">總填表人數</span>
                                <span className="text-2xl font-bold text-wine">{stats.totalRespondents}</span>
                              </div>
                              <div className="bg-white p-4 rounded-lg border border-cream-dark shadow-sm">
                                <span className="block text-[10px] text-wine/30 font-bold uppercase mb-1">總桌數</span>
                                <span className="text-2xl font-bold text-wine/60">{state.tables.length}</span>
                              </div>
                            </div>
                          </div>

                          <div className="h-px bg-cream-dark" />

                          <div>
                            <h3 className="text-[10px] font-bold text-wine/30 uppercase tracking-widest mb-3">系統資訊</h3>
                            <div className="space-y-2">
                              <div className="flex justify-between text-[10px]">
                                <span className="text-wine/40">版本</span>
                                <span className="text-wine/60 font-mono">v1.3.1</span>
                              </div>
                              <div className="flex justify-between text-[10px]">
                                <span className="text-wine/40">最後更新</span>
                                <span className="text-wine/60 font-mono">2024-03-11</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h3 className="text-sm font-bold text-red-500 uppercase tracking-widest flex items-center gap-2">
                            <Trash2 size={18} />
                            危險區域
                          </h3>
                          <div className="p-6 border border-red-200 bg-red-50 rounded-xl space-y-4">
                            <p className="text-xs text-red-600 leading-relaxed">
                              重設動作將會清除所有賓客資料、座位安排與系統設定。此動作無法復原，請務必先備份資料。
                            </p>
                            <button
                              onClick={() => {
                                handleReset();
                                setIsSettingsOpen(false);
                              }}
                              className="w-full flex items-center justify-center gap-2 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all shadow-sm"
                            >
                              <Trash2 size={18} />
                              立即重設所有資料
                            </button>
                          </div>

                          <button
                            onClick={() => {
                              if (window.confirm('⚠️ 這是強制重設，將會清除所有快取並重新整理頁面。確定嗎？')) {
                                localStorage.clear();
                                window.location.reload();
                              }
                            }}
                            className="w-full flex items-center justify-center gap-2 py-2 text-[10px] text-wine/30 hover:text-gold transition-all"
                          >
                            <RefreshCw size={12} />
                            遇到問題？嘗試強制重新整理
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-cream border-t border-cream-dark text-center">
                    <p className="text-[10px] text-wine/20 font-medium tracking-widest uppercase">Wedding Seating Chart Management System</p>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Guest Edit Modal */}
          <AnimatePresence>
            <GuestFormModal 
              isOpen={isManualFormOpen}
              onClose={() => {
                setIsManualFormOpen(false);
                setEditingGuest(null);
                setManualForm({ 
                  name: '', 
                  zipCode: '', 
                  address: '',
                  adults: 1,
                  kids: 0,
                  childChairs: 0,
                  vegetarian: 0,
                  relationship: '',
                  attending: true,
                  giftCount: 1,
                  giftReceived: false,
                  isHandDelivered: false
                });
              }}
              onSubmit={handleSaveManual}
              form={manualForm}
              setForm={setManualForm}
              isEditing={!!editingGuest}
            />
          </AnimatePresence>

          {/* Canvas Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar relative">
            <AnimatePresence mode="wait">
              {currentView === 'seating' && (
                <motion.div 
                  key="seating"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="p-8"
                >


                  {/* Tables Grid */}
                  <div className="max-w-7xl mx-auto">
                    {/* Quick Stats Bar */}
                    <div className="flex flex-wrap items-center gap-4 mb-6 bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-cream-dark shadow-sm">
                      <div className="flex items-center gap-3 px-4 py-2 bg-wine/5 rounded-lg border border-wine/10">
                        <Users size={18} className="text-wine" />
                        <div>
                          <div className="text-[10px] text-wine/40 font-bold uppercase tracking-wider">總人數</div>
                          <div className="text-sm font-bold text-wine">{stats.totalPeople} <span className="text-[10px] font-normal opacity-50">人</span></div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 px-4 py-2 bg-gold/5 rounded-lg border border-gold/10">
                        <UserCheck size={18} className="text-gold" />
                        <div>
                          <div className="text-[10px] text-gold/40 font-bold uppercase tracking-wider">已排座</div>
                          <div className="text-sm font-bold text-gold">{stats.totalSeated} <span className="text-[10px] font-normal opacity-50">人</span></div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 px-4 py-2 bg-wine/5 rounded-lg border border-wine/10">
                        <UserPlus size={18} className="text-wine/40" />
                        <div>
                          <div className="text-[10px] text-wine/20 font-bold uppercase tracking-wider">未排座</div>
                          <div className="text-sm font-bold text-wine/60">{stats.totalUnassigned} <span className="text-[10px] font-normal opacity-50">人</span></div>
                        </div>
                      </div>

                      <div className="flex-1" />

                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-wine/40">
                          <Armchair size={14} />
                          <span className="text-xs font-medium">兒童椅: {stats.totalChairs}</span>
                        </div>
                        <div className="flex items-center gap-2 text-wine/40">
                          <Leaf size={14} />
                          <span className="text-xs font-medium">素食: {stats.totalVeg}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                      <SortableContext items={state.tables.map(t => t.id)} strategy={rectSortingStrategy}>
                        {state.tables.map((table) => (
                          <TableContainer 
                            key={table.id} 
                            table={table} 
                            onDelete={handleDeleteTable}
                            onUpdateName={handleUpdateTableName}
                            onUpdateCapacity={handleUpdateTableCapacity}
                            onEditGuest={handleEditGuest}
                          />
                        ))}
                      </SortableContext>
                      
                      {/* Add Table Button */}
                      <button 
                        onClick={handleAddTable}
                        className="flex flex-col items-center justify-center min-h-[280px] rounded-lg border border-dashed border-cream-dark bg-white text-wine/20 hover:border-gold/50 hover:bg-cream hover:text-gold transition-all group"
                      >
                        <div className="w-12 h-12 rounded-sm border border-dashed border-cream-dark flex items-center justify-center mb-3 group-hover:border-gold/50 group-hover:scale-110 transition-all">
                          <Plus size={24} />
                        </div>
                        <span className="font-bold">新增桌次</span>
                      </button>
                    </div>
                </div>
              </motion.div>
            )}

              {currentView === 'dashboard' && (
                <motion.div 
                  key="dashboard"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="p-12 max-w-7xl mx-auto"
                >
                  <div className="mb-12">
                    <h2 className="text-4xl font-bold text-wine font-serif mb-2">婚禮管理儀表板</h2>
                    <p className="text-wine/30 uppercase tracking-widest text-[10px] font-bold">Wedding Management Dashboard</p>
                  </div>

                  {/* KPI Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-cream-dark">
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-wine/5 rounded-xl text-wine">
                          <Users size={24} />
                        </div>
                        <span className="text-[10px] font-bold text-wine/30 uppercase tracking-wider">出席總人數</span>
                      </div>
                      <div className="text-3xl font-bold text-wine mb-1">{stats.totalPeople}</div>
                      <div className="text-xs text-wine/50">大人 {stats.totalAdults} / 兒童 {stats.totalKids}</div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-cream-dark">
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-gold/5 rounded-xl text-gold">
                          <Armchair size={24} />
                        </div>
                        <span className="text-[10px] font-bold text-gold/40 uppercase tracking-wider">座位安排進度</span>
                      </div>
                      <div className="text-3xl font-bold text-gold mb-1">{stats.seatingProgress}%</div>
                      <div className="w-full h-1.5 bg-gold/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gold" style={{ width: `${stats.seatingProgress}%` }} />
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-cream-dark">
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-wine/5 rounded-xl text-wine">
                          <Gift size={24} />
                        </div>
                        <span className="text-[10px] font-bold text-wine/30 uppercase tracking-wider">喜餅發放進度</span>
                      </div>
                      <div className="text-3xl font-bold text-wine mb-1">{stats.giftProgress}%</div>
                      <div className="w-full h-1.5 bg-wine/10 rounded-full overflow-hidden">
                        <div className="h-full bg-wine" style={{ width: `${stats.giftProgress}%` }} />
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-cream-dark">
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-gold/5 rounded-xl text-gold">
                          <Mail size={24} />
                        </div>
                        <span className="text-[10px] font-bold text-gold/40 uppercase tracking-wider">喜帖準備進度</span>
                      </div>
                      <div className="text-3xl font-bold text-gold mb-1">{stats.invitationProgress}%</div>
                      <div className="w-full h-1.5 bg-gold/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gold" style={{ width: `${stats.invitationProgress}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Reminders & Alerts */}
                    <div className="lg:col-span-2 space-y-6">
                      <div className="bg-white rounded-2xl shadow-sm border border-cream-dark overflow-hidden">
                        <div className="p-6 border-b border-cream-dark bg-cream/30 flex items-center justify-between">
                          <h3 className="font-bold text-wine flex items-center gap-2">
                            <AlertCircle size={18} className="text-gold" />
                            待辦提醒
                          </h3>
                        </div>
                        <div className="divide-y divide-cream-dark">
                          {stats.totalUnassigned > 0 && (
                            <div className="p-4 flex items-center justify-between hover:bg-cream/20 transition-colors">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-wine/5 flex items-center justify-center text-wine">
                                  <UserPlus size={20} />
                                </div>
                                <div>
                                  <div className="text-sm font-bold text-wine">尚未安排座位</div>
                                  <div className="text-xs text-wine/50">還有 {stats.totalUnassigned} 位賓客需要入座</div>
                                </div>
                              </div>
                              <button 
                                onClick={() => setCurrentView('seating')}
                                className="p-2 text-gold hover:bg-gold/5 rounded-lg transition-all"
                              >
                                <ArrowRight size={20} />
                              </button>
                            </div>
                          )}
                          {stats.needInvitation.filter(g => !g.isPrepared).length > 0 && (
                            <div className="p-4 flex items-center justify-between hover:bg-cream/20 transition-colors">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gold/5 flex items-center justify-center text-gold">
                                  <Mail size={20} />
                                </div>
                                <div>
                                  <div className="text-sm font-bold text-wine">喜帖尚未準備</div>
                                  <div className="text-xs text-wine/50">還有 {stats.needInvitation.filter(g => !g.isPrepared).length} 份喜帖待處理</div>
                                </div>
                              </div>
                              <button 
                                onClick={() => setCurrentView('invitations')}
                                className="p-2 text-gold hover:bg-gold/5 rounded-lg transition-all"
                              >
                                <ArrowRight size={20} />
                              </button>
                            </div>
                          )}
                          {stats.totalGifts - stats.receivedGifts > 0 && (
                            <div className="p-4 flex items-center justify-between hover:bg-cream/20 transition-colors">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-wine/5 flex items-center justify-center text-wine">
                                  <Gift size={20} />
                                </div>
                                <div>
                                  <div className="text-sm font-bold text-wine">喜餅尚未領取</div>
                                  <div className="text-xs text-wine/50">還有 {stats.totalGifts - stats.receivedGifts} 份喜餅待發放</div>
                                </div>
                              </div>
                              <button 
                                onClick={() => setCurrentView('gifts')}
                                className="p-2 text-gold hover:bg-gold/5 rounded-lg transition-all"
                              >
                                <ArrowRight size={20} />
                              </button>
                            </div>
                          )}
                          {stats.totalUnassigned === 0 && stats.invitationProgress === 100 && stats.giftProgress === 100 && (
                            <div className="p-12 text-center">
                              <div className="w-16 h-16 rounded-full bg-emerald/10 text-emerald flex items-center justify-center mx-auto mb-4">
                                <Check size={32} />
                              </div>
                              <div className="text-wine font-bold">太棒了！所有事項都已處理完畢</div>
                              <div className="text-xs text-wine/40 mt-1">您可以放心地迎接婚禮的到來</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="space-y-6">
                      <div className="bg-wine text-white rounded-2xl p-8 shadow-xl relative overflow-hidden">
                        <div className="relative z-10">
                          <h3 className="text-xl font-bold mb-4">快速操作</h3>
                          <div className="space-y-3">
                            <button 
                              onClick={() => setIsSettingsOpen(true)}
                              className="w-full flex items-center gap-3 p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-sm font-bold"
                            >
                              <Upload size={18} />
                              匯入賓客名單
                            </button>
                            <button 
                              onClick={() => {
                                setEditingGuest(null);
                                setManualForm({ 
                                  name: '', 
                                  zipCode: '', 
                                  address: '',
                                  adults: 1,
                                  kids: 0,
                                  childChairs: 0,
                                  vegetarian: 0,
                                  relationship: '',
                                  attending: true,
                                  giftCount: 1,
                                  giftReceived: false
                                });
                                setIsManualFormOpen(true);
                              }}
                              className="w-full flex items-center gap-3 p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-sm font-bold"
                            >
                              <UserPlus size={18} />
                              手動新增賓客
                            </button>
                            <button 
                              onClick={handleExport}
                              className="w-full flex items-center gap-3 p-3 bg-gold hover:bg-gold-dark rounded-xl transition-all text-sm font-bold text-white shadow-lg"
                            >
                              <Download size={18} />
                              匯出座位表 (CSV)
                            </button>
                            <button 
                              onClick={handleExportInvitations}
                              className="w-full flex items-center gap-3 p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-sm font-bold"
                            >
                              <FileSpreadsheet size={18} />
                              匯出喜帖名單 (CSV)
                            </button>
                            <button 
                              onClick={handleExportPDF}
                              className="w-full flex items-center gap-3 p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-sm font-bold"
                            >
                              <FileText size={18} />
                              匯出座位表 (PDF)
                            </button>
                          </div>
                        </div>
                        <Wine className="absolute -bottom-10 -right-10 text-white/5 w-48 h-48 rotate-12" />
                      </div>

                      <div className="bg-white rounded-2xl p-6 border border-cream-dark shadow-sm">
                        <h3 className="text-[10px] font-bold text-wine/30 uppercase tracking-widest mb-4">場地資訊</h3>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-wine/50">總桌數</span>
                            <span className="text-sm font-bold text-wine">{stats.tablesCount} 桌</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-wine/50">已使用桌數</span>
                            <span className="text-sm font-bold text-wine">{stats.activeTables} 桌</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-wine/50">平均每桌人數</span>
                            <span className="text-sm font-bold text-wine">
                              {stats.activeTables > 0 ? (stats.totalSeated / stats.activeTables).toFixed(1) : 0} 人
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {currentView === 'invitations' && (
                <motion.div 
                  key="invitations"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="p-12 max-w-7xl mx-auto"
                >
                  <div className="mb-12">
                    <h2 className="text-4xl font-bold text-wine font-serif mb-2">喜帖寄送管理</h2>
                    <p className="text-wine/30 uppercase tracking-widest text-[10px] font-bold">Wedding Invitation Management</p>
                  </div>

                  <div className="space-y-8">
                    {/* Category Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                      {stats.statsByRelationship.map(item => (
                        item.invitations > 0 && (
                          <div key={item.tag} className="bg-white p-3 rounded-xl border border-cream-dark shadow-sm hover:border-gold/50 transition-all">
                            <div className="text-[10px] text-wine/30 font-bold uppercase mb-1 truncate" title={item.tag}>{item.tag}</div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-lg font-bold text-wine">{item.invitations}</span>
                              <span className="text-[10px] text-wine/40">份</span>
                            </div>
                            <div className="mt-1 h-1 bg-cream-dark rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-emerald-500 transition-all" 
                                style={{ width: `${(item.preparedInvitations / item.invitations) * 100}%` }} 
                              />
                            </div>
                            <div className="flex justify-between text-[9px] mt-1 font-medium">
                              <span className="text-emerald-600">已備 {item.preparedInvitations}</span>
                              <span className="text-wine/30">{Math.round((item.preparedInvitations / item.invitations) * 100)}%</span>
                            </div>
                          </div>
                        )
                      ))}
                    </div>

                    <div className="flex flex-wrap justify-between items-end gap-6">
                      <div className="flex gap-4">
                        <div className="bg-white px-6 py-3 rounded-xl border border-cream-dark shadow-sm text-center">
                          <span className="block text-[10px] text-wine/30 font-bold uppercase mb-1">總份數</span>
                          <span className="text-2xl font-bold text-wine">{stats.needInvitation.length}</span>
                        </div>
                        <div className="bg-gold/10 px-6 py-3 rounded-xl border border-gold/20 shadow-sm text-center">
                          <span className="block text-[10px] text-gold font-bold uppercase mb-1">已準備</span>
                          <span className="text-2xl font-bold text-gold">{stats.needInvitation.filter(g => g.isPrepared).length}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-3 items-end">
                        <div className="flex flex-wrap gap-1.5 justify-end max-w-md">
                          <button
                            onClick={() => setInvitationTagFilter(null)}
                            className={cn(
                              "px-2.5 py-1 rounded-md text-[10px] font-bold transition-all border",
                              !invitationTagFilter
                                ? "bg-wine text-white border-wine"
                                : "bg-white text-wine/50 border-cream-dark hover:border-gold/50"
                            )}
                          >
                            全部
                          </button>
                          {uniqueTags.map(tag => (
                            <button
                              key={tag}
                              onClick={() => setInvitationTagFilter(tag)}
                              className={cn(
                                "px-2.5 py-1 rounded-md text-[10px] font-bold transition-all border",
                                invitationTagFilter === tag
                                  ? "bg-wine text-white border-wine"
                                  : "bg-white text-wine/50 border-cream-dark hover:border-gold/50"
                              )}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-wine/30" size={14} />
                            <input 
                              type="text"
                              placeholder="搜尋姓名或地址..."
                              value={invitationSearchQuery}
                              onChange={(e) => setInvitationSearchQuery(e.target.value)}
                              className="pl-9 pr-4 py-2 bg-white border border-cream-dark rounded-lg text-xs focus:outline-none focus:border-gold/50 w-64 shadow-sm"
                            />
                          </div>
                          <button 
                            onClick={handleExportInvitations}
                            className="flex items-center gap-2 px-4 py-2 bg-wine text-white rounded-lg text-xs font-bold hover:bg-wine/90 transition-all shadow-sm"
                          >
                            <Download size={14} />
                            匯出名單
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-cream-dark overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-cream border-b border-cream-dark">
                            <th className="px-8 py-3 text-wine/30 font-bold uppercase tracking-widest text-[10px] w-16">狀態</th>
                            <th className="px-8 py-3 text-wine/30 font-bold uppercase tracking-widest text-[10px] w-16">親送</th>
                            <th className="px-8 py-3 text-wine/30 font-bold uppercase tracking-widest text-[10px]">填表人姓名</th>
                            <th className="px-8 py-3 text-wine/30 font-bold uppercase tracking-widest text-[10px]">郵遞區號</th>
                            <th className="px-8 py-3 text-wine/30 font-bold uppercase tracking-widest text-[10px]">收件地址</th>
                            <th className="px-8 py-3 text-wine/30 font-bold uppercase tracking-widest text-[10px] text-right">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredInvitationGuests.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-8 py-12 text-center text-wine/20 italic">
                                {invitationSearchQuery || invitationTagFilter ? '找不到符合條件的賓客。' : '目前沒有需要寄送喜帖的賓客資料'}
                              </td>
                            </tr>
                          ) : (
                            filteredInvitationGuests.map((guest, idx) => (
                              <tr key={guest.id} className={cn(
                                "border-b border-cream-dark hover:bg-cream/50 transition-colors group",
                                idx === filteredInvitationGuests.length - 1 && "border-0",
                                guest.isPrepared && "bg-cream/30"
                              )}>
                                <td className="px-8 py-3">
                                  <button
                                    onClick={() => handleTogglePrepared(guest.id)}
                                    className={cn(
                                      "w-6 h-6 rounded-sm border flex items-center justify-center transition-all",
                                      guest.isPrepared 
                                        ? "bg-gold border-gold text-white" 
                                        : "bg-white border-cream-dark text-transparent hover:border-gold/50"
                                    )}
                                  >
                                    <Check size={14} strokeWidth={3} />
                                  </button>
                                </td>
                                <td className="px-8 py-3">
                                  <button
                                    onClick={() => handleToggleHandDelivered(guest.id)}
                                    className={cn(
                                      "w-6 h-6 rounded-sm border flex items-center justify-center transition-all",
                                      guest.isHandDelivered 
                                        ? "bg-wine border-wine text-white" 
                                        : "bg-white border-cream-dark text-transparent hover:border-wine/50"
                                    )}
                                  >
                                    <Check size={14} strokeWidth={3} />
                                  </button>
                                </td>
                                <td className={cn(
                                  "px-8 py-3 font-bold transition-all text-sm",
                                  guest.isPrepared ? "text-wine/20 line-through" : "text-wine"
                                )}>
                                  <div className="flex items-center gap-3">
                                    {guest.name}
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-tighter bg-cream-dark text-wine/30">
                                      {guest.relationship}
                                    </span>
                                  </div>
                                </td>
                                <td className={cn(
                                  "px-8 py-3 font-mono text-sm transition-all",
                                  guest.isPrepared ? "text-wine/10" : "text-wine/50"
                                )}>
                                  {guest.zipCode || '---'}
                                </td>
                                <td className={cn(
                                  "px-8 py-3 flex items-center gap-2 transition-all text-sm",
                                  guest.isPrepared ? "text-wine/10" : "text-wine/60"
                                )}>
                                  <MapPin size={14} className={cn("transition-all", guest.isPrepared ? "text-wine/5" : "text-wine/20")} />
                                  {guest.address}
                                </td>
                                <td className="px-8 py-3 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button 
                                      onClick={() => {
                                        const text = `${guest.zipCode ? `[${guest.zipCode}] ` : ''}${guest.address}\n${guest.name} 收`;
                                        navigator.clipboard.writeText(text);
                                        alert('已複製寄送資訊！');
                                      }}
                                      className={cn(
                                        "p-2 rounded-md transition-all",
                                        guest.isPrepared ? "text-wine/10" : "text-wine hover:bg-wine/5"
                                      )}
                                      title="複製寄送資訊"
                                    >
                                      <Copy size={18} />
                                    </button>
                                    <button 
                                      onClick={() => handleEditGuest(guest)}
                                      className="p-2 text-wine/30 hover:text-gold hover:bg-gold/5 rounded-md transition-all"
                                    >
                                      <Edit2 size={18} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}

              {currentView === 'gifts' && (
                <motion.div 
                  key="gifts"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="p-12 max-w-7xl mx-auto"
                >
                  <div className="mb-12">
                    <h2 className="text-4xl font-bold text-wine font-serif mb-2">喜餅領取管理</h2>
                    <p className="text-wine/30 uppercase tracking-widest text-[10px] font-bold">Wedding Gift Management</p>
                  </div>

                  <div className="space-y-8">
                    {/* Category Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                      {stats.statsByRelationship.map(item => (
                        item.gifts > 0 && (
                          <div key={item.tag} className="bg-white p-3 rounded-xl border border-cream-dark shadow-sm hover:border-gold/50 transition-all">
                            <div className="text-[10px] text-wine/30 font-bold uppercase mb-1 truncate" title={item.tag}>{item.tag}</div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-lg font-bold text-wine">{item.gifts}</span>
                              <span className="text-[10px] text-wine/40">份</span>
                            </div>
                            <div className="mt-1 h-1 bg-cream-dark rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gold transition-all" 
                                style={{ width: `${(item.receivedGifts / item.gifts) * 100}%` }} 
                              />
                            </div>
                            <div className="flex justify-between text-[9px] mt-1 font-medium">
                              <span className="text-gold">已領 {item.receivedGifts}</span>
                              <span className="text-wine/30">{Math.round((item.receivedGifts / item.gifts) * 100)}%</span>
                            </div>
                          </div>
                        )
                      ))}
                    </div>

                    <div className="flex flex-wrap justify-between items-end gap-6">
                      <div className="flex flex-col gap-4">
                        <div className="flex bg-cream p-1 rounded-xl border border-cream-dark w-fit">
                          <button
                            onClick={() => setGiftAttendanceFilter('attending')}
                            className={cn(
                              "px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                              giftAttendanceFilter === 'attending'
                                ? "bg-white text-wine shadow-sm"
                                : "text-wine/40 hover:text-wine/60"
                            )}
                          >
                            <Users size={16} />
                            出席
                          </button>
                          <button
                            onClick={() => setGiftAttendanceFilter('not-attending')}
                            className={cn(
                              "px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                              giftAttendanceFilter === 'not-attending'
                                ? "bg-white text-wine shadow-sm"
                                : "text-wine/40 hover:text-wine/60"
                            )}
                          >
                            <Mail size={16} />
                            不克參加
                          </button>
                        </div>
                        <div className="flex gap-4">
                          <div className="bg-white px-6 py-3 rounded-xl border border-cream-dark shadow-sm text-center">
                            <span className="block text-[10px] text-wine/30 font-bold uppercase mb-1">總喜餅數</span>
                            <span className="text-2xl font-bold text-wine">{stats.totalGifts}</span>
                          </div>
                          <div className="bg-gold/10 px-6 py-3 rounded-xl border border-gold/20 shadow-sm text-center">
                            <span className="block text-[10px] text-gold font-bold uppercase mb-1">已領取</span>
                            <span className="text-2xl font-bold text-gold">{stats.receivedGifts}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 items-end">
                        <div className="flex flex-wrap gap-1.5 justify-end max-w-md">
                          <button
                            onClick={() => setGiftTagFilter(null)}
                            className={cn(
                              "px-2.5 py-1 rounded-md text-[10px] font-bold transition-all border",
                              !giftTagFilter
                                ? "bg-wine text-white border-wine"
                                : "bg-white text-wine/50 border-cream-dark hover:border-gold/50"
                            )}
                          >
                            全部
                          </button>
                          {uniqueTags.map(tag => (
                            <button
                              key={tag}
                              onClick={() => setGiftTagFilter(tag)}
                              className={cn(
                                "px-2.5 py-1 rounded-md text-[10px] font-bold transition-all border",
                                giftTagFilter === tag
                                  ? "bg-wine text-white border-wine"
                                  : "bg-white text-wine/50 border-cream-dark hover:border-gold/50"
                              )}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-wine/30" size={14} />
                          <input 
                            type="text"
                            placeholder="搜尋姓名..."
                            value={giftSearchQuery}
                            onChange={(e) => setGiftSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-white border border-cream-dark rounded-lg text-xs focus:outline-none focus:border-gold/50 w-64 shadow-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {/* Filtered Category */}
                      <section className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-1 h-6 bg-gold rounded-full" />
                          <h3 className="text-lg font-bold text-wine">
                            {giftAttendanceFilter === 'attending' ? '出席 (現場發放)' : '不克參加 (額外領取/補發)'}
                          </h3>
                          <span className="px-2 py-0.5 bg-gold/10 text-gold text-[10px] font-bold rounded-sm">
                            {filteredGiftGuests.filter(g => giftAttendanceFilter === 'attending' ? g.attending : !g.attending).length} 位
                          </span>
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm border border-cream-dark overflow-hidden">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-cream border-b border-cream-dark">
                                {giftAttendanceFilter === 'not-attending' && (
                                  <th className="px-8 py-2 text-wine/30 font-bold uppercase tracking-widest text-[10px] w-16">紅包</th>
                                )}
                                <th className="px-8 py-2 text-wine/30 font-bold uppercase tracking-widest text-[10px] w-16">
                                  {giftAttendanceFilter === 'attending' ? '狀態' : '喜餅'}
                                </th>
                                <th className="px-4 py-2 text-wine/30 font-bold uppercase tracking-widest text-[10px] w-32">賓客姓名</th>
                                <th className="px-8 py-2 text-wine/30 font-bold uppercase tracking-widest text-[10px] w-32">數量</th>
                                <th className="px-8 py-2 text-wine/30 font-bold uppercase tracking-widest text-[10px]">關係/標籤</th>
                                <th className="px-8 py-2 text-wine/30 font-bold uppercase tracking-widest text-[10px] text-right">操作</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredGiftGuests.filter(g => giftAttendanceFilter === 'attending' ? g.attending : !g.attending).length === 0 ? (
                                <tr>
                                  <td colSpan={giftAttendanceFilter === 'attending' ? 5 : 6} className="px-8 py-8 text-center text-wine/20 italic text-sm">
                                    尚無符合條件的賓客。
                                  </td>
                                </tr>
                              ) : (
                                filteredGiftGuests.filter(g => giftAttendanceFilter === 'attending' ? g.attending : !g.attending).map((guest, idx, arr) => (
                                  <tr key={guest.id} className={cn(
                                    "border-b border-cream-dark hover:bg-cream/50 transition-colors group",
                                    idx === arr.length - 1 && "border-0",
                                    guest.giftReceived && "bg-cream/30",
                                    (guest.giftCount === 0) && "bg-stone-100 opacity-60"
                                  )}>
                                    {giftAttendanceFilter === 'not-attending' && (
                                      <td className="px-8 py-2">
                                        <button 
                                          onClick={() => handleToggleRedEnvelope(guest.id)}
                                          className={cn(
                                            "w-5 h-5 rounded-sm border flex items-center justify-center transition-all",
                                            guest.redEnvelopeReceived 
                                              ? "bg-emerald-500 border-emerald-500 text-white" 
                                              : "bg-white border-cream-dark text-transparent hover:border-emerald-500/50"
                                          )}
                                          title="收到紅包"
                                        >
                                          <Check size={12} strokeWidth={3} />
                                        </button>
                                      </td>
                                    )}
                                    <td className="px-8 py-2">
                                      <button 
                                        onClick={() => handleToggleGift(guest.id)}
                                        disabled={giftAttendanceFilter === 'not-attending' && !guest.redEnvelopeReceived}
                                        className={cn(
                                          "w-5 h-5 rounded-sm border flex items-center justify-center transition-all",
                                          guest.giftReceived 
                                            ? "bg-gold border-gold text-white" 
                                            : "bg-white border-cream-dark text-transparent hover:border-gold/50",
                                          giftAttendanceFilter === 'not-attending' && !guest.redEnvelopeReceived && "opacity-20 cursor-not-allowed"
                                        )}
                                        title={giftAttendanceFilter === 'not-attending' && !guest.redEnvelopeReceived ? "需先收到紅包才可發放" : "發放喜餅"}
                                      >
                                        <Check size={12} strokeWidth={3} />
                                      </button>
                                    </td>
                                    <td className={cn(
                                      "px-8 py-2 font-bold text-sm transition-all",
                                      guest.giftReceived ? "text-wine/20 line-through" : "text-wine"
                                    )}>
                                      <div className="flex items-center gap-2 max-w-[150px]">
                                        <span className="truncate" title={guest.name}>{guest.name}</span>
                                        {guest.redEnvelopeReceived && !guest.giftReceived && (
                                          <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-600 text-[9px] font-bold rounded-sm">
                                            待發放
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-8 py-2">
                                      <div className="flex items-center gap-2">
                                        <button 
                                          onClick={() => handleUpdateGiftCount(guest.id, (guest.giftCount ?? 1) - 1)}
                                          className="w-5 h-5 flex items-center justify-center rounded-full bg-cream-dark text-wine/40 hover:text-wine hover:bg-cream transition-all text-xs"
                                        >
                                          -
                                        </button>
                                        <span className="font-mono font-bold w-6 text-center text-sm">{guest.giftCount ?? 1}</span>
                                        <button 
                                          onClick={() => handleUpdateGiftCount(guest.id, (guest.giftCount ?? 1) + 1)}
                                          className="w-5 h-5 flex items-center justify-center rounded-full bg-cream-dark text-wine/40 hover:text-wine hover:bg-cream transition-all text-xs"
                                        >
                                          +
                                        </button>
                                      </div>
                                    </td>
                                    <td className="px-8 py-2 text-wine/50 text-xs">
                                      {guest.relationship}
                                    </td>
                                    <td className="px-8 py-2 text-right">
                                      <button 
                                        onClick={() => handleEditGuest(guest)}
                                        className="p-1.5 text-wine/30 hover:text-gold hover:bg-gold/5 rounded-md transition-all"
                                      >
                                        <Edit2 size={16} />
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    </div>
                  </div>
                </motion.div>
              )}

              {currentView === 'floorplan' && (
                <motion.div 
                  key="floorplan"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="h-full flex flex-col"
                >
                  <div className="p-8 pb-0 flex justify-between items-end">
                    <div>
                      <h2 className="text-4xl font-bold text-wine font-serif mb-2">場地平面圖</h2>
                      <p className="text-wine/30 uppercase tracking-widest text-[10px] font-bold">Wedding Floor Plan View</p>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => {
                          const element = document.querySelector('.floor-plan-container');
                          if (element) {
                            html2canvas(element as HTMLElement).then(canvas => {
                              const imgData = canvas.toDataURL('image/png');
                              const pdf = new jsPDF('p', 'mm', 'a4');
                              const imgProps = pdf.getImageProperties(imgData);
                              const pdfWidth = pdf.internal.pageSize.getWidth();
                              const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                              pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                              pdf.save(`婚禮平面圖-${new Date().toISOString().split('T')[0]}.pdf`);
                            });
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-gold text-white rounded-lg text-xs font-bold hover:bg-gold-dark transition-all shadow-sm"
                      >
                        <Download size={14} />
                        匯出平面圖 (PDF)
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden floor-plan-container">
                    <FloorPlan 
                      tables={state.tables} 
                      onSwapTables={handleSwapTables}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* Drag Overlay */}
        <DragOverlay dropAnimation={{
          sideEffects: defaultDropAnimationSideEffects({
            styles: {
              active: {
                opacity: '0.4',
              },
            },
          }),
        }}>
          {activeGuest ? (
            <GuestCard guest={activeGuest} isOverlay />
          ) : activeTableId ? (
            <div className="w-64 h-40 bg-white border-2 border-gold rounded-lg shadow-2xl opacity-80 flex items-center justify-center">
              <span className="font-bold text-wine">正在移動桌次 {state.tables.find(t => t.id === activeTableId)?.number}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}
