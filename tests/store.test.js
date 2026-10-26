import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateRecord, identityHash } from '../public/catalog-core.js';
const source=readFileSync(new URL('../public/catalog-store.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/export async function/g,'async function');
const seed=JSON.parse(readFileSync(new URL('../data/attenuators_77.json',import.meta.url),'utf8')).records[0];
function harness(){
 const documents=new Map();let queue=Promise.resolve();
 const deps={validateRecord,identityHash,doc:(_db,col,id)=>`${col}/${id}`,serverTimestamp:()=>({type:'serverTimestamp'}),
  runTransaction:(_db,fn)=>{const run=queue.then(async()=>{const writes=[];const result=await fn({
    get:async ref=>({exists:()=>documents.has(ref),data:()=>documents.get(ref)}),set:(ref,data)=>writes.push([ref,data])
   });for(const [ref,data]of writes)documents.set(ref,data);return result;});queue=run.catch(()=>{});return run;}};
 const create=new Function(...Object.keys(deps),source+'\nreturn createIfAbsent;')(...Object.values(deps));
 return{create,documents};
}
test('transaction creates only once and does not overwrite metadata',async()=>{
 const{create,documents}=harness();assert.equal(await create({},seed),'created');
 assert.equal(await create({},{...seed,name:'Changed'}),'exists');assert.equal(documents.size,1);
 assert.equal([...documents.values()][0].name,seed.name);
});
test('concurrent requests with one key return created + exists',async()=>{
 const{create,documents}=harness();const outcomes=await Promise.all([create({},seed),create({},seed)]);
 assert.deepEqual(outcomes,['created','exists']);assert.equal(documents.size,1);
});
test('invalid confirmed record never reaches a write',async()=>{
 const{create,documents}=harness();await assert.rejects(create({},{...seed,references:[]}));assert.equal(documents.size,0);
});
