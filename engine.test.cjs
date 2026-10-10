const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('./engine.js'),D=require('./events.js');
const baseStats={S:1,H:0,C:2,D:-1};
function rng(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function fixture(id){const s=E.newGame('검증 생존자',baseStats,rng(1));s.deck=[id,...s.deck.filter(x=>x!==id)];s.food=11;E.next(s);s.stats[id[0]]=0;s.wounds=2;return s;}
function moveToHand(s,id){s.deck.splice(s.deck.indexOf(id),1);s.hand.push(id);}
function snapshot(s){E.validate(s);const raw=JSON.stringify(s);assert.deepEqual(E.restore(raw),s);return raw;}
function diff(s,b){return {food:s.food-b.food,wounds:s.wounds-b.wounds,draw:s.hand.length-b.hand,skip:s.discard.length-b.discard,keep:s.current.keep};}
function expected(v){return {food:0,wounds:0,draw:0,skip:0,keep:false,...v};}
// 원본 카드 문서에서 별도로 옮긴 기대값. 배열은 실패 / 성공 / 큰 성공.
const oracle={
 S2:[{}, {food:2,draw:1,keep:true},{food:3,draw:1,keep:true}],
 S3:[{wounds:1},{food:2},{food:3}], S6:[{},{food:3,draw:1},{food:4,draw:1}],
 S7:[{wounds:1},{},{draw:1}], S8:[{wounds:1},{wounds:1,food:3},{food:3}],
 SJ:[{food:-1},{food:1},{food:2}],SQ:[{wounds:1},{food:1},{food:2,draw:1}],
 SK:[{wounds:2},{food:-1},{}],SA:[{},{food:3},{food:3,draw:1}],
 H3:[{},{food:1},{food:1,draw:1}],H7:[{wounds:1},{},{food:1}],H8:[{wounds:1},{},{food:1}],
 HQ:[{},{food:1,skip:1},{food:1,skip:1,keep:true}],HK:[{},{food:1,keep:true},{food:1,keep:true,draw:1}],
 C2:[{wounds:1},{},{food:1}],C3:[{wounds:1},{food:2},{food:2,keep:true}],
 C6:[{},{food:1},{food:3}],C7:[{wounds:1},{},{draw:1}],C8:[{wounds:1},{},{draw:2}],
 CJ:[{wounds:1},{food:1},{food:1,keep:true}],CQ:[{wounds:1},{},{}],CK:[{wounds:1},{},{keep:true}],
 D3:[{},{skip:1},{skip:2}],D6:[{wounds:1},{},{keep:true}],D7:[{wounds:1},{},{draw:1}],
 D8:[{},{skip:1},{skip:2}],DJ:[{},{food:3},{food:3,draw:1}],DK:[{food:-1},{},{keep:true}]
};
test('52장과 네 무늬의 구성, 28개 판정 사건 대조',()=>{
 assert.equal(D.ids.length,52);assert.equal(new Set(D.ids).size,52);
 for(const k of Object.keys(D.suits))assert.equal(D.ids.filter(id=>id[0]===k).length,13);
 assert.deepEqual(Object.keys(oracle).sort(),D.ids.filter(id=>D.events[id].outcomes).sort());
 assert.throws(()=>E.newGame('',{S:1,H:1,C:2,D:-1}));
});
for(const [id,rows] of Object.entries(oracle))for(let t=0;t<3;t++)test(`${id} ${['실패','성공','큰 성공'][t]} 자원·보상`,()=>{
 const s=fixture(id);assert(E.choose(s,'test'));const before={food:s.food,wounds:s.wounds,hand:s.hand.length,discard:s.discard.length};
 // 합 2, 8, 12. 능력치 0인 독립 기대 결과.
 E.roll(s,()=>[0,0.5,0.999][t]);assert.equal(E.tier(s),t);snapshot(s);E.resolve(s);
 assert.deepEqual(diff(s,before),expected(rows[t]));snapshot(s);
});
const fixed={S4:{keep:true},S5:{food:2},S9:{keep:true},S10:{food:2,draw:1},H6:{keep:true},H9:{wounds:-1,keep:true},HA:{keep:true},C4:{keep:true},C5:{food:2},C9:{keep:true},C10:{food:2,draw:1},CA:{food:1,draw:1,keep:true},D2:{skip:3},D4:{keep:true},D5:{food:2},D9:{keep:true},D10:{keep:true}};
for(const [id,value] of Object.entries(fixed))test(`${id} 판정 없는 사건`,()=>{const s=fixture(id),b={food:s.food,wounds:s.wounds,hand:0,discard:0};E.choose(s,'take');assert.deepEqual(diff(s,b),expected(value));E.proceed(s);assert.equal(s.hand.includes(id),!!value.keep);snapshot(s);});
const choices={H2:{heal:{wounds:-1},save:{keep:true}},H4:{leave:{}},H5:{treat:{food:-1,wounds:-1},pass:{}},H10:{give:{food:-1,keep:true},pass:{}},HJ:{help:{food:1,draw:1},directions:{skip:3}},DQ:{heal:{wounds:-1},directions:{skip:2}},DA:{both:{wounds:-1,draw:2},heal:{wounds:-1},supplies:{draw:2},pass:{}},SK:{feed:{food:-2}}};
for(const [id,actions] of Object.entries(choices))for(const [a,value] of Object.entries(actions))test(`${id} 선택 ${a}`,()=>{const s=fixture(id),b={food:s.food,wounds:s.wounds,hand:0,discard:0};assert(E.choose(s,a));assert.deepEqual(diff(s,b),expected(value));E.proceed(s);snapshot(s);});
for(const id of ['S2','S3','S6','S8','SJ','SQ','H3','HQ','C3','CJ','D8'])test(`${id} 선택 포기`,()=>{const s=fixture(id);assert(E.choose(s,'pass'));E.proceed(s);assert.equal(s.food,10);assert.equal(s.wounds,2);assert.equal(s.hand.length,0);snapshot(s);});
test('턴 시작 식량 소비와 굶주림, 식량 0 즉시 부상 없음',()=>{
 const s=E.newGame('',baseStats,rng(2));s.food=1;E.next(s);assert.equal(s.food,0);assert.equal(s.wounds,0);
 const z=E.newGame('',baseStats,rng(2));z.food=0;z.wounds=4;const deck=[...z.deck];E.next(z);assert.equal(z.outcome,'lost');assert.deepEqual(z.deck,deck);snapshot(z);
});
test('비용 부족 차단, 식량 손실 최저 0, 부상 회복 최저 0',()=>{
 for(const id of ['S2','S6','D8']){const s=fixture(id);s.food=0;assert(!E.choose(s,'test'));assert.equal(s.phase,'choice');}
 const s=fixture('SJ');s.food=0;E.choose(s,'test');E.roll(s,()=>0);E.resolve(s);assert.equal(s.food,0);assert.equal(s.wounds,2);
 const h=fixture('H9');h.wounds=0;E.choose(h,'take');assert.equal(h.wounds,0);
});
test('손패 여러 장과 같은 무늬 보정, 확정 후 추가 사용 차단',()=>{
 const s=fixture('S7');moveToHand(s,'S4');moveToHand(s,'C4');E.choose(s,'test');E.roll(s,()=>0.3);assert.equal(E.total(s),4);
 E.boost(s,'S4');assert.equal(E.total(s),6);E.boost(s,'C4');assert.equal(E.total(s),7);snapshot(s);
 E.resolve(s);assert.equal(s.wounds,2);assert(!E.boost(s,'C4'));assert.equal(s.discard.length,2);
});
test('반복 사건 S7 C8은 실패 후 재판정, 성공 종료',()=>{for(const id of ['S7','C8']){const s=fixture(id);E.choose(s,'test');E.roll(s,()=>0);E.resolve(s);E.proceed(s);assert.equal(s.phase,'roll');E.roll(s,()=>0.5);E.resolve(s);E.proceed(s);assert.equal(s.phase,'ready');assert.equal(s.food,10);snapshot(s);}});
test('CQ CK 큰 성공 뒤에도 세 번, CK 보관 중복 없음',()=>{for(const id of ['CQ','CK']){const s=fixture(id);E.choose(s,'test');for(let i=1;i<=3;i++){E.roll(s,()=>0.999);E.resolve(s);E.proceed(s);assert.equal(s.phase,i<3?'roll':'ready');snapshot(s);}assert.equal(s.hand.filter(x=>x===id).length,id==='CK'?1:0);}});
test('SQ 수색 횟수 상한과 중도 포기',()=>{
 const s=fixture('SQ');for(let i=0;i<3;i++){E.choose(s,'test');E.roll(s,()=>0.5);E.resolve(s);E.proceed(s);}assert.equal(s.food,13);assert.equal(s.phase,'ready');
 const z=fixture('SQ');E.choose(z,'test');E.roll(z,()=>0.5);E.resolve(z);E.proceed(z);E.choose(z,'pass');E.proceed(z);assert.equal(z.food,11);snapshot(z);
});
test('DK 성공 조기 종료, 실패 최대 두 번',()=>{for(const success of [false,true]){const s=fixture('DK');E.choose(s,'test');E.roll(s,()=>success?0.5:0);E.resolve(s);E.proceed(s);if(!success){assert.equal(s.phase,'roll');E.roll(s,()=>0);E.resolve(s);E.proceed(s);}assert.equal(s.phase,'ready');assert.equal(s.food,success?10:8);}});
test('상인은 손패 최대 두 장만 거래',()=>{const s=fixture('H4');for(const id of ['S4','C4','D4'])moveToHand(s,id);assert(E.trade(s,'S4'));assert(E.trade(s,'C4'));assert(!E.trade(s,'D4'));assert.equal(s.food,14);assert.equal(s.discard.length,2);snapshot(s);});
test('보관한 구급상자 치료·소모, 보상으로 뽑은 카드는 사건 미실행',()=>{
 const s=fixture('H2');E.choose(s,'save');E.proceed(s);assert(E.heal(s));assert.equal(s.wounds,1);assert(!E.heal(s));assert(s.discard.includes('H2'));snapshot(s);
 const z=fixture('S10');z.deck=['H2',...z.deck.filter(id=>id!=='H2')];E.choose(z,'take');E.proceed(z);assert(z.hand.includes('H2'));assert(!E.heal(z));assert.equal(z.wounds,2);snapshot(z);
});
test('성장 제거·상한·이미 굴린 능력치 고정',()=>{
 const s=fixture('S7');s.discard.push(...s.deck.splice(0,20));E.choose(s,'test');E.roll(s,()=>0.5);const n=E.total(s);assert(E.grow(s,'S'));assert.equal(E.total(s),n);assert.equal(s.removed.length,10);assert.equal(s.stats.S,1);s.stats.C=3;assert(!E.grow(s,'C'));snapshot(s);
});
test('덱 부족 보상과 여정 단축, 마지막 사건 완료 전 승리하지 않음',()=>{for(const id of ['D2','DA']){const s=fixture(id);s.discard.push(...s.deck.splice(1));E.choose(s,id==='D2'?'take':'both');assert.equal(s.deck.length,0);assert.equal(s.phase,'result');assert.equal(s.outcome,null);E.proceed(s);assert.equal(s.outcome,'won');snapshot(s);}});
test('마지막 카드 반복 판정 중 사망은 패배, 자원 효과 중 부상 5 즉시 중단',()=>{
 const s=fixture('CK');s.discard.push(...s.deck.splice(0));s.wounds=4;E.choose(s,'test');E.roll(s,()=>0);E.resolve(s);assert.equal(s.outcome,'lost');snapshot(s);
 const z=fixture('S8');z.wounds=4;E.choose(z,'test');E.roll(z,()=>0.5);E.resolve(z);assert.equal(z.outcome,'lost');assert.equal(z.food,10);assert(!E.proceed(z));
});
test('종료 후 행동 차단, 저장 손상·중복·불가능 승리 차단',()=>{
 const s=fixture('S5');s.discard.push(...s.deck.splice(0));E.choose(s,'take');E.proceed(s);const raw=snapshot(s);for(const f of [()=>E.next(s),()=>E.roll(s),()=>E.resolve(s),()=>E.proceed(s),()=>E.heal(s),()=>E.grow(s,'S')])assert(!f());assert.equal(JSON.stringify(s),raw);
 const z=E.newGame('',baseStats);z.deck[1]=z.deck[0];assert.throws(()=>E.validate(z));assert.throws(()=>E.restore('{'));
 const q=E.newGame('',baseStats);q.phase='over';q.outcome='won';assert.throws(()=>E.validate(q));
});
test('판정 도중 저장·복원 후 확정과 보상은 정확히 한 번만 적용',()=>{
 const s=fixture('S2');E.choose(s,'test');E.roll(s,()=>0.999);const z=E.restore(snapshot(s));E.resolve(z);const f=z.food;assert(!E.resolve(z));assert.equal(z.food,f);const q=E.restore(snapshot(z));E.proceed(q);const cards=q.hand.length;assert(!E.proceed(q));assert.equal(q.hand.length,cards);snapshot(q);
});
test('500개 난수 여정: 모든 단계 52장 보존, 저장 재개, 교착 없이 승패',()=>{
 let won=0,lost=0,steps=0;
 for(let seed=1;seed<=500;seed++){
  const random=rng(seed);let s=E.newGame('모의 생존자',baseStats,random),n=0;
  while(s.phase!=='over'&&n++<3000){
   if(s.wounds>0&&s.medkits.length)E.heal(s);
   if(s.discard.length>=10){const k=Object.keys(s.stats).sort((a,b)=>s.stats[a]-s.stats[b])[0];E.grow(s,k);}
   if(s.phase==='ready')E.next(s);
   else if(s.phase==='choice'){
    if(s.current.id==='H4')for(const id of [...s.hand].slice(0,2))E.trade(s,id);
    const opts=E.choices(s).filter(a=>!a.disabled);
    let a=opts[Math.floor(random()*opts.length)];
    if(s.current.id==='H2')a=opts.find(a=>a.id==='save');
    E.choose(s,a.id);
   }else if(s.phase==='roll')E.roll(s,random);
   else if(s.phase==='rolled'){
    while(E.total(s)<7){const available=s.hand.filter(id=>!(s.current.pendingBoosts||[]).includes(id));if(!available.length)break;const id=available.find(id=>id[0]===s.current.id[0])||available[0];E.boost(s,id);}
    E.resolve(s);
   }else E.proceed(s);
   s=E.restore(snapshot(s));steps++;
  }
  assert(s.outcome,'진행 교착');if(s.outcome==='won')won++;else lost++;
 }
 assert(won>0&&lost>0);console.log(`모의 여정: 승리 ${won}, 패배 ${lost}, 검사한 단계 ${steps}`);
});

test('사용 예정 추가와 개별 취소는 손패 순서·경험·주사위를 바꾸지 않음',()=>{
 const s=fixture('S7');for(const id of ['S4','C4'])moveToHand(s,id);E.choose(s,'test');E.roll(s,()=>.3);
 const hand=[...s.hand],dice=[...s.current.dice],discard=[...s.discard];
 assert(E.boost(s,'S4'));assert(E.boost(s,'C4'));assert(!E.boost(s,'S4'));assert.equal(E.total(s),7);
 assert.deepEqual(s.hand,hand);assert.deepEqual(s.discard,discard);assert(E.cancelBoost(s,'S4'));assert.equal(E.total(s),5);
 assert(!E.cancelBoost(s,'S4'));assert(E.boost(s,'S4'));assert(E.cancelBoost(s,'C4'));assert(E.cancelBoost(s,'S4'));
 assert.equal(E.total(s),4);assert.deepEqual(s.current.dice,dice);assert.deepEqual(s.hand,hand);snapshot(s);
});
test('사용 예정 저장 재개 후 확정 때 한 번만 소비',()=>{
 let s=fixture('S7');for(const id of ['S4','C4'])moveToHand(s,id);E.choose(s,'test');E.roll(s,()=>.3);E.boost(s,'S4');E.boost(s,'C4');
 s=E.restore(snapshot(s));assert.equal(E.total(s),7);assert.deepEqual(s.current.pendingBoosts,['S4','C4']);
 assert(E.resolve(s));assert.equal(E.total(s),7);assert.deepEqual(s.hand,[]);assert.deepEqual(s.discard,['S4','C4']);assert.deepEqual(s.current.pendingBoosts,[]);
 assert(!E.resolve(s));assert(!E.cancelBoost(s,'S4'));snapshot(s);
});
test('사용 예정 구급상자 중복 치료 차단과 취소 후 치료',()=>{
 const s=fixture('S7');moveToHand(s,'H2');s.medkits.push('H2');E.choose(s,'test');E.roll(s,()=>.3);
 E.boost(s,'H2');assert(!E.heal(s));assert(s.medkits.includes('H2'));E.cancelBoost(s,'H2');assert(E.heal(s));assert.equal(E.total(s),4);assert(!E.boost(s,'H2'));snapshot(s);
});
test('사용 예정 카드는 확정 전 성장 재료에 포함되지 않음',()=>{
 const s=fixture('S7');moveToHand(s,'S4');s.discard.push(...s.deck.splice(0,9));E.choose(s,'test');E.roll(s,()=>.3);E.boost(s,'S4');assert(!E.grow(s,'S'));
 E.resolve(s);assert.equal(s.discard.length,10);assert(E.grow(s,'S'));snapshot(s);
});
test('이전 저장의 소비된 보정은 유지하고 새 사용 예정만 취소',()=>{
 let s=fixture('S7');moveToHand(s,'S4');moveToHand(s,'C4');E.choose(s,'test');E.roll(s,()=>.3);
 delete s.current.pendingBoosts;s.hand.splice(s.hand.indexOf('S4'),1);s.discard.push('S4');s.current.bonus=2;
 s=E.restore(snapshot(s));assert.equal(E.total(s),6);assert(!E.cancelBoost(s,'S4'));E.boost(s,'C4');assert.equal(E.total(s),7);E.cancelBoost(s,'C4');assert.equal(E.total(s),6);
 E.boost(s,'C4');E.resolve(s);assert.equal(E.total(s),7);assert.deepEqual(s.discard,['S4','C4']);snapshot(s);
});
test('사용 예정 중복·손패 밖 카드·잘못된 단계 저장 거부',()=>{
 const s=fixture('S7');moveToHand(s,'S4');E.choose(s,'test');E.roll(s,()=>.3);
 for(const pending of [['S4','S4'],['S7'],null]){const z=structuredClone(s);z.current.pendingBoosts=pending;assert.throws(()=>E.validate(z));}
 const z=structuredClone(s);z.phase='roll';z.current.pendingBoosts=['S4'];assert.throws(()=>E.validate(z));
});
test('반복 판정과 사망 결과에서도 사용 예정 소모는 완료됨',()=>{
 for(const lethal of [false,true]){const s=fixture('S7');moveToHand(s,'C4');s.wounds=lethal?4:2;E.choose(s,'test');E.roll(s,()=>0);E.boost(s,'C4');E.resolve(s);
 assert(s.discard.includes('C4'));assert.deepEqual(s.current.pendingBoosts,[]);snapshot(s);
 if(lethal)assert.equal(s.phase,'over');else{E.proceed(s);E.roll(s,()=>.5);assert.equal(E.total(s),8);assert.equal(E.pendingBonus(s),0);snapshot(s);}}
});
