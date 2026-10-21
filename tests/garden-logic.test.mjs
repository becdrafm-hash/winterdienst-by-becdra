import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newObject, planningWindow, nextAllowedDay, visitCost, inSeason, addDays } from '../src/garden/model.ts';
test('Bahnstraße respects Saturdays and three-to-four-week care window',()=>{
 const obj={...newObject(),allowedDays:[6],lastVisit:'2026-10-03'};
 const window=planningWindow(obj,[],'2026-10-21');
 assert.equal(window.start,'2026-10-24');assert.equal(window.end,'2026-10-31');
 assert.equal(nextAllowedDay(obj,'2026-10-25'),'2026-10-31');
});
test('winter pause surfaces spring preparation three weeks before April',()=>{
 const obj={...newObject(),seasonStart:4,seasonEnd:11};
 assert.equal(planningWindow(obj,[],'2026-12-01').label,'Saisonpause');
 const p=planningWindow(obj,[],'2027-03-15');assert.equal(p.reminder,'2027-03-11');assert.equal(p.label,'Saisonstart vorbereiten');
});
test('a newer recorded visit advances care window without completing follow-ups',()=>{
 const obj={...newObject(),lastVisit:'2026-09-01'};
 const p=planningWindow(obj,[{objectId:obj.id,end:'2026-10-17T10:07'}],'2026-10-21');
 assert.equal(p.start,'2026-11-07');
});
test('67 minutes round up to 1.25 hours for labor and machines',()=>{
 const cost=visitCost({start:'2026-10-17T09:00',end:'2026-10-17T10:07',hourlyRate:'40',machineRate:'5',machines:true,travelRate:'10',disposalTonnes:'0,1',disposalRate:'100'});
 assert.equal(cost.hours,1.25);assert.equal(cost.total,76.25);
 const without=visitCost({start:'2026-10-17T09:00',end:'2026-10-17T10:00',hourlyRate:'40',machineRate:'5',machines:false,travelRate:'0',disposalTonnes:'',disposalRate:''});
 assert.equal(without.hours,1);assert.equal(without.machines,0);
});
test('seasons spanning year boundary and lead time spanning February',()=>{
 const obj={...newObject(),seasonStart:11,seasonEnd:3};assert.equal(inSeason(obj,1),true);assert.equal(inSeason(obj,7),false);assert.equal(addDays('2028-03-01',-1),'2028-02-29');
});
