import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseRecords, preview, classify, validateRecord, identityHash, safeURL } from '../public/catalog-core.js';
const seed=JSON.parse(readFileSync(new URL('../data/attenuators_77.json',import.meta.url),'utf8'));
const records=parseRecords(JSON.stringify(seed));
test('77 records are valid and have unique stable keys and public IDs',async()=>{
 assert.equal(records.length,77);assert.equal(new Set(records.map(r=>r.id)).size,77);
 assert.equal(new Set(await Promise.all(records.map(r=>identityHash(r.identity_key)))).size,77);
});
test('initial import creates 77, repeated import skips all',()=>{
 assert.equal(preview(records,[]).filter(r=>r.status==='new').length,77);
 assert(preview(records,records).every(r=>r.status==='exists'));
});
test('duplicate within one input file is skipped',()=>{
 const plan=preview([records[0],records[0]],[]);assert.deepEqual(plan.map(r=>r.status),['new','exists']);
});
test('renaming metadata does not produce new identity',()=>{
 const r={...records[0],id:'NEW',name:'Renamed',mechanism:'Updated',signal:'Updated'};
 assert.equal(classify(r,records).status,'exists');
});
test('ykoK vs mgtE is blocked for manual review',()=>{
 const r={...records.find(r=>r.id==='TA065'),id:'TA999',identity_key:'different-key',target:'ykoK',aliases:[]};
 assert.equal(classify(r,records).status,'possible');
});
test('same target in another organism is not automatically merged',()=>{
 const r={...records[0],id:'TA999',identity_key:'new-key',organism:'Other species'};
 assert.equal(classify(r,records).status,'new');
});
test('existing public ID with changed identity is blocked',()=>{
 const r={...records[0],identity_key:'changed-key',organism:'Other species',target:'other'};
 assert.equal(classify(r,records).status,'possible');
});
test('candidate can lack experiments; confirmed cannot',()=>{
 const r={...records[0],status:'candidate',references:[],experimental_evidence:''};assert(validateRecord(r));
 assert.throws(()=>validateRecord({...r,status:'confirmed'}));
});
test('unsafe reference links and malformed JSON fail before writes',()=>{
 assert.equal(safeURL('javascript:alert(1)'),'');assert.equal(safeURL('http://example.com'),'');
 assert.throws(()=>parseRecords('{broken'));assert.throws(()=>parseRecords('[]'));
 assert.throws(()=>validateRecord({...records[0],references:[{title:'x',url:'javascript:alert(1)'}]}));
});
test('hash normalizes case and spacing in identity_key',async()=>{
 assert.equal(await identityHash('  V1|test  '),await identityHash('v1|test'));
});
