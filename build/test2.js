/* Тесты многостраничной сборки: сайт одним файлом (jsdom) + статические проверки файлов */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = '/home/user';
const BUNDLE = path.join(ROOT, 'kolobok-udomlya.html');
const SITE = path.join(ROOT, 'site');

const logs = [], errors = [];
const t = (name, fn) => { try { fn(); logs.push('✅ ' + name); } catch (e) { logs.push('❌ ' + name + ' → ' + e.message); errors.push(name + ': ' + e.message); } };
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

/* ---------- 1. СТАТИЧЕСКИЕ ПРОВЕРКИ ФАЙЛОВ ---------- */
t('многостраничная версия: 6 страниц', () => {
  const files = fs.readdirSync(SITE).filter(f => f.endsWith('.html')).sort();
  assert(files.length === 6, 'файлов: ' + files.join(','));
});
t('на каждой странице есть телефон, часы и меню-навигация', () => {
  for (const f of fs.readdirSync(SITE).filter(x => x.endsWith('.html'))) {
    const h = fs.readFileSync(path.join(SITE, f), 'utf8');
    assert(h.includes('+7 (900) 473-20-35'), 'нет телефона в ' + f);
    assert(h.includes('11:00'), 'нет часов в ' + f);
    assert(h.includes('assets/css/site.css'), 'нет подключения CSS в ' + f);
    assert(h.includes('assets/js/site.js'), 'нет подключения JS в ' + f);
    assert(!h.includes('{{'), 'остались плейсхолдеры в ' + f);
  }
});
t('страница оформления содержит блок заказа, в контактах — форма', () => {
  assert(fs.readFileSync(path.join(SITE, 'checkout.html'), 'utf8').includes('checkoutBody'), 'нет #checkoutBody');
  assert(fs.readFileSync(path.join(SITE, 'contacts.html'), 'utf8').includes('feedbackForm'), 'нет формы обратной связи');
});
t('zip-архив собран', () => { assert(fs.statSync(path.join(ROOT, 'kolobok-site.zip')).size > 100000, 'архив мал'); });

/* ---------- 2. САЙТ ОДНИМ ФАЙЛОМ (jsdom) ---------- */
const vc = new VirtualConsole();
vc.on('jsdomError', e => { const m = (e.detail && e.detail.message) || e.message; if (!/scrollTo|Not implemented/.test(m)) errors.push('jsdom: ' + m); });
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

const dom = new JSDOM(fs.readFileSync(BUNDLE, 'utf8'), {
  runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
  beforeParse(win) {
    win.IntersectionObserver = class { constructor(cb) { this.cb = cb; } observe(el) { this.cb([{ isIntersecting: true, target: el }], this); } unobserve() {} disconnect() {} };
    win.Element.prototype.animate = function () { return { onfinish: null }; };
    win.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: () => () => {} });
    win.scrollTo = () => {}; win.open = () => {};
    win.HTMLElement.prototype.scrollBy = function () {}; win.HTMLElement.prototype.scrollTo = function () {};
    win.matchMedia = win.matchMedia || (() => ({ matches:false, addEventListener() {}, removeEventListener() {} }));
    win.navigator.clipboard = { writeText: async () => {} };
  }
});
const { window } = dom, doc = window.document;
const $ = s => doc.querySelector(s), $$ = s => Array.from(doc.querySelectorAll(s));
const click = el => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
const num = s => +String(s).replace(/[^0-9]/g, '');
const goto = slug => { window.location.hash = slug === 'index' ? '#/' : '#/' + slug; window.dispatchEvent(new window.HashChangeEvent('hashchange')); };

window.addEventListener('load', () => setTimeout(() => {
  t('все 6 страниц присутствуют в однофайловой сборке', () => {
    assert($$('.page').length === 6, 'найдено: ' + $$('.page').length);
    assert($('.page[data-page="checkout"]'), 'нет страницы checkout');
  });
  t('телефон и часы подставлены на страницу', () => {
    const ph = $$('[data-set="phone"]').map(e => e.textContent.trim());
    assert(ph.includes('+7 (900) 473-20-35'), 'телефон: ' + ph.slice(0, 3));
    assert(doc.body.innerHTML.includes('11:00 – 21:00'), 'нет часов работы');
  });

  t('переход на страницу «Меню» по #/menu', () => {
    goto('menu');
    assert($('.page[data-page="menu"]').classList.contains('active-page'), 'страница меню не активна');
    assert($$('#products .card').length > 0, 'карточки не отрисованы');
    assert($('#tabs .tab').length || $$('#tabs .tab').length, 'нет табов');
  });

  t('категория «Шаурма»: есть карточка конструктора', () => {
    click($('#tabs .tab[data-cat="shawarma"]'));
    assert($('.card-builder'), 'нет карточки «Своя шаурма»');
  });

  t('пожелание к обычному блюду попадает в корзину', () => {
    click($('#tabs .tab[data-cat="shawarma"]'));
    click($('#products .card[data-id="sh-klassik"] .btn-add'));
    assert($('#productModal').classList.contains('on'), 'карточка блюда не открылась');
    assert($('#wishInput'), 'нет поля пожелания');
    $('#wishInput').value = 'Побольше соуса, без лука';
    click($('.wish-chips .pill'));
    click($('#mcAdd'));
    click($('#cartBtn'));
    const row = $('#cartBody .ci');
    assert(row && row.innerHTML.includes('Побольше соуса'), 'пожелание не попало в корзину');
    assert($('#cartCount').textContent === '1', 'счётчик: ' + $('#cartCount').textContent);
  });

  t('конструктор «Своя шаурма»: цена и состав', () => {
    click($('#cartBtn')); // закрыть/открыть не важно — корзина перезапишется
    goto('menu');
    click($('#openBuilderBtn'));
    assert($('#productModal').classList.contains('on'), 'конструктор не открылся');
    const base = num($('#mcTotal').textContent);
    assert(base === 250, 'база конструктора: ' + base);
    // размер XL (+140) и говядина (+60)
    click($('.opt-pills[data-bg="size"] .pill[data-i="2"]'));
    click($('.opt-pills[data-bg="meat"] .pill[data-i="1"]'));
    const withOptions = num($('#mcTotal').textContent);
    assert(withOptions === 250 + 140 + 60, 'цена с опциями: ' + withOptions);
    $('#wishInput').value = 'Порезать пополам';
    click($('#mcAdd'));
    click($('#cartBtn'));
    const html = $('#cartBody').innerHTML;
    assert(html.includes('Своя шаурма'), 'нет позиции конструктора');
    assert(html.includes('Порезать пополам'), 'пожелание конструктора потерялось');
    assert(html.includes('XL'), 'в составе нет размера XL');
  });

  t('корзина живёт между «страницами» и считает доставку', () => {
    goto('delivery');
    assert($('#cartCount').textContent === '2', 'корзина потерялась при переходе: ' + $('#cartCount').textContent);
    goto('checkout');
    assert($('.page[data-page="checkout"]').classList.contains('active-page'), 'страница заказа не активна');
    assert($('#checkoutBody').innerHTML.includes('Перейти к оплате'), 'форма заказа не отрисована');
    assert($('#sideItems').innerHTML.includes('Своя шаурма'), 'сайдбар без позиций');
  });

  t('оформление: валидация, оплата, экран успеха с отправкой на телефон', () => {
    click($('#toStep2'));
    assert($('#fName').classList.contains('err'), 'валидация не сработала');
    $('#inName').value = 'Тест';
    $('#inPhone').value = '+7 (900) 123-45-67';
    $('#inAddr').value = 'ул. Пушкина, 1, кв. 2';
    $('#inAgree').checked = true;
    click($('#toStep2'));
    assert(/Оплатить/.test($('#payBtn').textContent), 'шаг оплаты не открылся');
    click($('#payCards .rc[data-pay="cash"]'));
    click($('#payBtn'));
  });

  t('панель владельца: поле вебхука и сохранение', () => {
    click($('#gear'));
    assert($('#stWebhook'), 'нет поля вебхука');
    $('#stWebhook').value = 'https://example.com/hook';
    $('#stPhoneRaw').value = '79004732035';
    click($('#stSave'));
    assert(doc.body.innerHTML.includes('+7 (900) 473-20-35'), 'телефон сбросился');
  });

  setTimeout(() => {
    t('после заказа: экран успеха, WhatsApp и SMS на номер кафе', () => {
      const html = $('#checkoutBody').innerHTML;
      assert(html.includes('Заказ принят'), 'нет экрана успеха');
      assert($('#cartCount').textContent === '0', 'корзина не очищена');
      const wa = $('#waLink').getAttribute('href') || '';
      const sms = $('#smsLink').getAttribute('href') || '';
      assert(wa.includes('wa.me/79004732035'), 'WhatsApp не на номер кафе: ' + wa.slice(0, 60));
      assert(sms.includes('79004732035'), 'SMS не на номер кафе: ' + sms.slice(0, 60));
      const txt = decodeURIComponent(wa);
      assert(/Побольше соуса|Порезать пополам/.test(txt), 'пожелания не в тексте заказа');
      assert(/Своя шаурма/.test(txt), 'состав конструктора не в тексте заказа');
      assert(/ИТОГО/.test(txt), 'нет итога в тексте заказа');
    });
    console.log(logs.join('\n'));
    console.log('\nОшибок: ' + errors.length + (errors.length ? '\n' + errors.join('\n') : ''));
    process.exit(errors.length ? 1 : 0);
  }, 2000);
}, 700));
