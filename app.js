(function () {
  'use strict';
  const E=SurvivalEngine,D=SurvivalData,KEY='solo-survival-wasteland-v1';
  const $=id=>document.getElementById(id),app=$('app');
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const signed=n=>n>0?`+${n}`:String(n);
  let state=null,saved=null,saveError='',previousWounds=null;
  try{const raw=localStorage.getItem(KEY);if(raw)saved=E.restore(raw);}catch(e){saveError='기존 저장을 읽지 못했습니다. 새 여정을 시작하면 저장이 교체됩니다.';}
  function landscape(){return `<svg class="landscape" viewBox="0 0 600 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#425345"/><stop offset="1" stop-color="#9b966d"/></linearGradient></defs><rect width="600" height="300" fill="url(#sky)"/><circle cx="418" cy="84" r="40" fill="#e4c894" opacity=".8"/><path d="M0 174 75 131 122 153 182 101 235 153 299 132 370 174 466 122 530 159 600 123V300H0Z" fill="#667461"/><path d="M0 218 80 193 129 216 235 173 330 213 454 179 600 209V300H0Z" fill="#3d5545"/><path d="M0 252 105 223 197 240 311 218 431 248 600 217V300H0Z" fill="#253d31"/><path d="M294 300 Q376 270 310 249 Q278 237 346 219 L359 219 Q302 238 334 247 Q401 272 348 300Z" fill="#b5a67e" opacity=".65"/><path d="M451 179v-32h17v-12h20v40h10v-24h16v34M60 199v-35h23v-17h9v48" fill="#3a4c3e"/><path d="M537 259v-50m-15 20 15-20 16 21m-26-33 10-18 11 18M139 240v-44m-15 21 15-25 17 25" stroke="#20382b" stroke-width="5" fill="none"/><path d="M354 207v-10l8-7 9 7v10Zm6 0v-6h5v6" fill="#ead39c"/><circle cx="291" cy="269" r="3" fill="#182b22"/><path d="m291 272-2 12m2-10 5 6m-6 3-4 10m4-9 5 9" stroke="#182b22" stroke-width="2.5"/></svg>`;}
  function button(action,label,extra='',secondary=false){return `<button data-action="${action}" ${extra} class="${secondary?'secondary':''}">${label}</button>`;}
  function announce(text){$('notice').textContent=text;}
  function persist(){try{E.validate(state);localStorage.setItem(KEY,JSON.stringify(state));saved=state;$('save-status').textContent='이 브라우저에 저장됨';$('save-status').className='save-status saved';}catch(e){$('save-status').textContent='자동 저장 실패';announce('자동 저장에 실패했습니다. 이 창을 닫으면 진행이 사라질 수 있습니다. 브라우저의 저장 허용 설정을 확인해 주세요.');}}
  function setup(){
    previousWounds=null;
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
    const slots=state.food>10?20:10;
    return `<div class="vitals"><section class="vital-resource health-resource"><h3>부상</h3><div class="heart-icons" role="img" aria-label="부상 ${state.wounds}/5, 남은 하트 ${remaining}개">${Array.from({length:5},(_,i)=>`<span class="heart-icon ${i<remaining?'full':'empty'} ${i>=remaining&&i<previousRemaining?'lost':''}" aria-hidden="true">${heartIcon()}</span>`).join('')}</div><p class="vital-hint">다칠 때마다 하트가 하나씩 사라집니다.</p></section><section class="vital-resource food-resource ${state.food===0?'danger':''}"><h3>식량</h3><div class="food-supply"><div class="bread-icons" role="img" aria-label="식량 ${state.food}개">${Array.from({length:slots},(_,i)=>`<span class="bread-icon ${i<state.food?'full':'empty'}" aria-hidden="true">${breadIcon()}</span>`).join('')}</div>${state.food>20?'<button type="button" class="secondary food-more" data-action="food-count" aria-label="전체 식량 개수 보기" aria-haspopup="dialog" aria-controls="food-dialog"><span aria-hidden="true">+</span></button>':''}</div>${state.food===0?'<p class="vital-hint">식량이 없습니다.</p>':''}</section></div>`;
  }
  function survivor(){return `<div class="side-stack"><section class="panel survivor-panel"><div class="panel-title"><h2>생존자 상태</h2><small>부상 한계 5</small></div>${vitals()}${Object.entries(D.suits).map(([k,v])=>`<div class="stat-row"><span><span class="${k==='H'||k==='D'?'red':''}">${v.symbol}</span> ${v.stat}</span><b>${signed(state.stats[k])}</b></div>`).join('')}</section><section class="panel growth"><div class="panel-title"><h3>여정의 경험</h3><small>${state.discard.length} / 10장</small></div><p>버린 카드 10장을 제거해<br>능력치 하나를 올릴 수 있습니다.</p><div class="growth-buttons">${Object.entries(D.suits).map(([k,v])=>button('grow',`${v.symbol} ${v.stat} +1`,`data-suit="${k}" ${state.phase==='over'||state.discard.length<10||state.stats[k]>=3?'disabled':''}`,true)).join('')}</div><div class="pile-counts"><span>제거한 카드 ${state.removed.length}</span><span>상한 +3</span></div></section></div>`;}
  function route(){const left=state.deck.length+(state.current?1:0),done=52-left;return `<section class="route" aria-label="여정 진행"><div class="route-head"><strong>피난처까지의 길</strong><span>덱 ${state.deck.length}장 남음${state.current?' · 사건 진행 중':''}</span></div><div class="route-track" role="progressbar" aria-label="지나온 카드" aria-valuemin="0" aria-valuemax="52" aria-valuenow="${done}"><div class="route-progress" style="width:${done/52*100}%"></div></div><div class="route-foot"><span>출발</span><span>${done} / 52장</span><span>피난처</span></div></section>`;}
  function eventView(){
    if(state.phase==='over'){const win=state.outcome==='won';return `<section class="panel event-panel"><div class="end-mark" aria-hidden="true">${win?'⌂':'◌'}</div><div class="eyebrow" style="text-align:center">${win?'여정 완료':'여정 종료'}</div><h2 class="end-title">${win?'살아남았습니다.':'여기서 잠시 멈춥니다.'}</h2><p class="end-description">${win?'황무지 너머, 마침내 피난처의 불빛에 닿았습니다.':'부상이 5에 도달했습니다. 이번 여정은 끝났지만,<br>다른 생존자의 이야기를 시작할 수 있습니다.'}</p><div class="end-stats"><span>버틴 시간<strong>${state.day}일</strong></span><span>남은 식량<strong>${state.food}</strong></span><span>남은 덱<strong>${state.deck.length}장</strong></span></div><div class="actions">${button('restart','새로운 생존자로 시작하기')}</div></section>`;}
    if(state.phase==='ready')return `<section class="panel event-panel"><div class="rest-art">${landscape()}</div><div class="eyebrow">${state.day?'다음 발걸음':'첫 발걸음'}</div><h2 class="rest-title">${state.day?'다시, 길 위로.':'피난처를 향해 출발하세요.'}</h2><p class="ready-note">${state.food?'식량 1을 먹고 다음 사건을 공개합니다.':'식량이 없습니다. 다음 날을 시작하면 부상을 1 받습니다.'}${state.discard.length>=10?'<br>출발하기 전에 능력치를 올릴 수 있습니다.':''}</p><div class="actions">${button('next',`${state.day?'다음 날로 이동하기':'첫날 시작하기'} · ${state.food?'식량 −1':'부상 +1'}`)}</div></section>`;
    const c=state.current,e=D.events[c.id],su=D.suits[e.suit];
    let body='';
    if(state.phase==='choice')body=`<div class="actions">${E.choices(state).map(a=>button('choose',esc(a.label),`data-choice="${a.id}" ${a.disabled?'disabled':''}`,a.id==='pass'||a.id==='leave')).join('')}</div>${e.trade?`<p class="action-hint">오른쪽 또는 아래의 손패에서 판매할 카드를 선택하세요. 거래 ${c.trades}/2회.</p>`:''}${E.choices(state).some(a=>a.disabled)?'<p class="action-hint">흐리게 표시된 선택은 식량이 부족해 선택할 수 없습니다.</p>':''}`;
    if(state.phase==='roll'||state.phase==='rolled'){
      const rolled=state.phase==='rolled',n=E.total(state),t=E.tier(state);
      body=`<div class="dice-area"><div class="dice-row">${[0,1].map(i=>`<span class="die ${rolled?'':'unrolled'}" aria-label="${i+1}번 주사위 ${rolled?c.dice[i]:'대기'}">${rolled?c.dice[i]:'?'}</span>`).join('')}</div><p class="dice-formula">${rolled?`${c.dice.join(' + ')} + 능력치 (${signed(c.modifier)}) + 손패 ${c.bonus}`:`6면체 두 개 + ${su.symbol} ${su.stat} ${signed(state.stats[e.suit])}`}</p>${rolled?`<div class="total tier-${t}" aria-live="polite">${n} · ${['실패','성공','큰 성공'][t]}</div>`:'<div class="total">운과 준비를 시험할 때입니다.</div>'}</div><div class="actions">${rolled?button('resolve','이 결과로 확정하기'):button('roll','주사위 두 개 굴리기')}</div>${rolled?'<p class="action-hint">아직 결과를 바꿀 수 있습니다. 손패를 사용하거나 지금 확정하세요.</p>':''}`;
    }
    if(state.phase==='result')body=`<div class="result-box" role="status"><p>${esc(c.result)}</p></div><div class="actions">${button('proceed',c.pending==='roll'?'다음 판정 준비하기':c.pending==='choice'?'수색을 계속할지 결정하기':'사건 마치기')}</div>`;
    const repeat=e.repeat==='three'?`세 번 판정 · ${c.rolls}/3회`:e.repeat==='until'?`성공할 때까지 · ${c.rolls}회 판정`:e.repeat==='search3'?`최대 세 번 수색 · ${c.rolls}/3회`:e.repeat==='twice'?`최대 두 번 시도 · ${c.rolls}/2회`:su.detail;
    return `<section class="panel event-panel"><div class="event-heading"><span class="card-stamp ${e.suit==='H'||e.suit==='D'?'red':''}">${E.label(c.id)}</span><div><div class="eyebrow">${su.stat}의 사건 · ${repeat}</div><h2>${e.title}</h2></div></div><p class="story">${e.story}</p>${e.repeat==='three'?'<p class="rules-note">규칙 해석: 원문의 ‘세 번 판정’을 우선해 큰 성공 후에도 판정을 계속합니다.</p>':''}${body}${e.outcomes?`<details class="outcomes"><summary>판정별 결과 확인하기</summary>${e.outcomes.map((o,i)=>`<div class="outcome-row"><b class="tier-${i}">${['6 이하','7~9','10 이상'][i]}</b><span>${o.text}</span></div>`).join('')}</details>`:''}</section>`;
  }
  function hand(){return `<aside class="hand-column panel hand-panel"><div class="panel-title"><h2>가지고 있는 것들</h2><small>손패 ${state.hand.length}장</small></div><p class="hand-hint">판정 후 사용하면<br>같은 무늬 +2 · 다른 무늬 +1</p><div class="hand-list">${state.hand.map(id=>{const e=D.events[id],boost=state.phase==='rolled',trade=state.phase==='choice'&&state.current.id==='H4'&&state.current.trades<2,med=state.medkits.includes(id);return `<div class="hand-card"><span class="mini-card ${id[0]==='H'||id[0]==='D'?'red':''}">${E.label(id)}</span><div><strong>${e.title}</strong><small>${med?'보관한 구급상자 · 치료 또는 판정에 사용':D.suits[e.suit].stat+'의 자원'}</small></div>${boost?button('boost',`판정에 사용 · +${id[0]===state.current.id[0]?2:1}`,`data-card="${id}"`,true):''}${trade?button('trade','판매하기 · 식량 +2',`data-card="${id}"`,true):''}${med&&state.phase!=='over'?button('heal','구급상자로 치료 · 부상 −1',state.wounds===0?'disabled':'',true):''}</div>`;}).join('')}</div>${!state.hand.length?'<p class="hand-empty">아직 챙겨 둔 물건이 없습니다.<br>사건을 통해 보관한 카드가<br>이곳에 모입니다.</p>':''}</aside>`;}
  function render(){
    $('new-open').hidden=false;
    const open=app.querySelector('.log-panel details')?.open||false;
    app.innerHTML=`<div class="journey-top"><div><h1>${esc(state.name)}의 여정</h1><p class="muted">먹을 것을 찾고, 위기를 넘고, 한 걸음 더 나아가세요.</p></div><span class="day-badge">${state.day?`${state.day}일차`:'출발 준비'}</span></div><div class="game-grid">${survivor()}<div class="main-column">${route()}${eventView()}<section class="panel log-panel"><details ${open?'open':''}><summary>지나온 여정 <span class="muted">· 기록 ${state.log.length}개</span></summary><ul class="log-list">${state.log.slice().reverse().map(l=>`<li><span>${l.day}일차</span>${esc(l.text)}</li>`).join('')}</ul></details></section></div>${hand()}</div>`;
  }
  app.addEventListener('click',e=>{const b=e.target.closest('button[data-action]');if(!b||b.disabled)return;const a=b.dataset.action;
    if(a==='food-count'){$('food-total').textContent=String(state.food);$('food-dialog').showModal();return;}
    if(a==='resume'){state=E.restore(JSON.stringify(saved));render();$('save-status').textContent='저장한 여정을 불러옴';return;}
    if(a==='restart'){state=null;setup();return;}
    const funcs={next:()=>E.next(state),choose:()=>E.choose(state,b.dataset.choice),roll:()=>E.roll(state),resolve:()=>E.resolve(state),proceed:()=>E.proceed(state),boost:()=>E.boost(state,b.dataset.card),trade:()=>E.trade(state,b.dataset.card),heal:()=>E.heal(state),grow:()=>E.grow(state,b.dataset.suit)};
    if(funcs[a]){announce('');if(funcs[a]()){persist();render();}}
  });
  $('rules-open').addEventListener('click',()=>$('rules-dialog').showModal());
  $('new-open').addEventListener('click',()=>{pendingNew=null;$('new-title').textContent='새로운 여정을 시작할까요?';$('new-confirm').textContent='새 생존자 만들기';$('new-dialog').showModal();});
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',() =>$(b.dataset.close).close()));
  $('new-confirm').addEventListener('click',()=>{$('new-dialog').close();if(pendingNew){state=pendingNew;pendingNew=null;saveError='';announce('');persist();render();}else{state=null;setup();}});
  setup();
})();
