const fs=require('fs'),vm=require('vm'),assert=require('assert');
const elements=new Map();function el(s){if(!elements.has(s))elements.set(s,{innerHTML:'',textContent:'',className:'',classList:{toggle(){},contains(){return false}},content:'',isConnected:false});return elements.get(s)}
const memory=new Map([['meanwhile-v1',JSON.stringify({appointment:'2026-10-23T10:00',duration:60,weekly:true,notes:[{date:'2026-10-23T11:00',title:'Earlier',text:'Original debrief'}],tasks:[{title:'Preserve task',done:false}],thoughts:[{text:'Preserve thought',date:'2026-10-23'}],prep:'Preserve preparation',customSections:[]})]]);
const ctx=vm.createContext({console,Date,Math,JSON,Number,String,Array,Object,Set,Map,localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},document:{querySelector:el,querySelectorAll:()=>[],body:{classList:{toggle(){},contains(){return false}}},addEventListener(){}},window:{matchMedia:()=>({matches:false,addEventListener(){}})},navigator:{},setInterval:()=>0,clearInterval(){},setTimeout:()=>0,clearTimeout(){}});
for(const f of ['questions.js','app.js'])vm.runInContext(fs.readFileSync(require('path').join(__dirname,'..',f),'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
assert.equal(run('QUESTIONS.length'),155);assert.equal(run('new Set(QUESTIONS.map(q=>q.id)).size'),155);
assert.equal(run('context().tasks[0].title'),'Preserve task');assert.equal(run('context().thoughts[0].text'),'Preserve thought');assert.equal(run('context().prep'),'Preserve preparation');assert.equal(run('state.notes[0].text'),'Original debrief');
assert.equal(run("localTime(schedule(new Date('2026-10-23T10:30:00')).next)"),'2026-10-23T10:00');
assert.equal(run("localTime(schedule(new Date('2026-10-23T11:00:00')).next)"),'2026-10-30T10:00');
assert.equal(run("localTime(schedule(new Date('2026-10-25T12:00:00')).next)"),'2026-10-30T10:00');
run("state.about['selftrust-1']={value:'My private answer'};state.preferences.useProfile=false");assert.equal(run('buildAIContext().profile.length'),0);
run("state.preferences.useProfile=true;state.excludedCategories=['selftrust']");assert.equal(run('buildAIContext().profile.length'),0);
run("state.excludedCategories=[]");assert.equal(run('buildAIContext().profile.length'),1);
assert.equal(run("esc('<script>')"),'&lt;script&gt;');
run("state.weekly=false");assert.equal(run("schedule(new Date('2026-10-24T12:00')).next"),null);
console.log('Passed: legacy migration; weekly rollover and UK DST; one-off appointments; profile-context exclusions; 155 stable question IDs; HTML escaping.');
