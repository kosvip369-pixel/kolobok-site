/* =========================================================================
   ГИМН КАФЕ «КОЛОБОК» («Колобок 2.0»)
   -------------------------------------------------------------------------
   • Клик по Колобку в шапке (и по большому Колобку на главной) — включает песню
   • Колобок начинает крутиться быстрее, подпрыгивать, пускать ноты
   • Внизу появляется мини-плеер: пауза, перемотка, громкость, повтор
   • На экране «Заказ принят!» появляется кнопка «Включить песню»
   • Автоплей запрещён браузерами — поэтому песня стартует только по клику
   ========================================================================= */
(function () {
  'use strict';

  var IS_BUNDLE = !!window.__BUNDLE__;
  var SONG   = window.AUDIO_SRC  || 'assets/audio/kolobok-song.mp3';
  /* в однофайловой сборке звук вшит в файл — используем его же как джингл */
  var JINGLE = window.JINGLE_SRC || (window.AUDIO_SRC ? window.AUDIO_SRC : 'assets/audio/kolobok-jingle.mp3');
  var COVER  = window.SONG_COVER || 'assets/img/song-cover.jpg';
  var KEY    = 'kolobok_udomlya_v2_song_';

  /* строки песни — показываются, пока играет музыка */
  var LYRICS = [
    'Раз на свете жил-был Колобок',
    'Колобок, Колобок, зарумянился бок',
    'От бабули ушёл, от дедули ушёл',
    'Он не просто колобок — он шаурма, браток!',
    'Завернулся в лаваш и приехал в дом ваш!',
    'Девять, ноль, ноль — четыре, семь, три, два, ноль, три, пять',
    'Тридцать, сорок пять минут — пирожки уже несут',
    'Кто звонит, тот и сыт!'
  ];

  var audio = null, bar = null, started = false, lyrTimer = null, lyrIdx = 0, seekDrag = false;

  function lsGet(k, d) { try { var v = localStorage.getItem(KEY + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) {} }
  function fmt(s) {
    if (!isFinite(s) || s < 0) s = 0;
    var m = Math.floor(s / 60), x = Math.floor(s % 60);
    return m + ':' + (x < 10 ? '0' : '') + x;
  }
  function say(text, emoji) { try { if (typeof window.toast === 'function') window.toast(text, emoji); } catch (e) {} }

  /* ---------- 1. АУДИО ---------- */
  function ensure() {
    if (audio) return audio;
    audio = new Audio();
    audio.preload = 'none';
    audio.src = SONG;
    audio.volume = lsGet('vol', 0.55);
    audio.loop = lsGet('loop', false);
    audio.addEventListener('play', function () { started = true; sync(); showBar(); });
    audio.addEventListener('pause', sync);
    audio.addEventListener('timeupdate', sync);
    audio.addEventListener('loadedmetadata', sync);
    audio.addEventListener('ended', function () { if (!audio.loop) { sync(); lsSet('wasOn', false); } });
    audio.addEventListener('error', function () {
      say('Не получилось включить песню — проверьте соединение', '🎵');
    });
    return audio;
  }

  function play(fromJingle) {
    var a = ensure();
    if (fromJingle && !a.dataset.jingle) {
      a.dataset.jingle = '1';
      a.src = JINGLE; setCover();
    }
    var p = a.play();
    if (p && p.catch) p.catch(function () { say('Нажмите ещё раз — браузер попросит разрешение', '🎵'); });
    lsSet('wasOn', true);
    startLyrics();
  }
  function pause() {
    if (audio) audio.pause();
    lsSet('wasOn', false);
    stopLyrics();
  }
  function toggle() { (audio && !audio.paused) ? pause() : play(false); }

  function setCover() {
    var img = bar && bar.querySelector('.sb-cover');
    if (!img) return;
    var a = ensure();
    if (a.dataset.jingle === '1') { img.style.background = 'linear-gradient(135deg,#FFB020,#E86A00)'; img.removeAttribute('src'); img.alt = ''; }
    else { img.src = COVER; }
  }

  /* ---------- 2. СОСТОЯНИЕ ИНТЕРФЕЙСА ---------- */
  function sync() {
    var on = !!(audio && !audio.paused);
    document.body.classList.toggle('song-on', on);
    var mark = document.querySelector('.logo .logo-mark');
    if (mark) mark.classList.toggle('kb-dance', on);

    if (!bar) return;
    bar.classList.toggle('on', started);
    var play = bar.querySelector('[data-sb-play]');
    if (play) {
      var t = play.querySelector('[data-sb-ico]');
      if (t) t.textContent = on ? '❚❚' : '▶';
      play.setAttribute('aria-label', on ? 'Пауза' : 'Включить песню');
    }
    var loopBtn = bar.querySelector('[data-sb-loop]');
    if (loopBtn) loopBtn.classList.toggle('on', !!(audio && audio.loop));
    if (audio) {
      var cur = audio.currentTime || 0, dur = audio.duration || 0;
      var f = bar.querySelector('.sb-prog i'); if (f) f.style.width = (dur ? (cur / dur * 100) : 0) + '%';
      var t1 = bar.querySelector('[data-sb-cur]'); if (t1) t1.textContent = fmt(cur);
      var t2 = bar.querySelector('[data-sb-dur]'); if (t2) t2.textContent = dur ? fmt(dur) : '3:16';
      var v = bar.querySelector('[data-sb-vol]'); if (v && !v.dataset.hold) v.value = Math.round(audio.volume * 100);
      var mut = bar.querySelector('[data-sb-mute]');
      if (mut) mut.textContent = audio.muted || audio.volume === 0 ? '🔇' : '🔊';
    }
  }

  function showBar() { if (bar) bar.classList.add('on'); }

  /* ---------- 3. СТРОКА-КАРАОКЕ ---------- */
  function startLyrics() {
    var el = document.querySelector('.kb-lyric');
    if (!el) return;
    stopLyrics();
    lyrIdx = 0;
    el.textContent = LYRICS[0];
    lyrTimer = setInterval(function () {
      lyrIdx = (lyrIdx + 1) % LYRICS.length;
      el.style.opacity = '0';
      setTimeout(function () { el.textContent = LYRICS[lyrIdx]; el.style.opacity = '.92'; }, 400);
    }, 5200);
  }
  function stopLyrics() {
    if (lyrTimer) clearInterval(lyrTimer);
    lyrTimer = null;
    var el = document.querySelector('.kb-lyric');
    if (el) { el.textContent = 'Нажми на Колобка — и он запоёт!'; el.style.opacity = '.75'; }
  }

  /* ---------- 4. МИНИ-ПЛЕЕР ---------- */
  function buildBar() {
    if (bar) return bar;
    bar = document.createElement('div');
    bar.className = 'song-bar';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Плеер: песня кафе «Колобок»');
    bar.innerHTML =
      '<img class="sb-cover" src="' + COVER + '" alt="Обложка песни «Колобок 2.0»">' +
      '<div class="sb-main">' +
        '<div class="sb-title"><span class="sb-eq"><i></i><i></i><i></i><i></i></span>' +
          'Колобок 2.0 <small>· гимн кафе</small></div>' +
        '<div class="sb-prog" data-sb-prog><i></i></div>' +
        '<div class="sb-time"><span data-sb-cur>0:00</span><span data-sb-dur>3:16</span></div>' +
      '</div>' +
      '<div class="sb-btns">' +
        '<button class="sb-btn" data-sb-mute aria-label="Звук">🔊</button>' +
        '<div class="sb-vol"><input type="range" min="0" max="100" value="55" data-sb-vol aria-label="Громкость"></div>' +
        '<button class="sb-btn" data-sb-loop aria-label="Повторять песню">🔁</button>' +
        '<button class="sb-btn primary" data-sb-play aria-label="Включить песню"><span data-sb-ico>▶</span></button>' +
        '<button class="sb-btn sb-close" data-sb-close aria-label="Закрыть плеер">✕</button>' +
      '</div>';
    document.body.appendChild(bar);

    bar.querySelector('[data-sb-play]').addEventListener('click', function () { toggle(); });
    bar.querySelector('[data-sb-close]').addEventListener('click', function () {
      pause(); started = false; bar.classList.remove('on'); document.body.classList.remove('song-on');
    });
    bar.querySelector('[data-sb-loop]').addEventListener('click', function () {
      var a = ensure(); a.loop = !a.loop; lsSet('loop', a.loop); sync();
      say(a.loop ? 'Песня будет повторяться' : 'Повтор выключен', '🔁');
    });
    bar.querySelector('[data-sb-mute]').addEventListener('click', function () {
      var a = ensure(); a.muted = !a.muted; sync();
    });
    var vol = bar.querySelector('[data-sb-vol]');
    vol.addEventListener('input', function () {
      var a = ensure(); a.muted = false; a.volume = Math.max(0, Math.min(1, vol.value / 100)); lsSet('vol', a.volume);
      vol.dataset.hold = '1'; setTimeout(function () { delete vol.dataset.hold; }, 400);
      sync();
    });
    /* перемотка */
    var prog = bar.querySelector('[data-sb-prog]');
    function seekTo(ev) {
      var a = ensure(), r = prog.getBoundingClientRect();
      var x = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left;
      var ratio = Math.max(0, Math.min(1, x / r.width));
      if (a.duration) a.currentTime = ratio * a.duration;
      sync();
    }
    prog.addEventListener('mousedown', function (e) { seekDrag = true; seekTo(e); });
    document.addEventListener('mousemove', function (e) { if (seekDrag) seekTo(e); });
    document.addEventListener('mouseup', function () { seekDrag = false; });
    prog.addEventListener('touchstart', seekTo, { passive: true });
    prog.addEventListener('touchmove', seekTo, { passive: true });

    sync();
    return bar;
  }

  /* ---------- 5. БОЛЬШОЙ КОЛОБОК НА ГЛАВНОЙ ---------- */
  function songSection() {
    var s = document.createElement('section');
    s.className = 'sec song-sec';
    s.id = 'song';
    s.innerHTML =
      '<div class="wrap song-in">' +
        '<button class="kb-btn" id="kbBtn" aria-label="Включить песню кафе «Колобок»">' +
          '<span class="kb-ball"><span class="kb-face"><span class="kb-eye l"></span><span class="kb-eye r"></span><span class="kb-mouth"></span></span></span>' +
          '<span class="kb-shadow"></span>' +
          '<span class="kb-notes"><i>♪</i><i>♫</i><i>♩</i><i>♪</i></span>' +
          '<span class="kb-eq"><i></i><i></i><i></i><i></i><i></i></span>' +
          '<span class="kb-play">🎵 <span data-song-word>Включить песню</span></span>' +
        '</button>' +
        '<div class="song-txt">' +
          '<span class="eyebrow">🎵 Гимн кафе</span>' +
          '<h2>Песня <em>«Колобок 2.0»</em></h2>' +
          '<p>Наш весёлый гимн: живёт на свете Колобок, но бегать по лесу он больше не хочет — он умеет принимать заказы и приезжает в лаваше прямо к вам домой. Нажмите на Колобка — он запоёт и пустится в пляс!</p>' +
          '<div class="kb-lyric">Нажми на Колобка — и он запоёт!</div>' +
          '<div class="song-row">' +
            '<button class="btn btn-primary" data-song-toggle><span data-song-word>Включить песню</span> ▶</button>' +
            '<span class="song-hint">🔊 <b>поёт женским голосом</b> · ещё можно нажать на Колобка в шапке</span>' +
          '</div>' +
        '</div>' +
      '</div>';
    return s;
  }

  function mountSection() {
    var host = IS_BUNDLE ? (document.querySelector('.page[data-page="index"]') || document.body) : document;
    if (!host) return;
    if (document.querySelector('#song')) return;
    var base = (host === document ? document.body : host);

    /* ищем комментарий-якорь «ФОТО ЗАВЕДЕНИЯ» в любом месте дерева */
    var anchor = null;
    try {
      var walker = document.createTreeWalker(base, 128 /* SHOW_COMMENT */, null, false);
      var n;
      while ((n = walker.nextNode())) { if (/ФОТО ЗАВЕДЕНИЯ/.test(n.nodeValue || '')) { anchor = n; break; } }
    } catch (e) { anchor = null; }

    var sec = songSection();
    var place = null;
    if (anchor) {
      var el = anchor.nextSibling;
      while (el && el.nodeType !== 1) el = el.nextSibling;
      place = el || (anchor.parentNode !== base ? anchor.parentNode : null);
    }
    if (place && place.parentNode) { place.parentNode.insertBefore(sec, place); return; }

    var foot = base.querySelector ? base.querySelector('footer') : null;
    if (foot && foot.parentNode) { foot.parentNode.insertBefore(sec, foot); return; }
    base.appendChild(sec);
  }

  /* ---------- 6. КОЛОБОК В ШАПКЕ: делаем кликабельным ---------- */
  function decorateLogo() {
    var mark = document.querySelector('.logo .logo-mark');
    if (!mark || mark.dataset.kbReady) return;
    mark.dataset.kbReady = '1';
    var wrap = document.createElement('span');
    wrap.className = 'logo-wrap';
    mark.parentNode.insertBefore(wrap, mark);
    wrap.appendChild(mark);
    var hint = document.createElement('span');
    hint.className = 'kb-hint';
    hint.textContent = '♪';
    wrap.appendChild(hint);
    mark.style.cursor = 'pointer';
    mark.setAttribute('role', 'button');
    mark.setAttribute('tabindex', '0');
    mark.setAttribute('aria-label', 'Включить песню кафе');
    mark.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      toggle();
      if (!started) return;
    });
    mark.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  }

  /* ---------- 7. КНОПКА НА ЭКРАНЕ «ЗАКАЗ ПРИНЯТ» ---------- */
  function injectSuccessCta(root) {
    var success = root.querySelector ? root.querySelector('.success') : null;
    if (!success || success.dataset.songCta) return;
    success.dataset.songCta = '1';
    var box = document.createElement('div');
    box.className = 'song-cta';
    box.innerHTML = '<b>🎵 Заказ принят — заказали песню?</b>' +
      '<p>Пока готовим, послушайте наш гимн про Колобка и лаваш.</p>' +
      '<button type="button" data-song-jingle>Включить песню</button>';
    box.querySelector('[data-song-jingle]').addEventListener('click', function () { play(true); });
    var anchor = success.querySelector('.success-actions') || success.lastElementChild || success;
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(box, anchor);
    else success.appendChild(box);
  }

  /* ---------- 8. ЗАПУСК ---------- */
  function init() {
    document.body.classList.add('song-ready');
    decorateLogo();
    buildBar();
    if (!IS_BUNDLE && document.body.dataset.page === 'index') mountSection();
    if (IS_BUNDLE) mountSection();

    /* клики по любым кнопкам «включить песню» */
    document.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[data-song-toggle], #kbBtn') : null;
      if (!t) return;
      e.preventDefault();
      toggle();
    });

    /* экран успеха (появляется динамически) */
    var obs = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var n = muts[i].target;
        if (n.nodeType === 1) injectSuccessCta(n.nodeType === 1 && n.classList && n.classList.contains('success') ? n.parentNode : n);
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });

    /* подписи на кнопках: играет / пауза */
    setInterval(function () {
      var on = !!(audio && !audio.paused);
      Array.prototype.forEach.call(document.querySelectorAll('[data-song-word]'), function (el) {
        var txt = on ? 'Поставить на паузу' : 'Включить песню';
        if (el.textContent !== txt) el.textContent = txt;
      });
    }, 600);

    /* если музыка играла на прошлой странице — подскажем */
    if (lsGet('wasOn', false)) {
      setTimeout(function () {
        say('Песня на паузе — нажмите на Колобка в шапке', '🎵');
        showBar();
      }, 1600);
      lsSet('wasOn', false);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
