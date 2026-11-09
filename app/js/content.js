// Everything the app says and offers, in one place.
// The menu follows docs/practice-guide.md. Crisis numbers were checked on the
// Ministry of Health, Labour and Welfare page on CONTACTS_CHECKED.

export const APP_VERSION = '0.1.0';

export const MODES = {
  rest: { name: 'まもる日', desc: '起きるのも考えるのもつらい', sheet: '★だけにします' },
  tune: { name: 'ととのえる日', desc: '動けるけれど、からだが重い', sheet: '毎日のメニューを出します' },
  expand: { name: 'ひろげる日', desc: 'ふだんどおり動ける', sheet: 'ふりかえりも開きます' },
};
export const MODE_ORDER = ['rest', 'tune', 'expand'];

// The daily menu. ★ (star) items are the ones to keep even on hard days.
export const MENU = {
  morning: [
    { id: 'm1', star: true, label: '同じ時刻に起きる', sub: '休日もずれは1時間以内' },
    { id: 'm2', star: true, label: '1時間以内に外の光をあびる', sub: 'ベランダや窓ぎわで数分でもいい' },
    { id: 'm3', star: true, label: '水を1杯のんで、何か食べる', sub: '' },
    { id: 'm4', star: false, label: '睡眠・気分・疲れを記録する', sub: 'チェックインで完了', auto: true },
  ],
  day: [
    { id: 'd1', star: true, label: '5分だけ外を歩く', sub: '' },
    { id: 'd2', star: false, label: '合計20〜30分歩く', sub: '少し息が上がるくらいの速さで' },
    { id: 'd3', star: false, label: '予定していた小さな活動を1つ', sub: '例：洗濯、5分の片付け、メール1通' },
    { id: 'd4', star: false, label: 'だれかと短くやりとりする', sub: 'あいさつやメッセージ1通でもいい' },
  ],
  night: [
    { id: 'n2', star: false, label: '寝る前に、ため息呼吸を5分', sub: '鼻から吸って、吸い足して、口から長く吐く', breath: true },
  ],
};
export const MENU_PARTS = [
  { key: 'morning', name: '朝' },
  { key: 'day', name: '日中' },
  { key: 'night', name: '夜' },
];

// On まもる日 only these three are shown. They share ids with the full menu,
// so a check carries over if the mode changes during the day.
export const REST_STARS = [
  { id: 'm2', label: '外の光を数分あびる', sub: 'ベランダや窓ぎわでもいい' },
  { id: 'm3', label: '水を1杯のんで、何か食べる', sub: '少しだけでいい' },
  { id: 'd1', label: '5分だけ外に出る', sub: '出られたら、それで十分' },
];

export const NIGHT_STAR = { label: '眠れなければ、一度布団を出る', sub: '20分ほど眠れなければ。眠くなってから戻る' };

// How each item reads in the record of what got done.
export const DONE_LABEL = {
  m1: '同じ時刻に起きた',
  m2: '外の光をあびた',
  m3: '水をのんで、何か食べた',
  m4: 'チェックインした',
  d1: '5分外に出た',
  d2: '20〜30分歩いた',
  d3: '小さな活動を1つした',
  d4: 'だれかとやりとりした',
  n1: 'できたことを書いた',
  n2: 'ため息呼吸をした',
  rv: '週1のふりかえりをした',
};

export const SLEEP_OPTIONS = [
  { value: '〜5', mid: 4.5 },
  { value: '5〜6', mid: 5.5 },
  { value: '6〜7', mid: 6.5 },
  { value: '7〜9', mid: 8 },
  { value: '9〜', mid: 9.5 },
];
export const SLEEP_MID = Object.fromEntries(SLEEP_OPTIONS.map((o) => [o.value, o.mid]));
export const SLEEP_LONG = ['7〜9', '9〜'];
export const SLEEP_SHORT = ['〜5', '5〜6'];

// つらいとき: check the body first, then look after it.
export const BODY = [
  { id: 'sleepy', label: '眠い' },
  { id: 'hungry', label: 'おなかが空いている' },
  { id: 'tired', label: '疲れている' },
  { id: 'unwell', label: '体調がよくない' },
  { id: 'lonely', label: '人と話していない' },
  { id: 'temp', label: '寒い・暑い' },
];
export const BODY_LABEL = Object.fromEntries(BODY.map((b) => [b.id, b.label]));

export const ACTS = {
  eyes: { label: '5分、目を閉じて座る', sub: '昼寝はせず、夜の眠りを守る', done: '目を閉じて休んだ' },
  lie: { label: '布団に入って、目を閉じる', sub: '眠れなくても、休めば十分', done: '布団で休んだ' },
  eat: { label: '水を1杯のんで、何か食べる', sub: '少しだけでいい', done: '水をのんで、何か食べた' },
  msg: { label: 'だれかに一言メッセージを送る', sub: '返事は待たなくていい', done: 'だれかに一言送った' },
  temp: { label: '1枚はおる・窓を開ける', sub: 'からだの温度を整える', done: 'からだの温度を整えた' },
  small: { label: '2分で終わることを1つやる', sub: '終わったら、できたに残ります', done: '2分で終わることをした' },
};

export const CONTACTS = [
  { id: 'inochi', name: '#いのちSOS', tel: '0120061338', display: '0120-061-338', hours: '毎日24時間・無料' },
  { id: 'yorisoi', name: 'よりそいホットライン', tel: '0120279338', display: '0120-279-338', hours: '24時間・無料' },
];
export const CONTACTS_CHECKED = '2026年11月8日';
export const MHLW_URL = 'https://www.mhlw.go.jp/mamorouyokokoro/';

// Weekly walking target (minutes) for weeks 1–4, then week 4 is kept.
export const WALK_PLAN = [50, 75, 120, 150];

// Two questions modelled on the PHQ-2. A total of 3 or more suggests talking to a doctor.
export const WEEKLY_QUESTIONS = [
  { id: 'q1', text: 'この2週間で、物事に興味がわかない、または楽しめない日は？' },
  { id: 'q2', text: 'この2週間で、気分が落ち込む、憂うつになる、または絶望的な気持ちになる日は？' },
];
export const WEEKLY_OPTIONS = ['全くない', '数日', '半分以上', 'ほとんど毎日'];
export const WEEKLY_THRESHOLD = 3;

export const CONSULT_SIGNS = [
  '気分の落ち込みや興味の低下が、ほぼ毎日2週間以上つづく',
  '仕事や家事に、はっきり支障が出ている',
  '眠れない・寝すぎる状態が2週間以上つづく',
  '4週間つづけても、まったく楽にならない',
];

export const REVIEW_PLANS = [
  { id: 'p1', label: '歩く日を1日増やす' },
  { id: 'p2', label: '寝る時刻を15分早める' },
  { id: 'p3', label: 'だれかに1通連絡する' },
  { id: 'p4', label: '自分で決める' },
];
export const REVIEW_SCALE = ['ぜんぜん', 'あまり', '半分', 'わりと', 'とても'];
