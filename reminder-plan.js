import {buildConfiguredReminderPlan} from './reminder-model.js';
// Pure local-time planner. Each dated alarm is recalculated on edits/app resume.
export const REMINDER_HORIZON_DAYS=56;
const localTime=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
function notificationId(key){let hash=2166136261;for(const c of key)hash=Math.imul(hash^c.charCodeAt(0),16777619);return 10000+((hash>>>0)%2000000000);}
export function buildReminderPlan(data,now=new Date()){
 if(data.reminders?.config)return buildConfiguredReminderPlan(data,now);
 const r=data.reminders||{};if(!r.nativeEnabled)return [];
 const seed=new Date(data.appointment),duration=Number(data.duration);if(!Number.isFinite(seed.getTime())||!Number.isFinite(duration)||duration<10||duration>240)return [];
 const end=new Date(now);end.setDate(end.getDate()+REMINDER_HORIZON_DAYS);const plan=[];
 const detail=session=>{if(session&&localTime(session)!==data.currentKey)return 'Open your preparation and talking points for this session.';const c=data.contexts?.[data.currentKey]||{};return (c.agenda||[]).slice(0,3).map(a=>a.text).join(' • ')||(c.tasks||[]).filter(t=>!t.done).slice(0,2).map(t=>t.title).join(' • ')||'Open your preparation and talking points.';};
 function add(kind,at,session){if(at<=now||at>end)return;const discreet=r.private!==false;const title=discreet?'A moment for yourself':kind==='debrief'?'A moment to debrief':kind==='practice'?'Pick up your chosen practice':'Your session is coming up';const body=discreet?'Your notes are ready when you are.':kind==='debrief'?'What stayed with you? Debrief your session, then choose what to prepare before next time.':kind==='practice'?'Return to the practice you chose. Open your notes to continue.':detail(session);plan.push({id:notificationId(kind+':'+at.getTime()),title,body:body.slice(0,1400),at,kind,sessionKey:session?localTime(session):data.currentKey,discreet});}
 let occurrence=new Date(seed);if(data.weekly){const weeks=Math.floor((now-seed)/(7*86400000));occurrence.setDate(seed.getDate()+weeks*7);while(occurrence.getTime()+duration*60000<=now.getTime())occurrence.setDate(occurrence.getDate()+7);}
 let count=0;while(occurrence<=end&&count++<20){if(r.debrief)add('debrief',new Date(occurrence.getTime()+duration*60000),occurrence);if(r.brief)add('prep',new Date(occurrence.getTime()-Number(r.lead||30)*60000),occurrence);if(!data.weekly)break;occurrence.setDate(occurrence.getDate()+7);}
 const weekdays=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];if(r.practice){const [h,m]=String(r.practiceTime||'18:00').split(':').map(Number);if(Number.isInteger(h)&&h>=0&&h<=23&&Number.isInteger(m)&&m>=0&&m<=59){const day=new Date(now);day.setHours(h,m,0,0);for(let i=0;i<=REMINDER_HORIZON_DAYS;i++){const withinTherapy=data.weekly||day<=seed;if(withinTherapy&&(r.practiceDays||[]).includes(weekdays[day.getDay()])){const next=new Date(seed);if(data.weekly){const weeks=Math.floor((day-next)/(7*86400000));next.setDate(next.getDate()+weeks*7);while(next<=day)next.setDate(next.getDate()+7);}add('practice',new Date(day),next);}day.setDate(day.getDate()+1);}}}
 const seen=new Set();return plan.filter(p=>{if(seen.has(p.id))return false;seen.add(p.id);return true;}).sort((a,b)=>a.at-b.at);
}
