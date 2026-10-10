(function (root) {
  'use strict';
  const data = typeof module !== 'undefined' && module.exports ? require('./events.js') : root.SurvivalData;
  const { events, ids, suits } = data;
  const phases = ['ready', 'choice', 'roll', 'rolled', 'result', 'over'];
  const alive = s => s.phase !== 'over';
  function log(s, text) { s.log.push({ day: s.day, text }); }
  function newGame(name, stats, rng = Math.random) {
    if (Object.keys(stats).sort().join('') !== 'CDHS' || Object.values(stats).sort((a,b) => a-b).join(',') !== '-1,0,1,2') throw Error('능력치에 −1, 0, +1, +2를 한 번씩 배정해 주세요.');
    const deck = [...ids];
    for (let i = deck.length-1; i > 0; i--) { const j = Math.floor(rng() * (i+1)); [deck[i],deck[j]] = [deck[j],deck[i]]; }
    return { version: 1, name: String(name).trim().slice(0,24) || '이름 없는 생존자', stats: { ...stats }, food: 10, wounds: 0, day: 0, deck, hand: [], discard: [], removed: [], medkits: [], current: null, phase: 'ready', outcome: null, log: [{ day: 0, text: '식량 10을 챙겨 피난처로 향합니다.' }] };
  }
  function die(s) {
    if (s.wounds >= 5) { s.wounds = 5; s.phase = 'over'; s.outcome = 'lost'; log(s, '부상이 5에 도달했습니다. 이번 여정은 여기서 끝납니다.'); return true; }
    return false;
  }
  function finish(s) {
    const c = s.current;
    if (c.keep) { s.hand.push(c.id); if (c.medkit) s.medkits.push(c.id); log(s, `${label(c.id)} 카드를 보관했습니다.`); }
    else s.discard.push(c.id);
    s.current = null;
    s.phase = 'ready';
    if (die(s)) return;
    if (!s.deck.length) { s.phase = 'over'; s.outcome = 'won'; log(s, '마지막 길을 지나 피난처에 도착했습니다. 살아남았습니다!'); }
  }
  function label(id) { const e=events[id]; return `${suits[e.suit].symbol}${e.rank}`; }
  function effectSummary(e) {
    const out=[];
    if(e.food)out.push(`식량 ${e.food>0?'+':''}${e.food}`);
    if(e.wounds)out.push(`부상 +${e.wounds}`);
    if(e.heal)out.push(`부상 −${e.heal}`);
    if(e.draw)out.push(`손패 ${e.draw}장 획득`);
    if(e.skip)out.push(`여정 ${e.skip}장 단축`);
    if(e.keep)out.push('현재 카드 보관');
    return out.join(' · ') || '추가 자원 변화 없음';
  }
  function apply(s, e) {
    if (e.wounds) { s.wounds += e.wounds; log(s, `부상 +${e.wounds}`); if (die(s)) return; }
    if (e.food) { const before = s.food; s.food = Math.max(0, s.food + e.food); log(s, `식량 ${s.food-before>=0?'+':''}${s.food-before}`); }
    if (e.heal) { const n=Math.min(e.heal,s.wounds); s.wounds-=n; log(s, `부상을 ${n} 회복했습니다.`); }
    if (e.keep) s.current.keep = true;
    if (e.medkit) s.current.medkit = true;
    for (const [key, target] of [['draw','hand'],['skip','discard']]) if (e[key]) {
      const n = Math.min(e[key],s.deck.length);
      s[target].push(...s.deck.splice(0,n));
      log(s, key==='draw' ? `사건을 실행하지 않고 손패 ${n}장을 얻었습니다.` : `사건을 실행하지 않고 여정을 ${n}장 줄였습니다.`);
    }
  }
  function next(s) {
    if (s.phase !== 'ready') return false;
    if (!s.deck.length) { s.phase='over'; s.outcome='won'; return true; }
    s.day++;
    if (s.food > 0) { s.food--; log(s,'하루 식량 1을 먹었습니다.'); }
    else { s.wounds++; log(s,'식량이 없어 부상을 1 받았습니다.'); if(die(s))return true; }
    const id=s.deck.shift();
    s.current={ id, rolls:0, trades:0, keep:false, medkit:false, dice:null, bonus:0, modifier:null, result:null, pending:null };
    s.phase='choice'; log(s,`${label(id)} · ${events[id].title}`); return true;
  }
  function choices(s) {
    if(s.phase!=='choice')return [];
    const c=s.current, e=events[c.id];
    return e.actions.map(a=>({...a, disabled: (a.cost||0)>s.food}));
  }
  function choose(s, id) {
    const a=choices(s).find(x=>x.id===id && !x.disabled); if(!a)return false;
    if(a.cost){s.food-=a.cost;log(s,`선택 비용으로 식량 ${a.cost}을 썼습니다.`);}
    log(s,a.label);
    if(a.test){s.phase='roll';return true;}
    apply(s,a.effects);
    if(alive(s)){s.current.result=effectSummary(a.effects);s.current.pending='finish';s.phase='result';}
    return true;
  }
  function roll(s,rng=Math.random) {
    if(s.phase!=='roll')return false;
    const c=s.current;
    c.dice=[Math.floor(rng()*6)+1,Math.floor(rng()*6)+1]; c.modifier=s.stats[c.id[0]];c.bonus=0;c.rolls++;c.result=null;
    s.phase='rolled'; log(s,`${c.rolls}번째 판정: 주사위 ${c.dice.join(' + ')} / 능력치 ${c.modifier>=0?'+':''}${c.modifier}`);return true;
  }
  function total(s){const c=s.current;return c?.dice? c.dice[0]+c.dice[1]+c.modifier+c.bonus:null;}
  function tier(s){const n=total(s);return n===null?null:n<=6?0:n<=9?1:2;}
  function spend(s,id){const i=s.hand.indexOf(id);if(i<0)return false;s.hand.splice(i,1);s.medkits=s.medkits.filter(x=>x!==id);s.discard.push(id);return true;}
  function boost(s,id){if(s.phase!=='rolled'||!s.hand.includes(id))return false;const n=id[0]===s.current.id[0]?2:1;spend(s,id);s.current.bonus+=n;log(s,`${label(id)} 손패를 써서 판정 +${n}`);return true;}
  function resolve(s){
    if(s.phase!=='rolled')return false;
    const c=s.current,e=events[c.id],t=tier(s),result=e.outcomes[t];
    c.result=`${total(s)} · ${['실패','성공','큰 성공'][t]} — ${result.text}`;
    log(s,c.result); apply(s,result); if(!alive(s))return true;
    c.pending='finish';
    if(e.repeat==='until' && t===0)c.pending='roll';
    if(e.repeat==='three' && c.rolls<3)c.pending='roll';
    if(e.repeat==='twice' && t===0 && c.rolls<2)c.pending='roll';
    if(e.repeat==='search3' && c.rolls<3)c.pending='choice';
    s.phase='result';return true;
  }
  function proceed(s){if(s.phase!=='result')return false;const p=s.current.pending;if(p==='finish')finish(s);else{s.phase=p;s.current.dice=null;s.current.bonus=0;s.current.modifier=null;s.current.pending=null;}return true;}
  function trade(s,id){if(s.phase!=='choice'||s.current.id!=='H4'||s.current.trades>=2||!spend(s,id))return false;s.current.trades++;s.food+=2;log(s,`${label(id)} 손패를 팔아 식량 2를 받았습니다.`);return true;}
  function heal(s){if(!alive(s)||s.wounds<1||!s.medkits.includes('H2'))return false;spend(s,'H2');s.wounds--;log(s,'보관한 구급상자를 써서 부상 1을 회복했습니다.');return true;}
  function grow(s,suit){if(!alive(s)||s.discard.length<10||!(suit in suits)||s.stats[suit]>=3)return false;s.removed.push(...s.discard.splice(0,10));s.stats[suit]++;log(s,`버린 카드 10장을 제거해 ${suits[suit].stat} 능력치를 ${s.stats[suit]}로 올렸습니다. 현재 굴린 판정에는 소급하지 않습니다.`);return true;}
  function validate(s){
    const int=(n,min,max=100000)=>Number.isInteger(n)&&n>=min&&n<=max;
    if(!s||s.version!==1||!phases.includes(s.phase)||typeof s.name!=='string'||s.name.length>24||!int(s.food,0)||!int(s.wounds,0,5)||!int(s.day,0,52))throw Error('저장 형식이 올바르지 않습니다.');
    if(!s.stats||Object.keys(s.stats).sort().join('')!=='CDHS'||Object.values(s.stats).some(n=>!int(n,-1,3)))throw Error('능력치 저장 오류입니다.');
    for(const key of ['deck','hand','discard','removed','medkits'])if(!Array.isArray(s[key])||s[key].some(id=>!events[id]))throw Error('카드 저장 오류입니다.');
    const all=[...s.deck,...s.hand,...s.discard,...s.removed,...(s.current?[s.current.id]:[])];
    if(all.length!==52||new Set(all).size!==52||all.some(id=>!events[id]))throw Error('카드가 누락되거나 중복되어 있습니다.');
    if(!Array.isArray(s.log)||s.log.length>10000||s.log.some(x=>!int(x.day,0,52)||typeof x.text!=='string'||x.text.length>1000))throw Error('진행 기록 오류입니다.');
    if(s.medkits.some(id=>id!=='H2'||!s.hand.includes(id))||s.medkits.length>1)throw Error('구급상자 저장 오류입니다.');
    if(['choice','roll','rolled','result'].includes(s.phase)&&!s.current)throw Error('현재 사건이 없습니다.');
    if(s.phase==='ready'&&s.current)throw Error('진행 단계가 맞지 않습니다.');
    if(s.phase==='over'?!['won','lost'].includes(s.outcome):s.outcome!==null)throw Error('종료 상태 오류입니다.');
    if(s.phase==='over'&&s.outcome==='won'&&(s.deck.length||s.current||s.wounds>=5))throw Error('승리 상태 오류입니다.');
    if((s.wounds>=5)!==(s.outcome==='lost'))throw Error('부상 상태 오류입니다.');
    if(s.current){const c=s.current;if(!int(c.rolls,0)||!int(c.trades,0,2)||typeof c.keep!=='boolean'||typeof c.medkit!=='boolean'||!int(c.bonus,0,104))throw Error('사건 상태 오류입니다.');
      if(c.dice!==null&&(!Array.isArray(c.dice)||c.dice.length!==2||c.dice.some(n=>!int(n,1,6))||!int(c.modifier,-1,3)))throw Error('판정 저장 오류입니다.');
      if(s.phase==='rolled'&&(!c.dice||!events[c.id].outcomes))throw Error('진행 중 판정 오류입니다.');
      if(s.phase==='result'&&(!['finish','roll','choice'].includes(c.pending)||typeof c.result!=='string'))throw Error('결과 저장 오류입니다.');
    }
    return s;
  }
  function restore(raw){return validate(JSON.parse(raw));}
  const api={newGame,next,choices,choose,roll,total,tier,boost,resolve,proceed,trade,heal,grow,validate,restore,label,effectSummary};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SurvivalEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this);
