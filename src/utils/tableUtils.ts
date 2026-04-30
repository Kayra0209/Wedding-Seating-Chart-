import { Table } from '../types';

export const getTableStats = (table: Table) => {
  const currentTotal = table.guests.reduce((sum, g) => sum + g.total, 0);
  const totalChairs = table.guests.reduce((sum, g) => sum + g.childChairs, 0);
  const totalVeg = table.guests.reduce((sum, g) => sum + g.vegetarian, 0);
  
  const hasExtension = totalChairs > 0 || totalVeg > 0;
  const effectiveCapacity = hasExtension ? table.capacity + 1 : table.capacity;
  
  const isOverCapacity = currentTotal > effectiveCapacity;
  const isFull = currentTotal >= table.capacity;
  const occupancy = (currentTotal / table.capacity) * 100;
  
  return {
    currentTotal,
    totalChairs,
    totalVeg,
    effectiveCapacity,
    isOverCapacity,
    isFull,
    occupancy,
    hasExtension
  };
};
