export interface GuestGroup {
  id: string;
  name: string;
  adults: number;
  kids: number;
  total: number;
  attending: boolean;
  childChairs: number;
  vegetarian: number;
  address: string;
  zipCode: string;
  isPrepared?: boolean;
  source: 'sheet' | 'manual';
  relationship: string;
}

export interface Table {
  id: string;
  number: number;
  name?: string;
  guests: GuestGroup[];
  capacity: number;
}

export interface SeatingState {
  unassigned: GuestGroup[];
  tables: Table[];
}
