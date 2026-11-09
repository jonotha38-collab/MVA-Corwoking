/** Pure booking time rules. Hourly slots returned by mva_room_availability contain no customer details. */
export type RoomSlot={booking_date:string;start_time:string;end_time:string;available:boolean;reason:string};
export const shortTime=(value:string)=>value.slice(0,5);
export const hourOf=(value:string)=>Number(value.slice(0,2));
export function contiguousEndOptions(slots:RoomSlot[],start:string):string[]{
 if(!slots.length)return [];
 const sameDay=slots.filter(s=>s.booking_date===slots[0].booking_date)
  .sort((a,b)=>a.start_time.localeCompare(b.start_time));
 const startIndex=sameDay.findIndex(s=>shortTime(s.start_time)===start&&s.available);
 if(startIndex<0)return [];
 const result:string[]=[];
 for(let i=startIndex;i<sameDay.length;i++){
  const item=sameDay[i];
  if(!item.available||(i>startIndex&&shortTime(sameDay[i-1].end_time)!==shortTime(item.start_time)))break;
  result.push(shortTime(item.end_time));
 }
 return result;
}
