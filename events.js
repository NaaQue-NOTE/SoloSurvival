(function (root) {
  'use strict';
  const suits = {
    S: { symbol: '♠', name: '스페이드', stat: '민첩', detail: '기술 · 은신' },
    H: { symbol: '♥', name: '하트', stat: '사교', detail: '설득 · 용기 · 평판' },
    C: { symbol: '♣', name: '클로버', stat: '체력', detail: '힘 · 지구력 · 전투' },
    D: { symbol: '♦', name: '다이아몬드', stat: '지혜', detail: '지식 · 임기응변' }
  };
  const events = {};
  const effect = (text, values = {}) => ({ text, ...values });
  const action = (id, label, values = {}) => ({ id, label, ...values });
  const pass = action('pass', '지나가기', { effects: {} });
  function card(id, title, story, options) { events[id] = { id, suit: id[0], rank: id.slice(1), title, story, ...options }; }
  function test(id, title, story, outcomes, options = {}) {
    const { optional = false, cost = 0, label = '도전하기', ...rest } = options;
    card(id, title, story, { outcomes, actions: [action('test', label, { test: true, cost }), ...(optional ? [pass] : [])], ...rest });
  }
  function fixed(id, title, story, values) { card(id, title, story, { actions: [action('take', '확인하고 계속하기', { effects: values })] }); }
  const nothing = effect('아무 일도 일어나지 않습니다.');
  const hurt = effect('부상을 1 받습니다.', { wounds: 1 });
  const safe = effect('무사히 위기를 벗어납니다.');

  test('S2', '잠긴 상자', '굳게 잠긴 상자를 발견했습니다. 식량 1을 쓰면 시간을 들여 열어 볼 수 있습니다.', [effect('결국 포기합니다.'), effect('이 카드를 보관하고 식량 2와 손패 1장을 얻습니다.', { keep: true, food: 2, draw: 1 }), effect('빠르게 열었습니다. 보상에 더해 쓴 식량 1도 돌려받습니다.', { keep: true, food: 3, draw: 1 })], { optional: true, cost: 1, label: '상자 열기 · 식량 1' });
  test('S3', '모닥불 옆 식량', '모닥불 옆에 누군가 놓아둔 식량이 보입니다. 몰래 가져올 수 있을까요?', [effect('들켰습니다. 달아나면서 부상을 1 받습니다.', { wounds: 1 }), effect('식량 2를 얻습니다.', { food: 2 }), effect('식량 3을 얻습니다.', { food: 3 })], { optional: true, label: '식량 훔치기' });
  fixed('S4', '고장 난 자동차', '멈춰 선 자동차에서 쓸 만한 공구를 찾았습니다.', { keep: true });
  fixed('S5', '버려진 슈퍼마켓', '먼지 쌓인 선반 사이에 먹을 것이 남아 있습니다.', { food: 2 });
  test('S6', '잠긴 작은 상점', '문이 잠겨 있습니다. 식량 1을 쓰면 시간을 들여 들어가 볼 수 있습니다.', [nothing, effect('식량 3과 손패 1장을 얻습니다.', { food: 3, draw: 1 }), effect('식량 3과 손패 1장을 얻고, 쓴 식량 1을 돌려받습니다.', { food: 4, draw: 1 })], { optional: true, cost: 1, label: '상점 열기 · 식량 1' });
  test('S7', '끈질긴 추격', '도적들이 뒤쫓아 옵니다. 성공할 때까지 도망쳐야 합니다.', [hurt, safe, effect('따돌리는 중에 물건까지 훔쳤습니다. 손패 1장을 얻습니다.', { draw: 1 })], { repeat: 'until', label: '추격 따돌리기' });
  test('S8', '약탈자 정찰병', '정찰병 하나를 발견했습니다. 피해 가거나 먼저 기습할 수 있습니다.', [hurt, effect('부상을 1 받고 식량 3을 얻습니다.', { wounds: 1, food: 3 }), effect('다치지 않고 식량 3을 얻습니다.', { food: 3 })], { optional: true, label: '정찰병 기습하기' });
  fixed('S9', '쓸 만한 고철', '여러 곳에 사용할 수 있는 부품과 고철을 주웠습니다.', { keep: true });
  fixed('S10', '해골의 배낭', '오래된 유해 곁에 배낭 하나가 남아 있습니다.', { food: 2, draw: 1 });
  test('SJ', '떠돌이 도박사', '떠돌이가 식량을 걸고 한 판 하자고 제안합니다.', [effect('식량 1을 잃습니다.', { food: -1 }), effect('식량 1을 얻습니다.', { food: 1 }), effect('식량 2를 얻습니다.', { food: 2 })], { optional: true, label: '내기에 응하기' });
  test('SQ', '약탈자 야영지', '야영지를 최대 세 번 수색할 수 있습니다. 매번 계속할지 결정하세요.', [hurt, effect('식량 1을 얻습니다.', { food: 1 }), effect('식량 2와 손패 1장을 얻습니다.', { food: 2, draw: 1 })], { optional: true, repeat: 'search3', label: '야영지 수색하기' });
  test('SK', '들개 무리', '들개들이 뒤쫓아 옵니다. 식량 2를 던져 주거나 직접 달아나야 합니다.', [effect('부상을 2 받습니다.', { wounds: 2 }), effect('달아나지만 식량 1을 잃습니다.', { food: -1 }), safe]);
  events.SK.actions.unshift(action('feed', '식량을 던져 주기 · 식량 2', { cost: 2, effects: {} }));
  test('SA', '지하 벙커', '땅 아래로 이어지는 입구가 보입니다. 안으로 들어갈 방법을 찾으세요.', [nothing, effect('식량 3을 얻습니다.', { food: 3 }), effect('식량 3과 손패 1장을 얻습니다.', { food: 3, draw: 1 })], { label: '벙커 진입하기' });

  card('H2', '구급상자', '상처를 치료할 구급상자를 발견했습니다. 지금 쓰거나 나중을 위해 보관하세요.', { actions: [action('heal', '지금 치료하기 · 부상 −1', { effects: { heal: 1 } }), action('save', '구급상자 보관하기', { effects: { keep: true, medkit: true } })] });
  test('H3', '다른 생존자들', '길 위에서 생존자들을 만났습니다. 도움을 요청할 수 있습니다.', [nothing, effect('식량 1을 얻습니다.', { food: 1 }), effect('식량 1과 손패 1장을 얻습니다.', { food: 1, draw: 1 })], { optional: true, label: '도움 요청하기' });
  card('H4', '떠돌이 상인', '손패를 최대 두 장까지 팔 수 있습니다. 한 장당 식량 2를 받습니다.', { trade: true, actions: [action('leave', '거래 마치기', { effects: {} })] });
  card('H5', '떠돌이 의사', '식량 1을 내면 부상 1을 치료해 줍니다.', { actions: [action('treat', '치료받기 · 식량 1', { cost: 1, effects: { heal: 1 } }), pass] });
  fixed('H6', '흐르는 물', '낡은 공중화장실에 아직 물이 나옵니다. 몸을 씻고 기운을 차립니다.', { keep: true });
  test('H7', '현상금 사냥꾼', '사냥꾼들이 당신을 도적으로 오해했습니다. 아니라는 것을 설득해야 합니다.', [effect('도망치다가 부상을 1 받습니다.', { wounds: 1 }), effect('오해가 풀려 보내 줍니다.'), effect('오해를 풀고 식량 1도 받습니다.', { food: 1 })], { label: '오해 풀기' });
  test('H8', '길을 막은 약탈자들', '두 약탈자에게 붙잡혔습니다. 풀어 달라고 설득해야 합니다.', [effect('도망치다가 부상을 1 받습니다.', { wounds: 1 }), effect('당신을 보내 줍니다.'), effect('당신을 보내 주며 식량 1을 줍니다.', { food: 1 })], { label: '약탈자 설득하기' });
  fixed('H9', '버려진 모텔', '푹신한 침대에서 밤을 보냅니다. 부상 1을 회복하고 이 카드를 보관합니다.', { heal: 1, keep: true });
  card('H10', '굶주린 생존자', '길가에 굶주린 사람이 있습니다. 식량을 나눠 줄 수 있습니다.', { actions: [action('give', '식량 1 나눠 주고 카드 보관하기', { cost: 1, effects: { keep: true } }), pass] });
  card('HJ', '작은 마을', '주민들이 당신을 맞이합니다. 보급품과 길 안내 중 필요한 것을 부탁하세요.', { actions: [action('help', '보급 받기 · 식량 1, 손패 1장', { effects: { food: 1, draw: 1 } }), action('directions', '길 묻기 · 여정 3장 단축', { effects: { skip: 3 } })] });
  test('HQ', '대상 행렬', '이동 중인 대상들을 만났습니다. 잠시 동행해도 되는지 물어볼 수 있습니다.', [effect('동행을 거절당합니다.'), effect('식량 1을 얻고 여정을 1장 줄입니다.', { food: 1, skip: 1 }), effect('식량 1을 얻고 여정을 1장 줄이며 이 카드도 보관합니다.', { food: 1, skip: 1, keep: true })], { optional: true, label: '동행 요청하기' });
  test('HK', '참혹한 현장', '학살의 흔적을 발견했습니다. 남은 물자를 뒤지려면 큰 용기가 필요합니다.', [effect('차마 버티지 못하고 달아납니다.'), effect('식량 1을 얻고 이 카드를 보관합니다.', { food: 1, keep: true }), effect('식량 1을 얻고 이 카드를 보관하며 손패 1장을 더 얻습니다.', { food: 1, keep: true, draw: 1 })], { label: '남은 물자 찾기' });
  fixed('HA', '새 옷과 배낭', '의류 매장에서 깨끗한 옷과 튼튼한 신발, 배낭을 구했습니다.', { keep: true });

  test('C2', '들개의 습격', '야생 개 한 마리가 갑자기 달려듭니다.', [hurt, effect('개를 쫓아냅니다.'), effect('개를 제압하고 고기로 식량 1을 얻습니다.', { food: 1 })], { label: '들개 막아내기' });
  test('C3', '튼튼한 나무 상자', '상자를 부수면 안에 든 것을 얻을 수 있을 것 같습니다.', [hurt, effect('식량 2를 얻습니다.', { food: 2 }), effect('식량 2를 얻고 이 카드를 보관합니다.', { food: 2, keep: true })], { optional: true, label: '상자 부수기' });
  fixed('C4', '낡은 야구 방망이', '몸을 지킬 수 있는 나무 방망이를 찾았습니다.', { keep: true });
  fixed('C5', '열매가 열린 나무', '나무에 올라 먹을 수 있는 열매를 땁니다.', { food: 2 });
  test('C6', '사냥의 기회', '근처에서 야생 동물의 흔적을 발견했습니다.', [nothing, effect('토끼를 잡아 식량 1을 얻습니다.', { food: 1 }), effect('사슴을 잡아 식량 3을 얻습니다.', { food: 3 })], { label: '사냥하기' });
  test('C7', '도적과의 조우', '무장한 도적이 앞을 막아섭니다.', [hurt, effect('도적을 위협해 쫓아냅니다.'), effect('도적을 제압하고 손패 1장을 얻습니다.', { draw: 1 })], { label: '도적 상대하기' });
  test('C8', '양쪽의 적', '두 도적이 양옆에서 다가옵니다. 성공할 때까지 버텨야 합니다.', [hurt, effect('도적들을 쫓아냅니다.'), effect('도적들을 제압하고 손패 2장을 얻습니다.', { draw: 2 })], { repeat: 'until', label: '포위 돌파하기' });
  fixed('C9', '한 발 남은 권총', '탄환 한 발이 남은 리볼버를 발견했습니다.', { keep: true });
  fixed('C10', '상점 진열장', '진열장을 부수고 남은 물품을 챙깁니다.', { food: 2, draw: 1 });
  test('CJ', '떠돌이 권투 선수', '떠돌이 권투 선수가 대결을 제안합니다. 받아들이거나 거절할 수 있습니다.', [hurt, effect('식량 1을 얻습니다.', { food: 1 }), effect('식량 1을 얻고 이 카드를 보관합니다.', { food: 1, keep: true })], { optional: true, label: '대결 받아들이기' });
  test('CQ', '무장한 약탈자 무리', '무기를 뽑아 든 약탈자들이 몰려듭니다. 총 세 번 판정합니다.', [hurt, effect('약탈자 한 명을 쓰러뜨립니다.'), effect('달아날 틈을 발견합니다. 정해진 세 번의 판정은 계속합니다.')], { repeat: 'three', label: '약탈자들과 맞서기' });
  test('CK', '거대한 약탈자', '덩치 큰 약탈자가 기습합니다. 총 세 번 판정합니다.', [hurt, effect('상대에게 상처를 입힙니다.'), effect('상대를 제압합니다. 사건 종료 시 이 카드를 한 번 보관합니다.')], { repeat: 'three', label: '기습 막아내기' });
  events.CK.outcomes[2].keep = true;
  fixed('CA', '옛 경찰서', '버려진 경찰서를 수색해 남은 장비와 보급품을 챙깁니다.', { keep: true, draw: 1, food: 1 });

  fixed('D2', '쓸 만한 지도', '길이 표시된 지도를 찾았습니다. 덱 위 세 장을 버려 여정을 단축합니다.', { skip: 3 });
  test('D3', '별을 따라', '밤하늘의 별로 앞으로 갈 방향을 가늠합니다.', [nothing, effect('여정을 1장 줄입니다.', { skip: 1 }), effect('여정을 2장 줄입니다.', { skip: 2 })], { label: '별자리 읽기' });
  fixed('D4', '오래된 과학책', '황무지에서도 도움이 될 지식이 담긴 책을 찾았습니다.', { keep: true });
  fixed('D5', '풍요로운 숲', '먹을 수 있는 뿌리와 열매를 모읍니다.', { food: 2 });
  test('D6', '독이 있는 동물', '독이 있는 동물에게 쏘였습니다. 독에 대처해야 합니다.', [hurt, effect('독을 빼내 위기를 넘깁니다.'), effect('위기를 넘기고 이 카드를 보관합니다.', { keep: true })], { label: '독에 대처하기' });
  test('D7', '폐허 도시의 출구', '도적들이 뒤쫓는 가운데, 먼저 도시의 출구를 찾아야 합니다.', [hurt, safe, effect('빠져나오며 쓸 만한 물자를 찾습니다. 손패 1장을 얻습니다.', { draw: 1 })], { label: '출구 찾기' });
  test('D8', '급수탑 전망대', '식량 1을 쓰고 급수탑에 올라 주변의 길을 살펴볼 수 있습니다.', [nothing, effect('여정을 1장 줄입니다.', { skip: 1 }), effect('여정을 2장 줄입니다.', { skip: 2 })], { optional: true, cost: 1, label: '급수탑 오르기 · 식량 1' });
  fixed('D9', '여행자의 소문', '여행자에게 앞으로의 길에 관한 값진 소문을 들었습니다.', { keep: true });
  fixed('D10', '오래된 망원경', '멀리 살피는 데 쓸 수 있는 망원경을 찾았습니다.', { keep: true });
  test('DJ', '암호로 된 기록', '한 생존자가 남긴 책과 지도에 암호가 적혀 있습니다.', [nothing, effect('식량 3을 찾습니다.', { food: 3 }), effect('식량 3과 손패 1장을 얻습니다.', { food: 3, draw: 1 })], { label: '암호 해독하기' });
  card('DQ', '도서관의 생존자들', '버려진 도서관에서 생존자들을 만났습니다. 치료나 길 안내를 받을 수 있습니다.', { actions: [action('heal', '치료받기 · 부상 −1', { effects: { heal: 1 } }), action('directions', '길 묻기 · 여정 2장 단축', { effects: { skip: 2 } })] });
  test('DK', '구덩이 함정', '함정에 빠졌습니다. 최대 두 번 탈출을 시도하며, 성공하면 빠져나옵니다.', [effect('식량 1을 잃습니다.', { food: -1 }), effect('급조한 밧줄로 빠져나옵니다.'), effect('빠져나오고 이 카드를 보관합니다.', { keep: true })], { repeat: 'twice', label: '탈출 방법 찾기' });
  card('DA', '옛 약국', '남아 있는 의약품과 물자를 발견했습니다. 치료와 물자 확보를 각각 선택할 수 있습니다.', { actions: [action('both', '치료하고 물자 챙기기 · 부상 −1, 손패 2장', { effects: { heal: 1, draw: 2 } }), action('heal', '치료만 받기 · 부상 −1', { effects: { heal: 1 } }), action('supplies', '물자만 챙기기 · 손패 2장', { effects: { draw: 2 } }), pass] });

  const data = { suits, events, ids: Object.keys(events) };
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
  else root.SurvivalData = data;
})(typeof globalThis !== 'undefined' ? globalThis : this);
