window.IMG_BASE = 'assets/img/';
/* =========================================================================
   КОЛОБОК · УДОМЛЯ — логика сайта (многостраничная версия)
   -------------------------------------------------------------------------
   • Корзина и настройки живут в localStorage → переходят между страницами
   • Пожелание к блюду у каждой позиции
   • Конструктор «Своя шаурма»
   • Заказ уходит сообщением на телефон заведения: WhatsApp / SMS / вебхук
   • Место под ЮKassa: PAY.provider = 'demo' | 'yookassa'
   ========================================================================= */

/* ---------- 1. ДАННЫЕ ЗАВЕДЕНИЯ (правятся и через панель ⚙) ---------- */
const DEFAULT_SETTINGS = {
  brand:      'КОЛОБОК',
  city:       'Удомля',
  phone:      '+7 (900) 473-20-35',
  phoneRaw:   '79004732035',
  whatsapp:   '79004732035',     // номер для WhatsApp и SMS (тот же, что на сайте)
  vk:         'https://vk.com/', // ← ссылка на группу ВК (уточняется)
  ymap:       'https://yandex.ru/maps/org/kolobok/245281342544/',
  gis:        'https://2gis.ru/udomlya/firm/70000001117739807',
  address:    'г. Удомля, ул. Космонавтов, 1а',
  hours:      'Ежедневно 11:00 – 21:00',   // ⚠ в понедельник часы уточняются
  hoursShort: '11:00–21:00',
  deliveryFrom: 700,
  deliveryFee:  99,
  minOrder:     300,
  eta:          '30–45 минут',
  cookTime:     '10–15 минут',
  orderWebhook: ''   // ← ссылка-вебхук, чтобы заказ приходил автоматически (см. README)
};

/* Оплата: 'demo' — поля карты без списания; 'yookassa' — после подключения эквайринга */
const PAY = { provider: 'demo', yookassaShopId: '', yookassaReturnUrl: '' };

const LS = 'kolobok_udomlya_v2';
let SETTINGS = Object.assign({}, DEFAULT_SETTINGS);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};

/* ---------- 2. ИЗОБРАЖЕНИЯ (в многостраничной версии — файлы, в одном файле — data URI) ---------- */
const IMG = window.IMG || {};
const IMG_BASE = window.IMG_BASE || '';
const IS_BUNDLE = !!window.__BUNDLE__;
const PAGE = document.body.dataset.page || 'index';
const imgSrc = key => IMG[key] || (IMG_BASE + key + '.jpg');

/* ---------- 3. МЕНЮ ---------- */
const CATS = [
  { id:'hits',     name:'Хиты',              emoji:'🔥' },
  { id:'shawarma', name:'Шаурма',            emoji:'🌯' },
  { id:'burgers',  name:'Бургеры и хот-доги',emoji:'🍔' },
  { id:'snacks',   name:'Кура-гриль и закуски', emoji:'🍗' },
  { id:'bakery',   name:'Выпечка',           emoji:'🥟' },
  { id:'combo',    name:'Комбо',             emoji:'🎁' },
  { id:'drinks',   name:'Напитки',           emoji:'🥤' }
];
const SIZE_SET  = [{n:'Стандарт',p:0},{n:'Большая',p:70},{n:'XL',p:140}];
const SPICY_SET = ['Не острая','Средняя','Острая'];
const EXTRAS    = [
  {n:'Двойной сыр',p:40},{n:'Бекон',p:60},{n:'Соус чесночный',p:30},
  {n:'Халапеньо',p:30},{n:'Морковь по-корейски',p:30},{n:'Доп. мясо',p:90}
];
const REMOVE_SET = ['Без лука','Без соуса','Без томата','Без капусты'];

const P = o => o;
const PRODUCTS = [
  P({id:'sh-klassik', cat:'shawarma', hits:1, name:'Шаурма классическая', desc:'Куриное филе гриль, свежие овощи, фирменный чесночный соус, тонкий лаваш', price:250, w:'320 г', img:'sh_klassik', badge:'Хит', opts:'full'}),
  P({id:'sh-syr', cat:'shawarma', hits:1, name:'Шаурма с сыром', desc:'Классика с двойной порцией тянущегося сыра — обжарка в прессе', price:290, w:'340 г', img:'sh_syr', opts:'full'}),
  P({id:'sh-ostraya', cat:'shawarma', name:'Шаурма острая', desc:'Чили, халапеньо и острый соус для тех, кто любит пожарче', price:280, w:'320 г', img:'sh_ostraya', badge:'🌶 Остро', opts:'full'}),
  P({id:'sh-firm', cat:'shawarma', hits:1, name:'Шаурма «Колобок» XL', desc:'Двойное мясо, двойной соус, двойная порция овощей и хрустящая корочка', price:390, w:'480 г', img:'sh_firmennaya', badge:'Хит', opts:'full'}),
  P({id:'sh-veg', cat:'shawarma', name:'Шаурма овощная', desc:'Запечённые овощи, сыр фета, соус на выбор — без мяса', price:230, w:'300 г', img:null, emoji:'🥗', opts:'full'}),
  P({id:'burger', cat:'burgers', name:'Бургер «Колобок»', desc:'Куриная котлета в хрустящей панировке, сыр, томат, салат, булочка с кунжутом', price:260, w:'280 г', img:'burger', opts:'full'}),
  P({id:'hotdog', cat:'burgers', name:'Хот-дог классический', desc:'Сосиска гриль, горчица, кетчуп, хрустящий лук', price:180, w:'220 г', img:'hotdog', opts:'basic'}),
  P({id:'hotdog-ch', cat:'burgers', name:'Хот-дог с сыром', desc:'Сосиска гриль, сырный соус, жареный лук', price:210, w:'240 г', img:null, emoji:'🌭', opts:'basic'}),
  P({id:'kura', cat:'snacks', hits:1, name:'Кура-гриль', desc:'Окорочок на гриле с пряными специями, лаваш и соус — то, за чем к нам приходят', price:390, w:'450 г', img:'kura', badge:'Хит', opts:'none'}),
  P({id:'fries', cat:'snacks', hits:1, name:'Картофель фри', desc:'Хрустящая соломка из отборного картофеля, соль, соус на выбор', price:130, w:'150 г', img:'fries', opts:'none'}),
  P({id:'wings', cat:'snacks', name:'Крылышки барбекю', desc:'6 шт. в глазури барбекю с кунжутом', price:290, w:'260 г', img:'wings', opts:'none'}),
  P({id:'nuggets', cat:'snacks', name:'Наггетсы', desc:'8 шт. из куриного филе, соус на выбор', price:170, w:'160 г', img:null, emoji:'🍗', opts:'none'}),
  P({id:'belyash', cat:'bakery', hits:1, name:'Беляш', desc:'Печём каждые два часа: сочная говядина, лук, тесто на кефире', price:110, w:'150 г', img:null, emoji:'🥟', opts:'basic'}),
  P({id:'samsa', cat:'bakery', name:'Самса с курицей', desc:'Слоёное тесто, сочная начинка, кунжут', price:120, w:'160 г', img:null, emoji:'🥟', opts:'basic'}),
  P({id:'pirog', cat:'bakery', name:'Пирожок с картошкой', desc:'Мягкое дрожжевое тесто и нежное пюре — как у бабушки', price:70, w:'120 г', img:null, emoji:'🥧', opts:'basic'}),
  P({id:'pirog-liver', cat:'bakery', name:'Пирожок с печенью', desc:'Домашняя начинка из куриной печени с луком', price:80, w:'120 г', img:null, emoji:'🥧', opts:'basic'}),
  P({id:'oladushki', cat:'bakery', name:'Оладушки к чаю', desc:'8 шт., как в отзывах гостей: пышные, с вареньем на выбор', price:150, w:'260 г', img:null, emoji:'🥞', opts:'basic'}),
  P({id:'combo-1', cat:'combo', hits:1, name:'Комбо «Сытный»', desc:'Шаурма классическая + картофель фри + напиток 0,4 л', price:420, old:490, w:'≈ 1 кг', img:'sh_klassik', badge:'Выгода 70 ₽', opts:'none'}),
  P({id:'combo-2', cat:'combo', name:'Комбо «Для двоих»', desc:'2 шаурмы классические + 2 фри + 2 напитка 0,4 л', price:760, old:890, w:'≈ 2 кг', img:'sh_syr', badge:'Выгода 130 ₽', opts:'none'}),
  P({id:'combo-3', cat:'combo', name:'Комбо «Кура-гриль»', desc:'Кура-гриль + лаваш + картофель фри + напиток 0,4 л', price:520, old:630, w:'≈ 1,2 кг', img:'kura', badge:'Выгода 110 ₽', opts:'none'}),
  P({id:'combo-4', cat:'combo', name:'Комбо «Пирожковая»', desc:'2 беляша + самса + оладушки + чай 0,4 л', price:340, old:400, w:'≈ 900 г', img:null, emoji:'🥟', badge:'Выгода 60 ₽', opts:'none'}),
  P({id:'lemonade', cat:'drinks', name:'Лимонад домашний', desc:'Лимон, мята, лёд — 0,4 л', price:110, w:'400 мл', img:'drink', opts:'basic'}),
  P({id:'tea', cat:'drinks', name:'Чай чёрный / зелёный', desc:'Чайник 0,4 л, сахар по желанию', price:90, w:'400 мл', img:null, emoji:'🍵', opts:'basic'}),
  P({id:'cola', cat:'drinks', name:'Кола / лимонад 0,5 л', desc:'Холодная бутылка на выбор', price:110, w:'500 мл', img:null, emoji:'🥤', opts:'basic'}),
  P({id:'sauce', cat:'drinks', name:'Соус в баночке', desc:'Чесночный, сырный, острый, кетчуп', price:40, w:'50 г', img:null, emoji:'🧄', opts:'none'})
];

/* ---------- 4. КОНСТРУКТОР «СВОЯ ШАУРМА» ---------- */
const BUILDER = {
  id: 'custom', name: 'Своя шаурма', emoji: '🌯', base: 250, w: 'от 320 г',
  groups: [
    { id:'size',  title:'Размер порции',   mode:'one',  def:0, items:[{n:'Стандарт',p:0},{n:'Большая',p:70},{n:'XL',p:140}] },
    { id:'meat',  title:'Мясо',            mode:'one',  def:0, items:[{n:'Курица',p:0},{n:'Говядина',p:60},{n:'Микс курица + говядина',p:80},{n:'Без мяса',p:-60}] },
    { id:'sauce', title:'Соусы (до 2)',    mode:'many', max:2, def:[0], items:[{n:'Чесночный',p:0},{n:'Сырный',p:20},{n:'Острый',p:0},{n:'Барбекю',p:0},{n:'Кетчуп',p:0}] },
    { id:'fill',  title:'Начинка (до 5)',  mode:'many', max:5, def:[], items:[{n:'Сыр',p:40},{n:'Бекон',p:60},{n:'Халапеньо',p:30},{n:'Морковь по-корейски',p:30},{n:'Маринованные огурчики',p:30},{n:'Ананас',p:40},{n:'Доп. мясо',p:90}] },
    { id:'spicy', title:'Острота',         mode:'one',  def:0, items:[{n:'Не острая',p:0},{n:'Средняя',p:0},{n:'Острая',p:0}] },
    { id:'remove',title:'Убрать из состава',mode:'many', def:[], max:4, items:[{n:'Без лука',p:0},{n:'Без капусты',p:0},{n:'Без томата',p:0},{n:'Без соуса',p:0}] }
  ]
};

/* ---------- 5. ОТЗЫВЫ И FAQ ---------- */
const REVIEWS = [
  { stars:5, text:'Иногда хочется не «модного» кафе, а просто места, где вкусно, спокойно и будто тебя ждали. «Колобок» — как раз такое. Взяла горячий чай и оладушки — и день сразу стал чуточку лучше. Обязательно загляну ещё, хочу попробовать все позиции из меню!', who:'Гость кафе', src:'отзыв с Яндекс.Карт', real:true },
  { stars:5, text:'Кафе просто супер!!! Потрясающий персонал, встретили с улыбкой и помогли с выбором, очень быстро принесли еду. Обязательно приду ещё раз!', who:'Гость кафе', src:'отзыв с Яндекс.Карт', real:true },
  { stars:5, text:'Очень понравилось. Персонал душевный, атмосфера сказочная. Еда вкусная.', who:'Гость кафе', src:'отзыв с Яндекс.Карт', real:true },
  { stars:5, text:'Берём еду из «Колобка» на обед всей сменой: кура-гриль, шаурма, выпечка. Готовят быстро, порции честные, цены приятные — и до дома доезжает горячим.', who:'Александр К.', src:'Удомля · доставка', real:false },
  { stars:5, text:'Собрал свою шаурму в конструкторе: говядина, сырный соус, халапеньо и без лука. Привезли ровно так, как заказал — приятно, когда пожелания доходят до кухни.', who:'Дмитрий С.', src:'Удомля · доставка', real:false },
  { stars:5, text:'Беляши и оладушки — отдельная любовь. Муж заказывает XL-шаурму, я беру выпечку и чай. Идеально, когда после работы не хочется готовить.', who:'Мария О.', src:'Удомля · самовывоз', real:false }
];

const FAQ = [
  { q:'Сколько идёт доставка по Удомле?', a:'В среднем {eta} — зависит от района и загрузки кухни. Точное время оператор подтвердит звонком.' },
  { q:'Как приходит мой заказ?', a:'Состав заказа формируется автоматически и уходит администратору сообщением на {phone} (WhatsApp или SMS). Мы перезваниваем и подтверждаем.' },
  { q:'Как можно оплатить?', a:'Картой онлайн на сайте, через СБП по QR-коду или наличными/картой курьеру. Онлайн-оплата подключается через ЮKassa.' },
  { q:'С какого заказа доставка бесплатная?', a:'От {from} по всему городу. Если сумма меньше — доставка {fee}. Минимальный заказ 300 ₽.' },
  { q:'Можно забрать заказ самому?', a:'Да. Выбирайте «Самовывоз»: заказ будет готов через {cook}, адрес — {address}.' },
  { q:'Можно убрать ингредиенты или написать пожелание?', a:'Да, в каждой позиции есть размер, острота, добавки, пункт «Убрать из состава» и поле «Пожелание к блюду». Всё это попадает в заказ и на кухню.' },
  { q:'Что такое «Своя шаурма»?', a:'Это конструктор: выбираете мясо, до 2 соусов, до 5 начинок, остроту и пишете пожелание. Цена считается сразу, блюдо добавляется в корзину как обычная позиция.' },
  { q:'Что если блюдо приехало не то?', a:'Позвоните нам сразу по номеру {phone} — заменим блюдо или вернём деньги.' }
];

/* ---------- 6. УТИЛИТЫ ---------- */
const PROMOS = { 'КОЛОБОК10':{type:'pct',v:10,label:'−10% по промокоду'}, 'ПЕРВЫЙ':{type:'pct',v:15,label:'−15% на первый заказ'} };
const rub = n => new Intl.NumberFormat('ru-RU').format(Math.round(n)) + ' ₽';
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const nl2br = s => esc(s).replace(/\n/g, '<br>');
const imgTag = p => p.img
  ? `<img src="${imgSrc(p.img)}" alt="${esc(p.name)}" loading="lazy">`
  : `<div class="ph">${p.emoji || '🍽'}</div>`;

let cart = store.get(LS + '_cart', []);
let promo = store.get(LS + '_promo', null);
let mode = 'delivery';
let activeCat = 'hits', searchQ = '';
let lastOrder = null, checkoutStep = 1;
let checkoutData = { name:'', phone:'', addr:'', ent:'', note:'', when:'Как можно скорее' };

/* ---------- 7. НАВИГАЦИЯ (один файл ↔ много страниц) ---------- */
function go(page) {
  const target = page === 'index' ? 'index.html' : page + '.html';
  if (IS_BUNDLE) location.hash = page === 'index' ? '#/' : '#/' + page;
  else location.href = target;
}
function currentPage() {
  if (!IS_BUNDLE) return PAGE;
  const h = (location.hash || '').replace(/^#\/?/, '').replace(/\.html$/, '');
  return h || 'index';
}
function showBundlePage() {
  if (!IS_BUNDLE) return;
  const slug = currentPage();
  $$('.page').forEach(p => p.classList.toggle('active-page', p.dataset.page === slug));
  paintNav(slug);
  window.scrollTo(0, 0);
  onPageReady(slug);
  observeReveals(document);
}

function paintNav(slug) {
  $$('nav.main a').forEach(a => a.classList.toggle('active', a.dataset.nav === slug));
}

/* ---------- 8. UI: тосты, «летящая» точка ---------- */
function toast(text, emoji) {
  const box = $('#toasts'); if (!box) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `${emoji ? `<span class="em">${emoji}</span>` : ''}<span>${esc(text)}</span>`;
  box.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 350); }, 2400);
}
function flyToCart(fromEl) {
  const cartBtn = $('#cartBtn'); if (!cartBtn || !fromEl) return;
  const a = fromEl.getBoundingClientRect(), b = cartBtn.getBoundingClientRect();
  const dot = document.createElement('div');
  dot.className = 'fly';
  dot.style.left = (a.left + a.width / 2 - 13) + 'px';
  dot.style.top  = (a.top + a.height / 2 - 13) + 'px';
  document.body.appendChild(dot);
  const dx = (b.left + b.width / 2) - (a.left + a.width / 2);
  const dy = (b.top + b.height / 2) - (a.top + a.height / 2);
  dot.animate([
    { transform:'translate(0,0) scale(1)', opacity:1 },
    { transform:`translate(${dx * .5}px,${dy * .5 - 90}px) scale(1.3)`, opacity:1, offset:.55 },
    { transform:`translate(${dx}px,${dy}px) scale(.35)`, opacity:.2 }
  ], { duration:780, easing:'cubic-bezier(.5,-0.2,.6,1)' }).onfinish = () => {
    dot.remove();
    const c = $('#cartCount');
    c.classList.remove('pulse'); void c.offsetWidth; c.classList.add('pulse');
    setTimeout(() => c.classList.remove('pulse'), 620);
  };
}

/* ---------- 9. КОРЗИНА ---------- */
function cartTotals() {
  const sub = cart.reduce((s, i) => s + i.price * i.qty, 0);
  let disc = 0;
  if (promo && PROMOS[promo]) disc = Math.round(sub * PROMOS[promo].v / 100);
  const afterDisc = sub - disc;
  const fee = (mode === 'pickup' || afterDisc === 0 || afterDisc >= SETTINGS.deliveryFrom) ? 0 : SETTINGS.deliveryFee;
  return { sub, disc, fee, total: afterDisc + fee };
}
function unitPrice(p, opts) {
  if (!opts) return p.price;
  let s = p.price;
  if (opts.size) s += (SIZE_SET.find(x => x.n === opts.size) || { p:0 }).p;
  (opts.extras || []).forEach(e => { const f = EXTRAS.find(x => x.n === e); if (f) s += f.p; });
  return s;
}
function optsText(o) {
  const a = [];
  if (o.size && o.size !== 'Стандарт') a.push('Размер: ' + o.size);
  if (o.spicy && o.spicy !== 'Не острая') a.push(o.spicy);
  (o.extras || []).forEach(e => a.push('+' + e));
  (o.remove || []).forEach(r => a.push(r));
  return a.join(' · ');
}
function addToCart(p, opts, qty, srcEl, wish) {
  wish = (wish || '').trim();
  const optKey = opts ? Object.entries(opts).filter(([, v]) => v && v !== 'none').map(([k, v]) => k + ':' + (Array.isArray(v) ? v.join('+') : v)).join('|') : '';
  const key = p.id + '#' + optKey + '#' + wish;
  const found = cart.find(i => i.key === key);
  const unit = unitPrice(p, opts);
  if (found) found.qty += qty;
  else cart.push({
    key, id: p.id, name: p.name, price: unit, base: p.price, qty,
    opts: opts ? optsText(opts) : '', wish,
    img: p.img || null, emoji: p.emoji || '🍽', w: p.w || ''
  });
  saveCart(); renderCart();
  if (srcEl) flyToCart(srcEl);
  toast(`${p.name} — в корзине${wish ? ' (с пожеланием)' : ''}`, '🧺');
}
function changeQty(key, d) {
  const it = cart.find(i => i.key === key); if (!it) return;
  it.qty += d;
  if (it.qty <= 0) cart = cart.filter(i => i.key !== key);
  saveCart(); renderCart(); if ($('#checkoutBody')) renderCheckout();
}
function removeItem(key) { cart = cart.filter(i => i.key !== key); saveCart(); renderCart(); if ($('#checkoutBody')) renderCheckout(); }
function saveCart() { store.set(LS + '_cart', cart); updateCartBadge(); if ($('#sideItems')) renderSide(); }
function updateCartBadge() {
  const n = cart.reduce((s, i) => s + i.qty, 0);
  const c = $('#cartCount'); if (c) c.textContent = n;
  const m = $('#mbCount'); if (m) m.textContent = n;
  const ms = $('#mbSum'); if (ms) ms.textContent = rub(cartTotals().sub);
}

function renderCart() {
  const body = $('#cartBody'); if (!body) return;
  if (!cart.length) {
    body.innerHTML = `<div class="dr-empty"><div class="em">🧺</div><b>Корзина пуста</b>Добавьте шаурму, куру-гриль или комбо — и мы привезём горячим.</div>`;
  } else {
    body.innerHTML = cart.map(i => `<div class="ci" data-key="${esc(i.key)}">
      <div class="ci-img">${i.img ? `<img src="${imgSrc(i.img)}" alt="">` : (i.emoji || '🍽')}</div>
      <div class="ci-main">
        <h4>${esc(i.name)}</h4>
        ${i.opts ? `<div class="ci-opts">${esc(i.opts)}</div>` : ''}
        ${i.wish ? `<div class="ci-wish">✍️ ${esc(i.wish)}</div>` : ''}
        <div class="ci-row">
          <div class="qty"><button data-q="-1">−</button><span>${i.qty}</span><button data-q="1">+</button></div>
          <span class="ci-price">${rub(i.price * i.qty)}</span>
          <button class="ci-del" data-del title="Удалить"><svg viewBox="0 0 24 24"><path d="M9 3h6l1 2h4v2H4V5h4l1-2zM6 9h12l-1 12H7L6 9z"/></svg></button>
        </div>
      </div></div>`).join('');
  }
  const t = cartTotals();
  if ($('#sumSub')) {
    $('#sumSub').textContent = rub(t.sub);
    $('#sumDelivery').innerHTML = t.fee ? rub(t.fee) : '<span style="color:#22B573;font-weight:700">бесплатно</span>';
    $('#sumTotal').textContent = rub(t.total);
    const dRow = $('#sumDiscRow');
    if (t.disc) { dRow.classList.remove('hidden'); $('#sumDisc').textContent = '−' + rub(t.disc); } else dRow.classList.add('hidden');
    const left = SETTINGS.deliveryFrom - t.sub, hint = $('#hoodHint');
    if (cart.length && t.fee && left > 0) { hint.classList.remove('hidden'); $('#hoodText').textContent = `До бесплатной доставки — ${rub(left)}`; }
    else hint.classList.add('hidden');
    $('#promoInput').value = promo || '';
    const btn = $('#toCheckout');
    btn.disabled = !cart.length; btn.style.opacity = cart.length ? 1 : .5;
  }
  updateCartBadge();
}
function openCart() { $('#overlay').classList.add('on'); $('#cartDrawer').classList.add('on'); document.body.classList.add('no-scroll'); renderCart(); }
function closeCart() {
  $('#overlay').classList.remove('on'); $('#cartDrawer').classList.remove('on');
  if (!$('.modal.on')) document.body.classList.remove('no-scroll');
}

/* ---------- 10. МЕНЮ: табы, сетка, хиты ---------- */
function productCard(p) {
  return `<article class="card reveal" data-id="${p.id}">
    <div class="card-img">
      ${imgTag(p)}
      ${p.badge ? `<span class="card-badge">${esc(p.badge)}</span>` : ''}
      <span class="card-w">${esc(p.w)}</span>
    </div>
    <div class="card-body">
      <h3>${esc(p.name)}</h3>
      <p>${esc(p.desc)}</p>
      <div class="card-foot">
        <div class="price">${rub(p.price)}${p.old ? `<span class="old">${rub(p.old)}</span>` : ''}</div>
        <button class="btn-add" data-add="${p.id}" aria-label="Добавить в корзину">
          <svg viewBox="0 0 24 24"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5z"/></svg>
        </button>
      </div>
    </div>
  </article>`;
}
function builderCard() {
  return `<article class="card reveal card-builder" data-builder="1">
    <div class="card-img">
      <div class="ph">🌯</div>
      <span class="card-badge">Конструктор</span>
      <span class="card-w">от 320 г</span>
    </div>
    <div class="card-body">
      <h3>Своя шаурма</h3>
      <p>Мясо, до 2 соусов, до 5 начинок, острота и ваше пожелание. Цена считается сразу.</p>
      <div class="card-foot">
        <div class="price">от ${rub(BUILDER.base)}</div>
        <button class="btn-add" data-builder="1" aria-label="Открыть конструктор">
          <svg viewBox="0 0 24 24"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5z"/></svg>
        </button>
      </div>
    </div>
  </article>`;
}
function renderTabs() {
  const el = $('#tabs'); if (!el) return;
  el.innerHTML = CATS.map(c => {
    const n = c.id === 'hits' ? PRODUCTS.filter(p => p.hits).length : PRODUCTS.filter(p => p.cat === c.id).length;
    return `<button class="tab ${activeCat === c.id && !searchQ ? 'active' : ''}" data-cat="${c.id}"><span>${c.emoji}</span>${c.name}<span class="cnt">${n}</span></button>`;
  }).join('');
}
function renderMenu() {
  const wrap = $('#products'); if (!wrap) return;
  let list;
  if (searchQ) { const q = searchQ.toLowerCase().trim(); list = PRODUCTS.filter(p => (p.name + ' ' + p.desc).toLowerCase().includes(q)); }
  else if (activeCat === 'hits') list = PRODUCTS.filter(p => p.hits);
  else list = PRODUCTS.filter(p => p.cat === activeCat);
  let html = list.map(productCard).join('');
  if (activeCat === 'shawarma' && !searchQ) html = builderCard() + html;
  wrap.innerHTML = html || `<div class="empty-menu"><b>Ничего не нашлось 🤷</b>Попробуйте другое слово — или посмотрите всё меню целиком.</div>`;
  observeReveals(wrap);
}
function renderHits() {
  const wrap = $('#hits'); if (!wrap) return;
  wrap.innerHTML = PRODUCTS.filter(p => p.hits).slice(0, 6).map(productCard).join('');
  observeReveals(wrap);
}

/* ---------- 11. КАРТОЧКА БЛЮДА (с пожеланием) ---------- */
let modalProduct = null, modalQty = 1;
let modalOpts = { size:'Стандарт', spicy:'Не острая', extras:[], remove:[] };
const O = 'on';

function openProduct(id) {
  const p = PRODUCTS.find(x => x.id === id); if (!p) return;
  modalProduct = p; modalQty = 1;
  modalOpts = { size:'Стандарт', spicy:'Не острая', extras:[], remove:[] };
  $('#productModalBody').innerHTML = modalHTML(p);
  openModal('#productModal');
  bindModalOpts();
}
function modalHTML(p) {
  const full = p.opts === 'full', basic = p.opts === 'basic';
  return `<div class="mc-grid">
    <div class="mc-img">${imgTag(p)}</div>
    <div class="mc-body">
      <h3>${esc(p.name)}</h3>
      <p class="mc-desc">${esc(p.desc)} · <b>${esc(p.w)}</b></p>

      ${full ? `<div class="opt-block"><label>Размер порции</label><div class="opt-pills" data-group="size">
        ${SIZE_SET.map(s => `<button class="pill ${modalOpts.size === s.n ? O : ''}" data-val="${s.n}">${s.n}${s.p ? ` <small>+${s.p} ₽</small>` : ' <small>базовый</small>'}</button>`).join('')}
      </div></div>` : ''}

      ${full || basic ? `<div class="opt-block"><label>Острота</label><div class="opt-pills" data-group="spicy">
        ${SPICY_SET.map(s => `<button class="pill ${modalOpts.spicy === s ? O : ''}" data-val="${s}">${s === 'Острая' ? '🌶 ' : ''}${s}</button>`).join('')}
      </div></div>` : ''}

      ${full ? `<div class="opt-block"><label>Добавить (по желанию)</label><div class="opt-pills" data-group="extras">
        ${EXTRAS.map(e => `<button class="pill ${modalOpts.extras.includes(e.n) ? O : ''}" data-val="${e.n}">${e.n} <small>+${e.p} ₽</small></button>`).join('')}
      </div></div>
      <div class="opt-block"><label>Убрать из состава</label><div class="opt-pills" data-group="remove">
        ${REMOVE_SET.map(r => `<button class="pill ${modalOpts.remove.includes(r) ? O : ''}" data-val="${r}">${r}</button>`).join('')}
      </div></div>` : ''}

      <div class="opt-block"><label>Пожелание к блюду <small style="text-transform:none;letter-spacing:0;color:var(--muted)">— передадим на кухню</small></label>
        <textarea class="wish-input" id="wishInput" rows="2" placeholder="Например: побольше соуса, обжарить посильнее, без лука"></textarea>
        <div class="opt-pills wish-chips">
          ${['Побольше соуса','Обжарить посильнее','Без лука','Острые специи','Порезать пополам'].map(w => `<button class="pill pill-sm" data-wish="${w}">${w}</button>`).join('')}
        </div>
      </div>

      <div class="mc-foot">
        <div class="mc-total" id="mcTotal">${rub(unitPrice(p, modalOpts))}</div>
        <div class="qty"><button data-mq="-1">−</button><span id="mcQty">1</span><button data-mq="1">+</button></div>
        <button class="btn btn-primary" id="mcAdd">
          <svg viewBox="0 0 24 24"><path d="M7 4h-2l-1 2h2l3.6 9.6L8.2 19h11v-2H10.4l1-2h6.9L21 7H6.2L5.4 4H7z"/></svg>
          В корзину
        </button>
      </div>
    </div>
  </div>`;
}
function bindModalOpts() {
  const body = $('#productModalBody');
  $$('.opt-pills', body).forEach(g => {
    const group = g.dataset.group; if (!group) return;
    g.addEventListener('click', e => {
      const b = e.target.closest('.pill'); if (!b) return;
      const v = b.dataset.val;
      if (group === 'size' || group === 'spicy') modalOpts[group] = v;
      else {
        const arr = modalOpts[group], i = arr.indexOf(v);
        if (i > -1) arr.splice(i, 1); else arr.push(v);
      }
      $$('.pill', g).forEach(x => x.classList.toggle('on',
        (group === 'size' || group === 'spicy') ? x.dataset.val === v : modalOpts[group].includes(x.dataset.val)));
      $('#mcTotal').textContent = rub(unitPrice(modalProduct, modalOpts) * modalQty);
    });
  });
  $$('[data-wish]', body).forEach(b => b.addEventListener('click', () => {
    const ta = $('#wishInput');
    ta.value = (ta.value ? ta.value.replace(/[,\s]+$/, '') + ', ' : '') + b.dataset.wish;
    b.classList.add('on');
  }));
  $$('[data-mq]', body).forEach(b => b.addEventListener('click', () => {
    modalQty = Math.max(1, modalQty + Number(b.dataset.mq));
    $('#mcQty').textContent = modalQty;
    $('#mcTotal').textContent = rub(unitPrice(modalProduct, modalOpts) * modalQty);
  }));
  $('#mcAdd').addEventListener('click', e => {
    addToCart(modalProduct, JSON.parse(JSON.stringify(modalOpts)), modalQty, e.currentTarget, $('#wishInput') ? $('#wishInput').value : '');
    closeModal('#productModal');
  });
}

/* ---------- 12. КОНСТРУКТОР «СВОЯ ШАУРМА» ---------- */
let bSel = null;
function builderPrice() {
  let s = BUILDER.base;
  BUILDER.groups.forEach(g => {
    if (g.mode === 'one') s += g.items[bSel[g.id]].p;
    else bSel[g.id].forEach(i => s += g.items[i].p);
  });
  return s;
}
function builderOptsText() {
  const parts = [];
  BUILDER.groups.forEach(g => {
    if (g.mode === 'one') {
      const it = g.items[bSel[g.id]];
      if (g.id === 'spicy' && it.n === 'Не острая') return;
      if (g.id === 'size' && it.n === 'Стандарт') return;
      parts.push(it.n);
    } else {
      bSel[g.id].forEach(i => parts.push(g.id === 'remove' ? g.items[i].n : '+' + g.items[i].n));
    }
  });
  return parts.join(' · ');
}
function openBuilder() {
  bSel = {};
  BUILDER.groups.forEach(g => { bSel[g.id] = g.mode === 'one' ? g.def : g.def.slice(); });
  $('#productModalBody').innerHTML = builderHTML();
  openModal('#productModal');
  bindBuilder();
}
function builderHTML() {
  return `<div class="mc-grid">
    <div class="mc-img"><div class="ph">🌯</div></div>
    <div class="mc-body">
      <h3>Своя шаурма</h3>
      <p class="mc-desc">Соберите блюдо под себя — цена считается сразу. Пожелание словами тоже передадим на кухню.</p>
      ${BUILDER.groups.map(g => `<div class="opt-block">
        <label>${g.title}${g.mode === 'one' ? '' : ` <small style="text-transform:none;letter-spacing:0;color:var(--muted)">— выберите ${g.max ? 'до ' + g.max : 'сколько угодно'}</small>`}</label>
        <div class="opt-pills" data-bg="${g.id}">
          ${g.items.map((it, i) => {
            const on = g.mode === 'one' ? bSel[g.id] === i : bSel[g.id].includes(i);
            return `<button class="pill ${on ? O : ''}" data-i="${i}">${it.n}${it.p ? ` <small>${it.p > 0 ? '+' : ''}${it.p} ₽</small>` : ''}</button>`;
          }).join('')}
        </div></div>`).join('')}
      <div class="opt-block"><label>Пожелание к блюду <small style="text-transform:none;letter-spacing:0;color:var(--muted)">— передадим на кухню</small></label>
        <textarea class="wish-input" id="wishInput" rows="2" placeholder="Например: побольше чесночного соуса, обжарить посильнее"></textarea>
        <div class="opt-pills wish-chips">
          ${['Побольше соуса','Обжарить посильнее','Порезать пополам','Побольше мяса'].map(w => `<button class="pill pill-sm" data-wish="${w}">${w}</button>`).join('')}
        </div>
      </div>
      <div class="mc-foot">
        <div class="mc-total" id="mcTotal">${rub(builderPrice())}</div>
        <div class="qty"><button data-mq="-1">−</button><span id="mcQty">1</span><button data-mq="1">+</button></div>
        <button class="btn btn-primary" id="mcAdd">В корзину</button>
      </div>
    </div>
  </div>`;
}
function bindBuilder() {
  const body = $('#productModalBody');
  $$('[data-bg]', body).forEach(g => {
    const conf = BUILDER.groups.find(x => x.id === g.dataset.bg);
    g.addEventListener('click', e => {
      const b = e.target.closest('.pill'); if (!b) return;
      const i = +b.dataset.i;
      if (conf.mode === 'one') bSel[conf.id] = i;
      else {
        const arr = bSel[conf.id], at = arr.indexOf(i);
        if (at > -1) arr.splice(at, 1);
        else { if (conf.max && arr.length >= conf.max) { toast(`Можно выбрать до ${conf.max}`, '⚠️'); return; } arr.push(i); }
      }
      $$('.pill', g).forEach(x => x.classList.toggle('on',
        conf.mode === 'one' ? +x.dataset.i === bSel[conf.id] : bSel[conf.id].includes(+x.dataset.i)));
      $('#mcTotal').textContent = rub(builderPrice() * modalQty);
    });
  });
  $$('[data-wish]', body).forEach(b => b.addEventListener('click', () => {
    const ta = $('#wishInput');
    ta.value = (ta.value ? ta.value.replace(/[,\s]+$/, '') + ', ' : '') + b.dataset.wish;
    b.classList.add('on');
  }));
  modalQty = 1;
  $$('[data-mq]', body).forEach(b => b.addEventListener('click', () => {
    modalQty = Math.max(1, modalQty + Number(b.dataset.mq));
    $('#mcQty').textContent = modalQty;
    $('#mcTotal').textContent = rub(builderPrice() * modalQty);
  }));
  $('#mcAdd').addEventListener('click', e => {
    const meat = BUILDER.groups[0].id === 'size' ? BUILDER.groups[1].items[bSel.meat].n : '';
    const p = { id:'custom', name:'Своя шаурма' + (meat && meat !== 'Курица' ? ' (' + meat.toLowerCase() + ')' : ''), price: builderPrice(), img:null, emoji:'🌯', w:'от 320 г' };
    addToCart(p, null, modalQty, e.currentTarget, $('#wishInput') ? $('#wishInput').value : '');
    // состав конструктора кладём в opts через отдельную строку
    const last = cart[cart.length - 1];
    const desc = builderOptsText();
    if (last && last.id === 'custom' && desc) { last.opts = desc; saveCart(); renderCart(); }
    closeModal('#productModal');
  });
}

/* ---------- 13. ОТЗЫВЫ И FAQ ---------- */
function renderReviews() {
  const track = $('#revTrack');
  if (track) {
    track.innerHTML = REVIEWS.slice(0, 5).map(r => `<div class="rev">
      <div class="rev-stars">${'★'.repeat(r.stars)}</div>
      <p>${esc(r.text)}</p>
      <div class="rev-who"><div class="ava">${r.real ? 'ЯК' : 'Г'}</div><div><b>${esc(r.who)}</b><span>${esc(r.src)}</span></div></div>
    </div>`).join('');
  }
  const grid = $('#revGrid');
  if (grid) {
    grid.innerHTML = REVIEWS.map(r => `<div class="rev rev-static">
      <div class="rev-stars">${'★'.repeat(r.stars)}</div>
      <p>${esc(r.text)}</p>
      <div class="rev-who"><div class="ava">${r.real ? 'ЯК' : 'Г'}</div><div><b>${esc(r.who)}</b><span>${esc(r.src)}</span></div></div>
    </div>`).join('');
  }
}
function renderFaq() {
  const box = $('#faq'); if (!box) return;
  const subst = s => s.replace(/\{(\w+)\}/g, (_, k) => SETTINGS[k] !== undefined ? SETTINGS[k] : '');
  box.innerHTML = FAQ.map(f => `<details class="qa reveal"><summary>${esc(f.q)}</summary><div class="ans">${esc(subst(f.a))}</div></details>`).join('');
}

/* ---------- 14. ОФОРМЛЕНИЕ ЗАКАЗА (страница checkout) ---------- */
function goCheckout() {
  if (!cart.length) { toast('Сначала добавьте блюда', '🧺'); return; }
  closeCart();
  if (currentPage() === 'checkout' && !IS_BUNDLE) { window.scrollTo({ top: 0, behavior: 'smooth' }); }
  else go('checkout');
}
function renderSide() {
  const box = $('#sideItems'); if (!box) return;
  const t = cartTotals();
  box.innerHTML = cart.length
    ? cart.map(i => `<div class="side-item"><span>${esc(i.name)}${i.qty > 1 ? ' ×' + i.qty : ''}${i.wish ? `<small>✍️ ${esc(i.wish)}</small>` : ''}</span><b>${rub(i.price * i.qty)}</b></div>`).join('')
    : `<p style="color:var(--ink-soft);font-size:14.5px">Корзина пуста. <a href="#" data-goto="menu" style="color:var(--orange-d);text-decoration:underline">Открыть меню</a></p>`;
  $('#sideTotal').textContent = rub(t.total);
}
function renderCheckout() {
  const b = $('#checkoutBody'); if (!b) return;
  renderSide();
  if (!cart.length && checkoutStep === 1) {
    b.innerHTML = `<div class="dr-empty" style="padding:40px 10px">
      <div class="em">🧺</div><b>Корзина пуста</b>
      <p style="margin:14px 0 20px">Добавьте блюда из меню — и вернитесь сюда, чтобы оформить доставку.</p>
      <a class="btn btn-primary" href="#" data-goto="menu">Перейти в меню</a></div>`;
    return;
  }
  const t = cartTotals();
  if (checkoutStep === 1) {
    const payBadge = PAY.provider === 'yookassa' ? 'ЮKassa' : 'оплата онлайн (демо)';
    b.innerHTML = `
      <div class="steps-ind">
        <div class="sind on"><i>1</i>Контакты и доставка</div>
        <div class="sind"><i>2</i>Оплата</div>
      </div>
      <div class="order-mini">
        <h4>Ваш заказ (${cart.reduce((s, i) => s + i.qty, 0)} поз.)</h4>
        ${cart.map(i => `<div class="om-line"><span>${esc(i.name)}${i.qty > 1 ? ` × ${i.qty}` : ''}${i.opts ? ` <small style="opacity:.7">(${esc(i.opts)})</small>` : ''}${i.wish ? `<br><small style="color:var(--orange-d)">✍️ ${esc(i.wish)}</small>` : ''}</span><b>${rub(i.price * i.qty)}</b></div>`).join('')}
        ${t.disc ? `<div class="om-line" style="color:#22B573"><span>Скидка по промокоду</span><b>−${rub(t.disc)}</b></div>` : ''}
        <div class="om-line"><span>Доставка</span><b>${t.fee ? rub(t.fee) : 'бесплатно'}</b></div>
        <div class="om-line tot"><span>Итого</span><span>${rub(t.total)}</span></div>
      </div>
      <div class="radio-cards" id="modeCards">
        <label class="rc ${mode === 'delivery' ? 'on' : ''}" data-mode="delivery"><span class="rc-dot"></span>
          <span><b>Доставка на дом</b><span>Курьер приедет за ${SETTINGS.eta} · бесплатно от ${rub(SETTINGS.deliveryFrom)}</span></span>
          <span class="rc-price">${t.fee ? rub(t.fee) : '0 ₽'}</span></label>
        <label class="rc ${mode === 'pickup' ? 'on' : ''}" data-mode="pickup"><span class="rc-dot"></span>
          <span><b>Самовывоз из кафе</b><span>${SETTINGS.address} · готово через ${SETTINGS.cookTime}</span></span>
          <span class="rc-price">0 ₽</span></label>
      </div>
      <div style="height:18px"></div>
      <div class="row-2">
        <div class="field" id="fName"><label>Как вас зовут *</label><input id="inName" placeholder="Например, Александр" autocomplete="name"><div class="msg">Укажите имя</div></div>
        <div class="field" id="fPhone"><label>Телефон *</label><input id="inPhone" placeholder="+7 (___) ___-__-__" inputmode="tel" autocomplete="tel"><div class="msg">Введите номер полностью</div></div>
      </div>
      ${mode === 'delivery' ? `
      <div class="field" id="fAddr"><label>Адрес доставки *</label><input id="inAddr" placeholder="Улица, дом, квартира" autocomplete="street-address"><div class="msg">Укажите улицу и дом</div></div>
      <div class="row-2">
        <div class="field"><label>Подъезд / этаж / код</label><input id="inEnt" placeholder="2 подъезд, 5 этаж, код 1234"></div>
        <div class="field"><label>Когда привезти</label><select id="inTime"><option>Как можно скорее</option><option>Ко времени</option></select></div>
      </div>` : `
      <div class="field"><label>Когда заберёте</label><select id="inTime"><option>Как можно скорее</option><option>Ко времени</option></select></div>`}
      <div class="field"><label>Комментарий к заказу</label><textarea id="inNote" rows="2" placeholder="Домофон не работает, позвоните…"></textarea></div>
      <label class="consent"><input type="checkbox" id="inAgree"><span>Я согласен с <a href="#" data-legal="terms">условиями заказа</a> и даю согласие на <a href="#" data-legal="privacy">обработку персональных данных</a></span></label>
      <button class="btn btn-primary btn-block" id="toStep2" style="margin-top:20px">Перейти к оплате · ${rub(t.total)}</button>
      <p style="text-align:center;font-size:12.5px;color:#9C8C82;margin-top:12px">Способ оплаты выберете на следующем шаге (${payBadge})</p>`;

    $$('#modeCards .rc').forEach(c => c.addEventListener('click', () => {
      if (mode === c.dataset.mode) return;
      const keep = { name: $('#inName')?.value || '', phone: $('#inPhone')?.value || '', addr: $('#inAddr')?.value || '', note: $('#inNote')?.value || '' };
      mode = c.dataset.mode; renderCheckout();
      if (keep.name) $('#inName').value = keep.name;
      if (keep.phone) $('#inPhone').value = keep.phone;
      if (keep.addr && $('#inAddr')) $('#inAddr').value = keep.addr;
      if (keep.note) $('#inNote').value = keep.note;
    }));
    maskPhone($('#inPhone'));
    $('#toStep2').addEventListener('click', validateStep1);
  } else if (checkoutStep === 2) {
    b.innerHTML = `
      <div class="steps-ind">
        <div class="sind on"><i>✓</i>Контакты и доставка</div>
        <div class="sind on"><i>2</i>Оплата</div>
      </div>
      <div class="order-mini">
        <h4>Итого к оплате</h4>
        <div class="om-line"><span>Блюда и доставка</span><b>${rub(t.total)}</b></div>
        <div class="om-line tot"><span>Итого</span><span>${rub(t.total)}</span></div>
      </div>
      <div class="radio-cards" id="payCards">
        <label class="rc on" data-pay="card"><span class="rc-dot"></span><span><b>Картой онлайн${PAY.provider === 'yookassa' ? ' · ЮKassa' : ''}</b><span>Безопасная оплата, чек придёт на телефон</span></span><span class="rc-price">💳</span></label>
        <label class="rc" data-pay="sbp"><span class="rc-dot"></span><span><b>СБП по QR-коду</b><span>Через приложение банка</span></span><span class="rc-price">📱</span></label>
        <label class="rc" data-pay="cash"><span class="rc-dot"></span><span><b>${mode === 'pickup' ? 'При получении' : 'Курьеру при получении'}</b><span>Наличными или картой</span></span><span class="rc-price">💵</span></label>
      </div>
      <div id="cardFields" style="margin-top:18px">
        <div class="field"><label>Номер карты</label><input id="inCard" placeholder="0000 0000 0000 0000" inputmode="numeric" maxlength="19"><div class="msg">Введите 16 цифр</div></div>
        <div class="row-2">
          <div class="field"><label>Срок действия</label><input id="inExp" placeholder="ММ/ГГ" maxlength="5" inputmode="numeric"></div>
          <div class="field"><label>CVC</label><input id="inCvc" placeholder="•••" maxlength="3" inputmode="numeric" type="password"></div>
        </div>
        <p style="font-size:12.5px;color:#9C8C82">Демо-режим: реальные деньги не списываются. ${PAY.provider === 'yookassa' ? 'ЮKassa подключена.' : 'ЮKassa подключается — тогда оплата станет настоящей, а чек придёт автоматически.'}</p>
      </div>
      <div style="display:flex;gap:12px;margin-top:22px">
        <button class="btn btn-ghost" id="backStep" style="flex:0 0 auto;border-color:rgba(25,17,16,.2);color:#191110">Назад</button>
        <button class="btn btn-primary" id="payBtn" style="flex:1">${t.total === 0 ? 'Оформить заказ' : 'Оплатить ' + rub(t.total)}</button>
      </div>`;
    $$('#payCards .rc').forEach(c => c.addEventListener('click', () => {
      $$('#payCards .rc').forEach(x => x.classList.remove('on'));
      c.classList.add('on');
      $('#cardFields').style.display = (c.dataset.pay === 'cash' || c.dataset.pay === 'sbp') ? 'none' : 'block';
      $$('#cardFields input').forEach(i => i.disabled = c.dataset.pay !== 'card');
      $('#payBtn').textContent = c.dataset.pay === 'cash' ? 'Подтвердить заказ'
        : (c.dataset.pay === 'sbp' ? 'Оформить заказ' : 'Оплатить ' + rub(cartTotals().total));
    }));
    maskCard($('#inCard')); maskExp($('#inExp'));
    $('#backStep').addEventListener('click', () => { checkoutStep = 1; renderCheckout(); });
    $('#payBtn').addEventListener('click', submitOrder);
  }
}
function maskPhone(input) {
  if (!input) return;
  input.addEventListener('input', () => {
    let d = input.value.replace(/\D/g, '');
    if (d.startsWith('8')) d = '7' + d.slice(1);
    if (!d.startsWith('7')) d = '7' + d;
    d = d.slice(0, 11);
    let out = '+7';
    if (d.length > 1) out += ' (' + d.slice(1, 4);
    if (d.length >= 4) out += ') ' + d.slice(4, 7);
    if (d.length >= 7) out += '-' + d.slice(7, 9);
    if (d.length >= 9) out += '-' + d.slice(9, 11);
    input.value = out;
  });
}
function maskCard(input) { if (input) input.addEventListener('input', () => { input.value = input.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim(); }); }
function maskExp(input) { if (input) input.addEventListener('input', () => { let d = input.value.replace(/\D/g, '').slice(0, 4); input.value = d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d; }); }
function markField(id, bad) { const f = $('#' + id); if (f) f.classList.toggle('err', !!bad); }

function validateStep1() {
  const name = $('#inName').value.trim();
  const phone = $('#inPhone').value.replace(/\D/g, '');
  const addr = mode === 'delivery' ? ($('#inAddr') ? $('#inAddr').value.trim() : '') : 'ok';
  markField('fName', name.length < 2);
  markField('fPhone', phone.length !== 11);
  markField('fAddr', mode === 'delivery' && addr.length < 4);
  if (name.length < 2 || phone.length !== 11 || (mode === 'delivery' && addr.length < 4)) { toast('Проверьте выделенные поля', '⚠️'); return; }
  if (!$('#inAgree').checked) { toast('Нужно согласие на обработку данных', '⚠️'); return; }
  checkoutData = {
    name, phone: $('#inPhone').value,
    addr: mode === 'delivery' ? addr : '',
    ent: $('#inEnt') ? $('#inEnt').value : '',
    note: $('#inNote') ? $('#inNote').value : '',
    when: $('#inTime') ? $('#inTime').value : 'Как можно скорее'
  };
  checkoutStep = 2; renderCheckout();
}
function submitOrder() {
  const pay = $('#payCards .rc.on') ? $('#payCards .rc.on').dataset.pay : 'cash';
  const btn = $('#payBtn'); if (btn) { btn.textContent = 'Отправляем заказ…'; btn.disabled = true; }
  setTimeout(() => {
    const t = cartTotals();
    lastOrder = {
      num: 'К-' + String(Math.floor(1000 + Math.random() * 9000)),
      items: cart.slice(), total: t.total, sub: t.sub, disc: t.disc, fee: t.fee,
      mode, pay,
      name: checkoutData.name, phone: checkoutData.phone,
      addr: checkoutData.addr, ent: checkoutData.ent,
      note: checkoutData.note, when: checkoutData.when,
      eta: mode === 'pickup' ? SETTINGS.cookTime : SETTINGS.eta,
      provider: PAY.provider
    };
    sendOrderToOwner(lastOrder);
    cart = []; promo = null; store.set(LS + '_promo', null); saveCart();
    showSuccess();
  }, 1300);
}

/* ---------- 15. ОТПРАВКА ЗАКАЗА ВЛАДЕЛЬЦУ НА ТЕЛЕФОН ---------- */
function orderText(o) {
  return `🟠 НОВЫЙ ЗАКАЗ ${o.num} — кафе «${SETTINGS.brand}», ${SETTINGS.city}\n`
    + `———\n`
    + o.items.map(i => `• ${i.name}${i.qty > 1 ? ' ×' + i.qty : ''}${i.opts ? '\n   состав: ' + i.opts : ''}${i.wish ? '\n   пожелание: ' + i.wish : ''} — ${Math.round(i.price * i.qty)} ₽`).join('\n')
    + `\n———\n`
    + `Блюда: ${Math.round(o.sub)} ₽${o.disc ? `\nСкидка: −${Math.round(o.disc)} ₽` : ''}${o.fee ? `\nДоставка: ${Math.round(o.fee)} ₽` : '\nДоставка: бесплатно'}`
    + `\nИТОГО: ${Math.round(o.total)} ₽`
    + `\n${o.mode === 'pickup' ? 'Самовывоз из кафе' : 'Доставка: ' + o.addr + (o.ent ? ', ' + o.ent : '')}`
    + `\nИмя: ${o.name}\nТелефон: ${o.phone}\nКогда: ${o.when}`
    + `${o.note ? '\nКомментарий: ' + o.note : ''}`
    + `\nОплата: ${({ card:'картой онлайн', sbp:'СБП', cash:'при получении' })[o.pay] || o.pay}`;
}
function waLink(text) { return `https://wa.me/${SETTINGS.whatsapp}?text=${encodeURIComponent(text)}`; }
function smsLink(text) { return `sms:+${SETTINGS.phoneRaw}?body=${encodeURIComponent(text)}`; }

/* Автоматическая отправка на телефон владельца (если задан вебхук в панели ⚙) */
function sendOrderToOwner(order) {
  if (!SETTINGS.orderWebhook) return;
  try {
    fetch(SETTINGS.orderWebhook, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order, text: orderText(order), phone: SETTINGS.phone, sentAt: new Date().toISOString() })
    });
  } catch (e) {}
}

function showSuccess() {
  const o = lastOrder;
  const text = orderText(o);
  const payNames = { card:'оплачено картой онлайн', sbp:'оплата через СБП', cash:'оплата при получении' };
  $('#checkoutBody').innerHTML = `
    <div class="success">
      <div class="ok-circle"><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5"/></svg></div>
      <h3>Заказ принят!</h3>
      <span class="ok-num">Заказ ${o.num}</span>
      <p>${o.name ? esc(o.name) + ', спасибо' : 'Спасибо'}! Мы уже ставим мясо на гриль. Перезвоним по номеру ${esc(o.phone)} для подтверждения.</p>
      <div class="eta-box"><span class="em">🛵</span><span><b>${o.mode === 'pickup' ? 'Будет готов через ' + o.eta : 'Доставим за ' + o.eta}</b><span>${o.mode === 'pickup' ? 'Забрать: ' + SETTINGS.address : 'Адрес: ' + esc(o.addr) + (o.ent ? ', ' + esc(o.ent) : '')}</span></span></div>
      <p style="margin-top:14px;font-size:14px">Сумма заказа: <b>${rub(o.total)}</b> · ${payNames[o.pay]}</p>

      <div class="send-box">
        <b>Осталось отправить заказ нам на телефон</b>
        <span>${SETTINGS.orderWebhook ? 'Заказ уже ушёл автоматически на ' + esc(SETTINGS.phone) + '. Можно продублировать:' : 'Нажмите кнопку — сообщение с составом заказа уйдёт на ' + esc(SETTINGS.phone) + ':'}</span>
        <div class="send-actions">
          <a class="btn btn-primary" id="waLink" target="_blank" rel="noopener">Отправить в WhatsApp</a>
          <a class="btn btn-ghost" id="smsLink">Отправить SMS</a>
          <button class="btn btn-ghost" id="copyOrder">Скопировать заказ</button>
        </div>
      </div>

      <div class="succ-actions">
        <a class="btn btn-primary" href="#" data-goto="menu">Заказать ещё</a>
        <button class="btn btn-ghost" id="closeSucc">Готово</button>
      </div>
      <textarea id="orderText" style="position:absolute;left:-9999px" readonly>${esc(text)}</textarea>
    </div>`;
  $('#waLink').href = waLink(text);
  $('#smsLink').href = smsLink(text);
  $('#copyOrder').addEventListener('click', () => {
    const ta = $('#orderText'); ta.select();
    try { navigator.clipboard.writeText(text); } catch (e) { try { document.execCommand('copy'); } catch (e2) {} }
    toast('Заказ скопирован — можно вставить в любой мессенджер', '📋');
  });
  $('#closeSucc').addEventListener('click', () => go('index'));
  renderSide();
  confetti();
  updateCartBadge();
}

/* ---------- 16. КОНФЕТТИ ---------- */
function confetti() {
  const cvs = $('#confetti'); if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cvs.width = innerWidth * dpr; cvs.height = innerHeight * dpr; ctx.scale(dpr, dpr);
  const colors = ['#FF7A18','#FFB020','#E23E2B','#22B573','#FFF1DC','#FFD79A'];
  const parts = Array.from({ length: 130 }, () => ({
    x: innerWidth / 2 + (Math.random() - .5) * 220, y: innerHeight / 2 - 60 + (Math.random() - .5) * 60,
    vx: (Math.random() - .5) * 13, vy: -Math.random() * 13 - 4,
    s: 5 + Math.random() * 8, r: Math.random() * 6.28, vr: (Math.random() - .5) * .3,
    c: colors[(Math.random() * colors.length) | 0], life: 0
  }));
  let frames = 0;
  (function loop() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    parts.forEach(p => {
      p.vy += .38; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.vx *= .995; p.life++;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
      ctx.globalAlpha = Math.max(0, 1 - p.life / 140);
      ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * .6); ctx.restore();
    });
    if (++frames < 150) requestAnimationFrame(loop); else ctx.clearRect(0, 0, innerWidth, innerHeight);
  })();
}

/* ---------- 17. МОДАЛКИ ---------- */
function openModal(sel) { const m = $(sel); if (!m) return; m.classList.add('on'); $('#overlay').classList.add('on'); document.body.classList.add('no-scroll'); }
function closeModal(sel) {
  const m = $(sel); if (!m) return;
  m.classList.remove('on');
  if (!$('.modal.on') && !$('#cartDrawer.on')) $('#overlay').classList.remove('on');
  if (!$('.modal.on')) document.body.classList.remove('no-scroll');
}
const LEGAL = {
  privacy: `<h3>Политика конфиденциальности</h3>
    <p>Настоящая политика описывает, как кафе «${DEFAULT_SETTINGS.brand}» (г. ${DEFAULT_SETTINGS.city}) обрабатывает персональные данные посетителей сайта.</p>
    <h4>1. Какие данные мы собираем</h4><p>Имя, номер телефона, адрес доставки, комментарий и пожелания к заказу — только то, что вы указываете сами.</p>
    <h4>2. Зачем</h4><p>Чтобы приготовить и доставить заказ, связаться с вами при уточнении деталей и передать данные курьеру.</p>
    <h4>3. Как передаются</h4><p>Состав заказа отправляется администратору кафе по защищённому каналу мессенджера или платёжного сервиса. Третьим лицам данные не передаются.</p>
    <h4>4. Хранение и удаление</h4><p>Данные хранятся не дольше, чем нужно для выполнения заказа. Запросить удаление можно по телефону из раздела «Контакты».</p>
    <p style="margin-top:14px;font-size:13px;color:#9C8C82">Типовой шаблон для прототипа — перед запуском укажите реквизиты ИП/ООО и согласуйте текст с юристом.</p>`,
  terms: `<h3>Условия заказа и доставки</h3>
    <h4>1. Оформление</h4><p>Заказ считается принятым после подтверждения оператором по телефону или в мессенджере.</p>
    <h4>2. Доставка</h4><p>По г. Удомля. Бесплатно от ${SETTINGS.deliveryFrom} ₽, иначе ${SETTINGS.deliveryFee} ₽. Среднее время — ${SETTINGS.eta}.</p>
    <h4>3. Оплата</h4><p>Картой онлайн (через ЮKassa после подключения), СБП или при получении.</p>
    <h4>4. Отмена и возврат</h4><p>Отменить можно до начала приготовления. Если блюдо приехало не то — заменим или вернём деньги.</p>`
};

/* ---------- 18. ПАНЕЛЬ ВЛАДЕЛЬЦА ---------- */
function openSettings() {
  $('#settingsBody').innerHTML = `
    <p style="font-size:14px;color:#5B4A44;margin-bottom:18px">Данные показываются на всём сайте: телефон, адрес, часы, ссылки, условия доставки. Меняйте здесь — применяется сразу и сохраняется.</p>
    <div class="row-2">
      <div class="field"><label>Название</label><input id="stBrand" value="${esc(SETTINGS.brand)}"></div>
      <div class="field"><label>Город</label><input id="stCity" value="${esc(SETTINGS.city)}"></div>
    </div>
    <div class="row-2">
      <div class="field"><label>Телефон на сайте</label><input id="stPhone" value="${esc(SETTINGS.phone)}"></div>
      <div class="field"><label>Телефон для WhatsApp/SMS (цифры)</label><input id="stPhoneRaw" value="${esc(SETTINGS.whatsapp)}"></div>
    </div>
    <div class="field"><label>Адрес кафе</label><input id="stAddr" value="${esc(SETTINGS.address)}"></div>
    <div class="row-2">
      <div class="field"><label>Часы работы</label><input id="stHours" value="${esc(SETTINGS.hours)}"></div>
      <div class="field"><label>Время доставки</label><input id="stEta" value="${esc(SETTINGS.eta)}"></div>
    </div>
    <div class="row-2">
      <div class="field"><label>Бесплатная доставка от, ₽</label><input id="stFrom" type="number" value="${SETTINGS.deliveryFrom}"></div>
      <div class="field"><label>Цена доставки, ₽</label><input id="stFee" type="number" value="${SETTINGS.deliveryFee}"></div>
    </div>
    <div class="field"><label>Ссылки: ВК / Яндекс.Карты / 2ГИС</label>
      <input id="stVk" value="${esc(SETTINGS.vk)}" placeholder="https://vk.com/…" style="margin-bottom:8px">
      <input id="stYmap" value="${esc(SETTINGS.ymap)}" placeholder="Яндекс.Карты" style="margin-bottom:8px">
      <input id="stGis" value="${esc(SETTINGS.gis)}" placeholder="2ГИС">
    </div>
    <div class="field"><label>Куда присылать заказы автоматически (вебхук)</label>
      <input id="stWebhook" value="${esc(SETTINGS.orderWebhook)}" placeholder="Ссылка от Google Apps Script / Formspree / вашего бота">
      <div class="hint-small">Если оставить пустым — заказ отправляется кнопкой WhatsApp/SMS на номер выше. Подробная инструкция — в README (5 минут на настройку).</div>
    </div>
    <div class="row-2" style="margin-top:6px">
      <button class="btn btn-primary" id="stSave">Сохранить</button>
      <button class="btn btn-ghost" style="border-color:rgba(25,17,16,.2);color:#191110" id="stReset">Сбросить к исходным</button>
    </div>`;
  $('#stSave').addEventListener('click', () => {
    SETTINGS.brand = $('#stBrand').value.trim() || SETTINGS.brand;
    SETTINGS.city = $('#stCity').value.trim();
    SETTINGS.phone = $('#stPhone').value.trim();
    SETTINGS.whatsapp = $('#stPhoneRaw').value.replace(/\D/g, '');
    SETTINGS.phoneRaw = SETTINGS.whatsapp;
    SETTINGS.address = $('#stAddr').value.trim();
    SETTINGS.hours = $('#stHours').value.trim();
    SETTINGS.eta = $('#stEta').value.trim();
    SETTINGS.deliveryFrom = +$('#stFrom').value || 0;
    SETTINGS.deliveryFee = +$('#stFee').value || 0;
    SETTINGS.vk = $('#stVk').value.trim();
    SETTINGS.ymap = $('#stYmap').value.trim();
    SETTINGS.gis = $('#stGis').value.trim();
    SETTINGS.orderWebhook = $('#stWebhook').value.trim();
    store.set(LS + '_settings', SETTINGS);
    applySettings(); renderCart(); renderCheckout(); renderFaq();
    toast('Данные сохранены', '✅'); closeModal('#settingsModal');
  });
  $('#stReset').addEventListener('click', () => {
    SETTINGS = Object.assign({}, DEFAULT_SETTINGS);
    store.set(LS + '_settings', SETTINGS);
    applySettings(); renderCart(); renderFaq(); closeModal('#settingsModal');
    toast('Вернули исходные данные', '↩️');
  });
  openModal('#settingsModal');
}
function applySettings() {
  const map = { phone:'phone', address:'address', hours:'hours', brand:'brand', city:'city', from:'deliveryFrom', fee:'deliveryFee', eta:'eta', cook:'cookTime' };
  $$('[data-set]').forEach(el => {
    const k = el.dataset.set;
    if (k === 'phone') { el.textContent = SETTINGS.phone; if (el.tagName === 'A') el.href = 'tel:+' + SETTINGS.phoneRaw; return; }
    if (k in map) { const v = SETTINGS[map[k]]; if (k === 'from') el.textContent = rub(v); else if (k === 'fee') el.textContent = rub(v); else el.textContent = v; return; }
    if (k === 'vk' && el.tagName === 'A') el.href = SETTINGS.vk || '#';
    if (k === 'wa' && el.tagName === 'A') el.href = 'https://wa.me/' + SETTINGS.whatsapp;
    if (k === 'ymap' && el.tagName === 'A') el.href = SETTINGS.ymap || '#';
    if (k === 'gis' && el.tagName === 'A') el.href = SETTINGS.gis || '#';
  });
  const hs = $('#heroHours'); if (hs) hs.textContent = SETTINGS.hoursShort;
  document.title = document.title.replace(/—.*$/, '— Кафе «' + SETTINGS.brand + '», ' + SETTINGS.city);
  updateOpenStatus();
}
function updateOpenStatus() {
  const chip = $('#openChip'); if (!chip) return;
  const m = (SETTINGS.hours || '').match(/(\d{1,2}):(\d{2})\D+(\d{1,2}):(\d{2})/);
  const dot = chip.querySelector('.dot-live'), txt = chip.querySelector('[data-open-text]');
  if (!m) { chip.classList.add('hidden'); return; }
  const from = +m[1] * 60 + +m[2], to = +m[3] * 60 + +m[4];
  const now = new Date(), cur = now.getHours() * 60 + now.getMinutes();
  const open = from <= to ? (cur >= from && cur < to) : (cur >= from || cur < to);
  const pad = n => String(n).padStart(2, '0');
  if (txt) txt.innerHTML = open
    ? `Сейчас открыто · работаем до ${pad(Math.floor(to / 60))}:${pad(to % 60)}`
    : `Сейчас закрыто · откроем в ${pad(Math.floor(from / 60))}:${pad(from % 60)}`;
  if (dot) dot.style.background = open ? '#39D07B' : '#E23E2B';
}

/* ---------- 19. АНИМАЦИИ ПРИ СКРОЛЛЕ ---------- */
let revealObserver;
function observeReveals(root) {
  const nodes = $$('.reveal', root || document);
  if (!('IntersectionObserver' in window)) { nodes.forEach(e => e.classList.add('in')); return; }
  if (!revealObserver) {
    revealObserver = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      const i = Array.from(e.target.parentNode.children).indexOf(e.target);
      e.target.style.transitionDelay = Math.min(i, 8) * 55 + 'ms';
      e.target.classList.add('in');
      revealObserver.unobserve(e.target);
    }), { threshold:.1, rootMargin:'0px 0px -40px 0px' });
  }
  nodes.forEach(e => { if (!e.classList.contains('in')) revealObserver.observe(e); });
}
function counters() {
  $$('[data-count]').forEach(el => {
    if (el.dataset.done) return;
    const to = +el.dataset.count, suffix = el.dataset.suffix || '';
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      io.disconnect(); el.dataset.done = 1;
      const t0 = performance.now(), dur = 1300;
      (function step(t) {
        const k = Math.min(1, (t - t0) / dur), eased = 1 - Math.pow(1 - k, 3);
        el.textContent = Math.round(to * eased) + suffix;
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    }), { threshold:.6 });
    io.observe(el);
  });
}

/* ---------- 20. ОБРАТНАЯ СВЯЗЬ (страница контактов) ---------- */
function bindFeedback() {
  const form = $('#feedbackForm'); if (!form) return;
  const text = () => `💬 Сообщение с сайта кафе «${SETTINGS.brand}»\nИмя: ${$('#fbName').value.trim()}\nТелефон: ${$('#fbPhone').value.trim()}\nСообщение: ${$('#fbText').value.trim()}`;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = $('#fbName').value.trim(), phone = $('#fbPhone').value.replace(/\D/g, ''), msg = $('#fbText').value.trim();
    markField('fbNameF', name.length < 2); markField('fbPhoneF', phone.length !== 11);
    $('#fbText').parentNode.classList.toggle('err', msg.length < 3);
    if (name.length < 2 || phone.length !== 11 || msg.length < 3) { toast('Проверьте поля формы', '⚠️'); return; }
    const body = text();
    if (SETTINGS.orderWebhook) sendOrderToOwner({ type:'feedback', text: body });
    window.open(waLink(body), '_blank');
  });
  $('#fbSms').addEventListener('click', () => {
    const body = text();
    if (SETTINGS.orderWebhook) sendOrderToOwner({ type:'feedback', text: body });
    location.href = smsLink(body);
  });
  maskPhone($('#fbPhone'));
}

/* ---------- 21. ГОТОВНОСТЬ СТРАНИЦЫ ---------- */
function onPageReady(slug) {
  paintNav(slug);
  if (slug === 'index') { renderHits(); counters(); }
  if (slug === 'menu') { renderTabs(); renderMenu(); }
  if (slug === 'about') renderReviews();
  if (slug === 'delivery') renderFaq();
  if (slug === 'contacts') bindFeedback();
  if (slug === 'checkout') { checkoutStep = 1; renderCheckout(); }
  observeReveals(document);
}

function init() {
  SETTINGS = Object.assign({}, DEFAULT_SETTINGS, store.get(LS + '_settings', null) || {});
  if (!SETTINGS.phoneRaw) SETTINGS.phoneRaw = SETTINGS.whatsapp;
  applySettings();

  renderTabs(); renderMenu(); renderHits(); renderReviews(); renderFaq();
  renderCart();
  onPageReady(currentPage());
  counters();
  updateOpenStatus(); setInterval(updateOpenStatus, 60000);

  /* --- корзина --- */
  $('#cartBtn').addEventListener('click', openCart);
  $('#closeCart').addEventListener('click', closeCart);
  $('#overlay').addEventListener('click', () => { closeCart(); $$('.modal.on').forEach(m => closeModal('#' + m.id)); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeCart(); $$('.modal.on').forEach(m => closeModal('#' + m.id)); } });

  $('#cartBody').addEventListener('click', e => {
    const row = e.target.closest('.ci'); if (!row) return;
    const key = row.dataset.key;
    if (e.target.closest('[data-q]')) changeQty(key, +e.target.closest('[data-q]').dataset.q);
    if (e.target.closest('[data-del]')) { removeItem(key); toast('Убрали из корзины', '🗑'); }
  });
  $('#promoApply').addEventListener('click', () => {
    const v = $('#promoInput').value.trim().toUpperCase();
    if (PROMOS[v]) { promo = v; store.set(LS + '_promo', v); renderCart(); toast(PROMOS[v].label, '🎉'); }
    else { promo = null; store.set(LS + '_promo', null); renderCart(); toast('Такого промокода нет', '🤔'); }
  });
  $('#toCheckout').addEventListener('click', goCheckout);
  $('#mbCart').addEventListener('click', openCart);

  /* --- меню --- */
  const tabs = $('#tabs');
  if (tabs) tabs.addEventListener('click', e => {
    const t = e.target.closest('.tab'); if (!t) return;
    activeCat = t.dataset.cat; searchQ = ''; $('#searchInput').value = '';
    renderTabs(); renderMenu();
    const mb = $('#menuBar'); if (mb) window.scrollTo({ top: mb.getBoundingClientRect().top + scrollY - 130, behavior:'smooth' });
  });
  const search = $('#searchInput');
  if (search) { let tm; search.addEventListener('input', e => { clearTimeout(tm); tm = setTimeout(() => { searchQ = e.target.value; renderTabs(); renderMenu(); }, 160); }); }
  const products = $('#products');
  if (products) products.addEventListener('click', e => {
    if (e.target.closest('[data-builder]')) { openBuilder(); return; }
    const add = e.target.closest('[data-add]');
    if (add) { const p = PRODUCTS.find(x => x.id === add.dataset.add); if (p.opts === 'none') addToCart(p, null, 1, add); else openProduct(p.id); return; }
    const card = e.target.closest('.card');
    if (card) openProduct(card.dataset.id);
  });
  const hits = $('#hits');
  if (hits) hits.addEventListener('click', e => {
    const add = e.target.closest('[data-add]');
    if (add) { const p = PRODUCTS.find(x => x.id === add.dataset.add); if (p.opts === 'none') addToCart(p, null, 1, add); else openProduct(p.id); return; }
    const card = e.target.closest('.card'); if (card) openProduct(card.dataset.id);
  });
  const ob = $('#openBuilderBtn'), ob2 = $('#openBuilderBtn2');
  if (ob) ob.addEventListener('click', e => { e.preventDefault(); openBuilder(); });
  if (ob2) ob2.addEventListener('click', e => { e.preventDefault(); openBuilder(); });

  /* --- отзывы --- */
  const prev = $('#revPrev'), next = $('#revNext');
  if (prev && next) {
    prev.addEventListener('click', () => $('#revTrack').scrollBy({ left:-380, behavior:'smooth' }));
    next.addEventListener('click', () => $('#revTrack').scrollBy({ left: 380, behavior:'smooth' }));
    const auto = setInterval(() => {
      const t = $('#revTrack'); if (!t || document.hidden) return;
      if (t.scrollLeft + t.clientWidth + 8 >= t.scrollWidth) t.scrollTo({ left:0, behavior:'smooth' });
      else t.scrollBy({ left:370, behavior:'smooth' });
    }, 5200);
    $('#revTrack').addEventListener('pointerdown', () => clearInterval(auto));
  }

  /* --- ссылки: legal, настройки, переходы --- */
  document.addEventListener('click', e => {
    const lg = e.target.closest('[data-legal]');
    if (lg) { e.preventDefault(); $('#legalBody').innerHTML = LEGAL[lg.dataset.legal]; openModal('#legalModal'); return; }
    if (e.target.closest('[data-open-settings]')) { e.preventDefault(); openSettings(); return; }
    const g = e.target.closest('[data-goto]');
    if (g) { e.preventDefault(); closeCart(); closeModal('#productModal'); go(g.dataset.goto); return; }
  });
  $('#gear').addEventListener('click', openSettings);
  $$('[data-close]').forEach(b => b.addEventListener('click', () => closeModal(b.dataset.close)));

  /* --- мобильное меню --- */
  $('#burgerM').addEventListener('click', () => {
    const n = $('nav.main'), open = n.style.display === 'flex';
    n.style.cssText = open ? '' : 'display:flex;position:fixed;top:64px;left:12px;right:12px;flex-direction:column;background:#17110D;border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:12px;z-index:890;box-shadow:0 30px 60px rgba(0,0,0,.5)';
  });
  $$('nav.main a').forEach(a => a.addEventListener('click', () => { if (innerWidth <= 900) $('nav.main').style.cssText = ''; }));

  /* --- шапка --- */
  const onScroll = () => {
    const h = $('#siteHeader'); if (h) h.classList.toggle('compact', scrollY > 40);
    const hp = $('.hero-photo'); if (hp) hp.style.transform = `translateY(${Math.min(scrollY * -.05, 0)}px)`;
  };
  addEventListener('scroll', onScroll, { passive:true }); onScroll();

  /* --- прелоадер --- */
  const hide = () => setTimeout(() => { const p = $('#preloader'); if (p) { p.classList.add('done'); setTimeout(() => p.remove(), 600); } }, 450);
  if (document.readyState === 'complete') hide(); else addEventListener('load', hide);
  setTimeout(() => { const p = document.getElementById('preloader'); if (p) { p.classList.add('done'); setTimeout(() => p.remove(), 600); } }, 2400);

  /* --- переключение «страниц» в однофайловой сборке --- */
  if (IS_BUNDLE) {
    const start = currentPage();
    $$('.page').forEach(p => p.classList.toggle('active-page', p.dataset.page === start));
    addEventListener('hashchange', showBundlePage);
  }
}

document.addEventListener('DOMContentLoaded', init);
