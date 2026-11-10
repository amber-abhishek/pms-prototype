/* Per-hall bed counts for the live year: the same figures Inventory › Occupancy shows on its hall tabs
   (it builds its HALLS from this list). Reports reads them from here so both screens tell one story. */
export type HallOcc = { id: string; hall: string; beds: number; res: number; arr: number; vac: number; blk: number };
export const HALL_OCC: HallOcc[] = [
  { id: 'ust', hall: 'Ustinov', beds: 600, res: 371, arr: 211, vac: 12, blk: 6 },
  { id: 'col', hall: 'Collingwood', beds: 481, res: 455, arr: 14, vac: 9, blk: 3 },
  { id: 'vm', hall: 'Van Mildert', beds: 557, res: 520, arr: 21, vac: 14, blk: 2 },
  { id: 'jb', hall: 'Josephine Butler', beds: 450, res: 398, arr: 40, vac: 10, blk: 2 },
  { id: 'stm', hall: 'St Mary’s', beds: 144, res: 139, arr: 2, vac: 3, blk: 0 },
];
/* 2025/26 is archived: only its final week is kept. Set so the year ends at 98.5% let, the occupancy
   Allocations › Cycles shows for 2025/26 (the report rounds it to a whole percent). */
export const HALL_OCC_2025: HallOcc[] = [
  { id: 'ust', hall: 'Ustinov', beds: 600, res: 591, arr: 0, vac: 3, blk: 6 },
  { id: 'col', hall: 'Collingwood', beds: 481, res: 474, arr: 0, vac: 4, blk: 3 },
  { id: 'vm', hall: 'Van Mildert', beds: 557, res: 549, arr: 0, vac: 6, blk: 2 },
  { id: 'jb', hall: 'Josephine Butler', beds: 450, res: 443, arr: 0, vac: 5, blk: 2 },
  { id: 'stm', hall: 'St Mary’s', beds: 144, res: 141, arr: 0, vac: 3, blk: 0 },
];
