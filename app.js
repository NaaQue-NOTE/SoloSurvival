(function () {
  'use strict';
  const E=SurvivalEngine,D=SurvivalData,KEY='solo-survival-wasteland-v1';
  const $=id=>document.getElementById(id),app=$('app');
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const signed=n=>n>0?`+${n}`:String(n);
  let state=null,saved=null,saveError='',previousWounds=null,selectedHand=null,isDealing=false,isSubmitting=false;
  try{const raw=localStorage.getItem(KEY);if(raw)saved=E.restore(raw);}catch(e){saveError='기존 저장을 읽지 못했습니다. 새 여정을 시작하면 저장이 교체됩니다.';}
  function landscape(){return `<svg class="landscape" viewBox="0 0 600 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#425345"/><stop offset="1" stop-color="#9b966d"/></linearGradient></defs><rect width="600" height="300" fill="url(#sky)"/><circle cx="418" cy="84" r="40" fill="#e4c894" opacity=".8"/><path d="M0 174 75 131 122 153 182 101 235 153 299 132 370 174 466 122 530 159 600 123V300H0Z" fill="#667461"/><path d="M0 218 80 193 129 216 235 173 330 213 454 179 600 209V300H0Z" fill="#3d5545"/><path d="M0 252 105 223 197 240 311 218 431 248 600 217V300H0Z" fill="#253d31"/><path d="M294 300 Q376 270 310 249 Q278 237 346 219 L359 219 Q302 238 334 247 Q401 272 348 300Z" fill="#b5a67e" opacity=".65"/><path d="M451 179v-32h17v-12h20v40h10v-24h16v34M60 199v-35h23v-17h9v48" fill="#3a4c3e"/><path d="M537 259v-50m-15 20 15-20 16 21m-26-33 10-18 11 18M139 240v-44m-15 21 15-25 17 25" stroke="#20382b" stroke-width="5" fill="none"/><path d="M354 207v-10l8-7 9 7v10Zm6 0v-6h5v6" fill="#ead39c"/><circle cx="291" cy="269" r="3" fill="#182b22"/><path d="m291 272-2 12m2-10 5 6m-6 3-4 10m4-9 5 9" stroke="#182b22" stroke-width="2.5"/></svg>`;}
  function button(action,label,extra='',secondary=false){return `<button data-action="${action}" ${extra} class="${secondary?'secondary':''}">${label}</button>`;}
  function announce(text){$('notice').textContent=text;}
  function persist(){try{E.validate(state);localStorage.setItem(KEY,JSON.stringify(state));saved=state;$('save-status').textContent='이 브라우저에 저장됨';$('save-status').className='save-status saved';}catch(e){$('save-status').textContent='자동 저장 실패';announce('자동 저장에 실패했습니다. 이 창을 닫으면 진행이 사라질 수 있습니다. 브라우저의 저장 허용 설정을 확인해 주세요.');}}
  function setup(){
    previousWounds=null;selectedHand=null;
    $('new-open').hidden=true;
    app.innerHTML=`<section class="hero"><div class="hero-copy"><div class="eyebrow">당신의 선택으로 이어지는 52장의 여정</div><h1>황무지의 끝에,<br>아직 내일이 있습니다.</h1><p>조금의 식량과 두 개의 주사위.<br>버려진 길에서 필요한 것을 찾고,<br>살아남아 피난처에 도착하세요.</p></div>${landscape()}</section>
    ${saved?`<section class="panel resume-card"><div><h2 class="setup-title">${esc(saved.name)}의 여정이 남아 있습니다.</h2><p class="muted">${saved.day}일차 · 식량 ${saved.food} · 부상 ${saved.wounds}/5 · ${saved.phase==='over'?'종료된 여정':'남은 여정 '+saved.deck.length+'장'}</p></div>${button('resume',saved.phase==='over'?'지난 여정 결과 보기':'저장한 여정 이어하기')}</section>`:''}
    <div class="setup-grid"><form id="creation-form" class="panel"><h2 class="setup-title">어떤 생존자로 떠나시겠어요?</h2><p class="muted" style="font-size:.85rem">네 능력치에 −1, 0, +1, +2를 하나씩 배정하세요.<br>값을 바꾸면 해당 값을 가진 능력치와 서로 교체됩니다.</p><label class="field"><span>생존자 이름</span><input id="survivor-name" name="name" maxlength="24" placeholder="생존자 이름을 입력하세요" autocomplete="off" required></label><div class="stats-select">${Object.entries(D.suits).map(([k,v],i)=>`<label class="stat-select"><strong class="${k==='H'||k==='D'?'red':''}">${v.symbol} ${v.stat}</strong><small>${v.detail}</small><select name="${k}" aria-label="${v.stat} 능력치">${[-1,0,1,2].map(n=>`<option value="${n}" ${n===[1,0,2,-1][i]?'selected':''}>${signed(n)}</option>`).join('')}</select></label>`).join('')}</div><p id="form-error" class="form-error" role="alert"></p><div class="setup-bottom"><p class="muted">식량 10 · 부상 0으로 출발합니다.<br>선택과 판정마다 자동 저장됩니다.</p><button id="journey-start" type="submit" disabled>${saved?'새 여정으로 출발하기':'여정 시작하기'} <span aria-hidden="true">→</span></button></div></form><aside class="panel setup-info"><div class="eyebrow">출발 전에 알아두세요</div><ol><li><strong>하루에 식량 하나</strong>식량이 없으면 부상을 받습니다.</li><li><strong>손패가 만드는 기회</strong>주사위를 굴린 뒤 카드를 써서 결과를 바꿀 수 있습니다.</li><li><strong>끝까지 살아남기</strong>부상 5가 되기 전에 덱 끝에 도달하세요.</li></ol><p class="muted" style="font-size:.75rem;margin:0">혼자, 원하는 속도로 즐기세요.<br>일기를 쓰거나 문장을 입력할 필요는 없습니다.</p></aside></div>`;
    const nameInput=$('survivor-name'),startButton=$('journey-start');
    const updateStart=()=>{startButton.disabled=!nameInput.value.trim();};
    nameInput.addEventListener('input',updateStart);
    nameInput.addEventListener('change',updateStart);
    const statSelects=[...$('creation-form').querySelectorAll('select')];
    const assigned=new Map(statSelects.map(select=>[select,select.value]));
    statSelects.forEach(select=>select.addEventListener('change',()=>{
      const previous=assigned.get(select);
      const other=statSelects.find(item=>item!==select&&item.value===select.value);
      if(other){other.value=previous;assigned.set(other,previous);}
      assigned.set(select,select.value);
      $('form-error').textContent='';
    }));
    $('creation-form').addEventListener('submit',e=>{e.preventDefault();updateStart();if(startButton.disabled){nameInput.focus();return;}const fd=new FormData(e.target),stats={};for(const k of Object.keys(D.suits))stats[k]=Number(fd.get(k));try{const next=E.newGame(fd.get('name'),stats);if(saved){pendingNew=next;$('new-title').textContent='저장된 여정을 새 여정으로 바꿀까요?';$('new-confirm').textContent='새 여정 시작하기';$('new-dialog').showModal();}else{state=next;persist();render();}}catch(err){$('form-error').textContent=err.message;}});
    if(saveError)announce(saveError);
  }
  let pendingNew=null;
  function heartIcon(){return '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 27S3 19 3 10.5C3 3.5 12 2 16 8c4-6 13-4.5 13 2.5C29 19 16 27 16 27Z"/></svg>';}
  function breadIcon(){return '<svg viewBox="0 0 32 32" aria-hidden="true"><path class="bread-crust" d="M8 27V15C1 14 3 5 10 5c3-3 9-3 12 0 7 0 9 9 2 10v12Z"/><path class="bread-cut" d="m11 10 3 4m4-5 3 4"/></svg>';}
  function vitals(){
    const remaining=5-state.wounds,previousRemaining=previousWounds===null?remaining:5-previousWounds;
    previousWounds=state.wounds;
    const slots=10;
    return `<div class="vitals"><section class="vital-resource health-resource"><h3>부상</h3><div class="heart-icons" role="img" aria-label="부상 ${state.wounds}/5, 남은 하트 ${remaining}개">${Array.from({length:5},(_,i)=>`<span class="heart-icon ${i<remaining?'full':'empty'} ${i>=remaining&&i<previousRemaining?'lost':''}" aria-hidden="true">${heartIcon()}</span>`).join('')}</div><p class="vital-hint">다칠 때마다 하트가 하나씩 사라집니다.</p></section><section class="vital-resource food-resource ${state.food===0?'danger':''}"><h3>식량</h3><div class="food-supply"><div class="bread-icons" role="img" aria-label="식량 ${state.food}개">${Array.from({length:slots},(_,i)=>`<span class="bread-icon ${i<state.food?'full':'empty'}" aria-hidden="true">${breadIcon()}</span>`).join('')}</div><button type="button" class="secondary food-more" data-action="food-count" aria-label="전체 식량 개수 보기" aria-haspopup="dialog" aria-controls="food-dialog" ${state.food<10?'disabled':''}><span aria-hidden="true">+</span></button></div>${state.food===0?'<p class="vital-hint">식량이 없습니다.</p>':''}</section></div>`;
  }
  function growthReady(){return state.phase!=='over'&&state.discard.length>=10&&Object.values(state.stats).some(n=>n<3);}
  function survivor(){return `<section class="status-ribbon" aria-label="생존자 상태"><div class="panel status-overview"><div class="panel-title"><h2>생존자 상태</h2><small>부상 한계 5</small></div><button type="button" class="growth-trigger ${growthReady()?'can-grow':''}" data-action="growth-open" aria-haspopup="dialog" aria-controls="growth-dialog"><span class="growth-trigger-title"><span class="growth-beacon" aria-hidden="true">✦</span>여정의 경험</span><span class="growth-count">${state.discard.length} / 10장</span>${growthReady()?'<span class="growth-available">성장 가능 · 눌러서 능력치 올리기</span>':'<span class="growth-caption">10장을 모아 능력치를 올립니다</span>'}</button></div>${vitals()}<div class="panel stats-board" aria-label="능력치">${['S','C','H','D'].map(k=>{const v=D.suits[k];return `<div class="stat-row"><span><span class="${k==='H'||k==='D'?'red':''}">${v.symbol}</span> ${v.stat}</span><b>${signed(state.stats[k])}</b></div>`;}).join('')}</div></section>`;}
  function growth(){return `<section class="growth"><p class="growth-balance">사용할 수 있는 카드 <strong>${state.discard.length}장</strong></p><p>버린 카드 10장을 제거해 능력치 하나를 올릴 수 있습니다.</p><div class="growth-buttons">${Object.entries(D.suits).map(([k,v])=>button('grow',`${v.symbol} ${v.stat} ${signed(state.stats[k])} → ${state.stats[k]>=3?'최대':signed(state.stats[k]+1)}`,`data-suit="${k}" ${state.phase==='over'||state.discard.length<10||state.stats[k]>=3?'disabled':''}`,true)).join('')}</div><div class="pile-counts"><span>제거한 카드 ${state.removed.length}</span><span>능력치 상한 +3</span></div><p class="muted">${state.phase==='over'?'종료된 여정입니다.':Object.values(state.stats).every(n=>n>=3)?'모든 능력치가 최대치입니다.':state.discard.length<10?'성장하려면 카드를 더 모아 주세요.':'올릴 능력치를 선택하세요.'}</p></section>`;}
  function route(){const left=state.deck.length+(state.current?1:0),done=52-left;return `<section class="route" aria-label="여정 진행"><div class="route-head"><strong>피난처까지의 길</strong><span>덱 ${state.deck.length}장 남음${state.current?' · 사건 진행 중':''}</span></div><div class="route-track" role="progressbar" aria-label="지나온 카드" aria-valuemin="0" aria-valuemax="52" aria-valuenow="${done}"><div class="route-progress" style="width:${done/52*100}%"></div></div><div class="route-foot"><span>출발</span><span>${done} / 52장</span><span>피난처</span></div></section>`;}
  function cardFace(id){
    const e=D.events[id],suit=D.suits[e.suit];
    return `<span class="card-corner" aria-hidden="true"><b>${e.rank}</b><span>${suit.symbol}</span></span><span class="card-emblem" aria-hidden="true">${suit.symbol}</span><span class="card-name">${esc(e.title)}</span><span class="card-kind">${state.medkits.includes(id)?'보관한 구급상자':suit.stat+'의 자원'}</span><span class="card-corner bottom" aria-hidden="true"><b>${e.rank}</b><span>${suit.symbol}</span></span>`;
  }
  function cardBack(){return '<div class="card-back-pattern"><span class="back-compass">✧</span><span class="back-title">솔로<br>서바이벌</span><span class="back-suits">♠ ♥ ♣ ♦</span></div>';}
  function cardTable(){
    const id=state.current?.id,e=id?D.events[id]:null;
    return `<div class="card-table"><div class="deck-area"><span class="table-caption">여정 덱</span><div class="deck-pile ${state.deck.length?'':'exhausted'}" role="img" aria-label="남은 덱 ${state.deck.length}장"><div class="deck-top card-back">${state.deck.length?cardBack():'<span class="empty-deck">모든 카드를 뽑았습니다</span>'}</div></div><span class="deck-count">${state.deck.length}장 남음</span></div><div class="dealt-area"><span class="table-caption">오늘의 카드</span><div class="card-place">${e?`<div id="dealt-card" class="dealt-card" aria-label="${E.label(id)} ${esc(e.title)}"><div class="card-flipper"><div class="playing-card card-front ${e.suit==='H'||e.suit==='D'?'red':''}">${cardFace(id)}</div><div class="card-back card-reverse" aria-hidden="true">${cardBack()}</div></div></div>`:'<div class="empty-place"><span aria-hidden="true">✧</span><p>다음 여정이<br>이곳에 놓입니다</p></div>'}</div></div></div>`;
  }
  async function revealCard(){
    const card=$('dealt-card'),deck=app.querySelector('.deck-top'),flip=card?.querySelector('.card-flipper');
    try{
      if(!card||!deck||!flip||!card.animate||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
      const from=deck.getBoundingClientRect(),to=card.getBoundingClientRect();
      const x=from.x+from.width/2-to.x-to.width/2,y=from.y+from.height/2-to.y-to.height/2,scale=from.width/to.width;
      const travel=card.animate([
        {transform:`translate(${x}px,${y}px) scale(${scale}) rotate(-5deg)`,offset:0},
        {transform:`translate(${x+20}px,${y-24}px) scale(${scale+.12}) rotate(-9deg)`,offset:.25},
        {transform:'translate(0,-14px) scale(1.04) rotate(2deg)',offset:.8},
        {transform:'translate(0,0) scale(1) rotate(0deg)',offset:1}
      ],{duration:1250,easing:'cubic-bezier(.22,.7,.25,1)',fill:'both'});
      const turn=flip.animate([{transform:'rotateY(180deg)',offset:0},{transform:'rotateY(180deg)',offset:.3},{transform:'rotateY(0deg)',offset:.82},{transform:'rotateY(0deg)',offset:1}],{duration:1250,easing:'ease-in-out',fill:'both'});
      await Promise.all([travel.finished,turn.finished]);
    }catch(error){/* 연출이 중단돼도 저장된 사건을 그대로 표시합니다. */}
    finally{
      isDealing=false;render();
      if(!document.querySelector('dialog[open]'))app.querySelector('.event-title')?.focus({preventScroll:true});
    }
  }
  function dicePanel(){
    const c=state.current,e=c?D.events[c.id]:null,su=e?D.suits[e.suit]:null;
    const hasRoll=!!e?.outcomes,rolled=!!c?.dice;
    let content='';
    if(!hasRoll)content=`<div class="dice-idle"><span aria-hidden="true">${e?'◇':'⚄'}</span><strong>${e?'주사위 없이 진행':'다음 사건을 기다립니다'}</strong><p>${e?'카드의 선택과 효과를 확인해 주세요.':'카드를 뽑으면 판정 여부가 표시됩니다.'}</p></div>`;
    else content=`<div class="dice-area"><div class="dice-row">${[0,1].map(i=>`<span class="die ${rolled?'':'unrolled'}" aria-label="${i+1}번 주사위 ${rolled?c.dice[i]:'대기'}">${rolled?c.dice[i]:'?'}</span>`).join('')}</div><p class="dice-formula">${rolled?`${c.dice.join(' + ')} + 능력치 (${signed(c.modifier)}) + 손패 ${c.bonus+E.pendingBonus(state)}`:`6면체 두 개 + ${su.symbol} ${su.stat} ${signed(state.stats[e.suit])}`}</p>${rolled?`<div class="total tier-${E.tier(state)}" aria-live="polite">${E.total(state)} · ${['실패','성공','큰 성공'][E.tier(state)]}</div>`:`<div class="total">${state.phase==='choice'?'선택 후 판정을 진행합니다.':'운과 준비를 시험할 때입니다.'}</div>`}</div>${state.phase==='roll'?`<div class="actions">${button('roll','주사위 두 개 굴리기')}</div>`:state.phase==='rolled'?`<div class="actions">${button('resolve','이 결과로 확정하기')}</div><p class="action-hint">${c.pendingBoosts?.length?`손패 +${E.pendingBonus(state)} · ${c.pendingBoosts.length}장 사용 예정`:'손패를 사용해 결과를 높인 뒤 확정할 수 있습니다.'}</p>`:''}`;
    return `<aside class="event-dice" aria-label="주사위 판정" ${isDealing?'inert aria-hidden="true"':''}><div class="event-section-label">주사위 판정</div>${content}</aside>`;
  }
  function eventView(){
    if(state.phase==='over'){const win=state.outcome==='won';return `<section class="panel event-panel"><div class="end-mark" aria-hidden="true">${win?'⌂':'◌'}</div><div class="eyebrow" style="text-align:center">${win?'여정 완료':'여정 종료'}</div><h2 class="end-title">${win?'살아남았습니다.':'여기서 잠시 멈춥니다.'}</h2><p class="end-description">${win?'황무지 너머, 마침내 피난처의 불빛에 닿았습니다.':'부상이 5에 도달했습니다. 이번 여정은 끝났지만,<br>다른 생존자의 이야기를 시작할 수 있습니다.'}</p><div class="end-stats"><span>버틴 시간<strong>${state.day}일</strong></span><span>남은 식량<strong>${state.food}</strong></span><span>남은 덱<strong>${state.deck.length}장</strong></span></div><div class="actions">${button('restart','새로운 생존자로 시작하기')}</div></section>`;}
    if(state.phase==='ready')return `<section class="panel event-panel event-board">${cardTable()}<div class="event-content ready-content"><div class="eyebrow">${state.day?'다음 발걸음':'첫 발걸음'}</div><h2 class="rest-title">${state.day?'다시, 길 위로.':'피난처를 향해 출발하세요.'}</h2><p class="ready-note">여정 덱에서 한 장을 뽑아<br>오늘의 사건을 마주하세요.</p><p class="ready-note">${state.food?'식량 1을 먹고 다음 사건을 공개합니다.':'식량이 없습니다. 다음 날을 시작하면 부상을 1 받습니다.'}${state.discard.length>=10?'<br>출발하기 전에 능력치를 올릴 수 있습니다.':''}</p><div class="actions">${button('next',`${state.day?'다음 날 카드 뽑기':'첫날 카드 뽑기'} · ${state.food?'식량 −1':'부상 +1'}`)}</div></div>${dicePanel()}</section>`;
    const c=state.current,e=D.events[c.id],su=D.suits[e.suit];
    let body='';
    if(state.phase==='choice')body=`<div class="actions">${E.choices(state).map(a=>button('choose',esc(a.label),`data-choice="${a.id}" ${a.disabled?'disabled':''}`,a.id==='pass'||a.id==='leave')).join('')}</div>${e.trade?`<p class="action-hint">하단 손패에서 판매할 카드를 선택하세요. 거래 ${c.trades}/2회.</p>`:''}${E.choices(state).some(a=>a.disabled)?'<p class="action-hint">흐리게 표시된 선택은 식량이 부족해 선택할 수 없습니다.</p>':''}`;
    if(state.phase==='result')body=`<div class="result-box" role="status"><p>${esc(c.result)}</p></div><div class="actions">${button('proceed',c.pending==='roll'?'다음 판정 준비하기':c.pending==='choice'?'수색을 계속할지 결정하기':'사건 마치기')}</div>`;
    const repeat=e.repeat==='three'?`세 번 판정 · ${c.rolls}/3회`:e.repeat==='until'?`성공할 때까지 · ${c.rolls}회 판정`:e.repeat==='search3'?`최대 세 번 수색 · ${c.rolls}/3회`:e.repeat==='twice'?`최대 두 번 시도 · ${c.rolls}/2회`:su.detail;
    return `<section class="panel event-panel event-board ${isDealing?'is-dealing':''}" aria-busy="${isDealing}">${cardTable()}${isDealing?'<p class="draw-caption" role="status">오늘의 카드를 펼치는 중…</p>':''}<div class="event-content" ${isDealing?'inert aria-hidden="true"':''}><div class="event-heading"><div><div class="eyebrow">${su.stat}의 사건 · ${repeat}</div><h2 class="event-title" tabindex="-1">${e.title}</h2></div></div><div class="event-section-label">벌어진 일</div><p class="story">${e.story}</p>${e.repeat==='three'?'<p class="rules-note">규칙 해석: 원문의 ‘세 번 판정’을 우선해 큰 성공 후에도 판정을 계속합니다.</p>':''}${body?`<div class="event-section-label">${state.phase==='result'?'사건의 결과':'어떻게 하시겠어요?'}</div>${body}`:''}${e.outcomes?`<details class="outcomes" ${state.phase==='roll'||state.phase==='rolled'?'open':''}><summary>판정별 결과 확인하기</summary>${e.outcomes.map((o,i)=>`<div class="outcome-row"><b class="tier-${i}">${['6 이하','7~9','10 이상'][i]}</b><span>${o.text}</span></div>`).join('')}</details>`:''}</div>${dicePanel()}</section>`;
  }
  function hand(){
    if(!state.hand.includes(selectedHand))selectedHand=null;
    const selected=selectedHand?D.events[selectedHand]:null;
    const boost=state.phase==='rolled',trade=state.phase==='choice'&&state.current.id==='H4'&&state.current.trades<2;
    const pending=state.current?.pendingBoosts||[],reserved=pending.includes(selectedHand);
    const med=selectedHand&&state.medkits.includes(selectedHand);
    return `<section class="hand-panel" aria-labelledby="hand-title"><div class="hand-heading"><div><h2 id="hand-title" tabindex="-1">보유한 카드 <span>${state.hand.length}장</span></h2><p class="hand-hint">카드를 선택해 자세히 보기 · 판정에 사용하면 같은 무늬 +2, 다른 무늬 +1</p></div>${state.hand.length>5?'<span class="hand-scroll-hint">좌우로 넘겨 모든 카드 보기 ↔</span>':''}</div>
    ${state.hand.length?`<div class="hand-scroll" tabindex="0" role="region" aria-label="보유 카드 목록, 좌우로 스크롤"><ul class="hand-fan">${state.hand.map((id,i)=>{const e=D.events[id],position=state.hand.length>1?(i/(state.hand.length-1)-.5)*2:0;return `<li class="hand-slot ${selectedHand===id?'selected':''}" style="--tilt:${(position*5).toFixed(2)}deg;--rise:${Math.round(Math.abs(position)*13)}px"><button type="button" class="playing-card ${pending.includes(id)?'pending-card':''} ${e.suit==='H'||e.suit==='D'?'red':''}" data-action="select-card" data-card="${id}" aria-pressed="${selectedHand===id}" aria-controls="hand-selection" aria-label="${E.label(id)} ${esc(e.title)}${pending.includes(id)?' 사용 예정':''} 선택">${cardFace(id)}${pending.includes(id)?`<span class="pending-label">사용 예정 +${id[0]===state.current.id[0]?2:1}</span>`:''}</button></li>`;}).join('')}</ul></div>`:'<div class="hand-empty"><span aria-hidden="true">♠ ♥ ♣ ♦</span><p>아직 보유한 카드가 없습니다. 여정에서 얻은 카드가 이곳에 펼쳐집니다.</p></div>'}
    <div id="hand-selection" class="hand-selection" aria-live="polite">${selected?`<div class="selected-copy"><h3>${E.label(selectedHand)} · ${esc(selected.title)}</h3><p>${reserved?'확정 전까지 취소할 수 있습니다. 확정하면 이 카드를 소비합니다.':med?'치료에 쓰거나, 판정 보정 또는 거래에 사용할 수 있습니다.':'손패에서는 사건 효과를 다시 실행하지 않고 판정 보정 또는 거래에 사용합니다.'}</p></div><div class="hand-actions">${boost?(reserved?button('cancel-boost','판정 사용 취소',`data-card="${selectedHand}"`,true):button('boost',`판정에 사용 · +${selected.suit===state.current.id[0]?2:1}`,`data-card="${selectedHand}"`)):''}${trade?button('trade','판매하기 · 식량 +2',`data-card="${selectedHand}"`):''}${med&&!reserved&&state.phase!=='over'?button('heal','치료하기 · 부상 −1',state.wounds===0?'disabled':'',true):''}${!boost&&!trade&&!med?`<span class="hand-wait">${state.phase==='over'?'종료된 여정입니다.':'주사위 판정 후 또는 상인과 거래할 때 사용할 수 있습니다.'}</span>`:''}</div>`:`<p class="selection-hint">${state.hand.length?'카드를 누르면 여기에서 사용 방법을 확인할 수 있습니다.':'카드를 얻으면 선택해서 사용할 수 있습니다.'}</p>`}</div></section>`;
  }
  function render(){
    $('new-open').hidden=false;
    const growthFocus=document.activeElement?.closest('#growth-dialog [data-suit]')?.dataset.suit;
    const scroll=app.querySelector('.hand-scroll')?.scrollLeft||0;
    const handFocused=!!document.activeElement?.closest('.hand-panel');
    app.innerHTML=`<div class="game-dashboard"><div class="play-summary"><div class="journey-identity"><div class="identity-line"><h1>${esc(state.name)}의 여정</h1><span class="day-badge">${state.day?`${state.day}일차`:'출발 준비'}</span></div><p class="muted">먹을 것을 찾고, 위기를 넘고, 한 걸음 더 나아가세요.</p></div>${button('log-open',`<span>▤ 지나온 여정</span><small>기록 ${state.log.length}개</small>`,'aria-haspopup="dialog" aria-controls="log-dialog"',true)}${route()}</div>${survivor()}<div class="main-column">${eventView()}</div>${hand()}</div>`;
    if(app.querySelector('.hand-scroll'))app.querySelector('.hand-scroll').scrollLeft=scroll;
    $('new-open').disabled=isDealing;
    $('growth-content').innerHTML=growth();
    if(growthFocus){const target=$('growth-content').querySelector(`[data-suit="${growthFocus}"]`);(target&&!target.disabled?target:$('growth-dialog').querySelector('[data-close]')).focus({preventScroll:true});}
    for(const panel of app.querySelectorAll('.growth-trigger,.hand-panel'))panel.inert=isDealing;
    if(handFocused)(app.querySelector(`[data-action="select-card"][data-card="${selectedHand}"]`)||$('hand-title')).focus({preventScroll:true});
  }
  async function submitResult(){
    const cards=[...(state.current?.pendingBoosts||[])];
    const sources=cards.map(id=>app.querySelector(`[data-action="select-card"][data-card="${id}"]`)).filter(Boolean);
    if(!E.resolve(state))return;
    persist();
    if(!sources.length||matchMedia('(prefers-reduced-motion: reduce)').matches){render();return;}
    isSubmitting=true;app.inert=true;$('new-open').disabled=true;
    const layer=document.createElement('div');layer.className='submission-layer';layer.setAttribute('aria-hidden','true');layer.inert=true;document.body.append(layer);
    try{
      const motions=sources.map((source,i)=>{
        const r=source.getBoundingClientRect(),copy=source.cloneNode(true);
        copy.removeAttribute('data-action');copy.removeAttribute('aria-controls');copy.setAttribute('aria-hidden','true');copy.inert=true;
        copy.classList.add('submitted-card');copy.style.cssText=`position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;z-index:1000;pointer-events:none;margin:0;`;
        layer.append(copy);source.style.visibility='hidden';
        return copy.animate([{transform:'translateY(0) scale(1)',opacity:1},{transform:'translateY(-75px) scale(.94)',opacity:.95,offset:.4},{transform:'translateY(-180px) scale(.72)',opacity:0}],{duration:700,delay:Math.min(i*60,240),easing:'ease-in',fill:'forwards'}).finished.catch(()=>{});
      });
      await Promise.all(motions);
    }catch{/* 연출이 중단되어도 이미 저장한 결과를 표시합니다. */}finally{layer.remove();isSubmitting=false;app.inert=false;render();app.querySelector('.event-title')?.focus({preventScroll:true});}
  }
  document.addEventListener('click',e=>{const b=e.target.closest('button[data-action]');if(!b||b.disabled)return;const a=b.dataset.action;
    if(isDealing||isSubmitting)return;
    if(a==='resolve'){void submitResult();return;}
    if(a==='next'){
      announce('');if(!E.next(state))return;
      persist();isDealing=!!state.current&&state.phase!=='over';render();
      if(isDealing)void revealCard();return;
    }
    if(a==='growth-open'){$('growth-content').innerHTML=growth();$('growth-dialog').showModal();return;}
    if(a==='log-open'){$('log-content').innerHTML=state.log.slice().reverse().map(l=>`<li><span>${l.day}일차</span>${esc(l.text)}</li>`).join('');$('log-dialog').showModal();return;}
    if(a==='select-card'){selectedHand=b.dataset.card;render();return;}
    if(a==='food-count'){$('food-total').textContent=String(state.food);$('food-dialog').showModal();return;}
    if(a==='resume'){state=E.restore(JSON.stringify(saved));render();$('save-status').textContent='저장한 여정을 불러옴';return;}
    if(a==='restart'){state=null;setup();return;}
    const funcs={choose:()=>E.choose(state,b.dataset.choice),roll:()=>E.roll(state),proceed:()=>E.proceed(state),boost:()=>E.boost(state,b.dataset.card),'cancel-boost':()=>E.cancelBoost(state,b.dataset.card),trade:()=>E.trade(state,b.dataset.card),heal:()=>E.heal(state),grow:()=>E.grow(state,b.dataset.suit)};
    if(funcs[a]){announce('');if(funcs[a]()){persist();render();}}
  });
  $('rules-open').addEventListener('click',()=>$('rules-dialog').showModal());
  $('new-open').addEventListener('click',()=>{pendingNew=null;$('new-title').textContent='새로운 여정을 시작할까요?';$('new-confirm').textContent='새 생존자 만들기';$('new-dialog').showModal();});
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',() =>$(b.dataset.close).close()));
  $('new-confirm').addEventListener('click',()=>{$('new-dialog').close();if(pendingNew){state=pendingNew;pendingNew=null;saveError='';announce('');persist();render();}else{state=null;setup();}});
  setup();
})();
