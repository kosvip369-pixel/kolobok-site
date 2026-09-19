#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Сборка многостраничного сайта «Колобок» (Удомля).

Результат:
  site/                     — многостраничная версия для хостинга
      index.html  menu.html  delivery.html  about.html  contacts.html  checkout.html
      assets/css/site.css   assets/js/site.js   assets/img/*.jpg
  kolobok-udomlya.html      — тот же сайт одним файлом (все страницы внутри, навигация по #/…)
  kolobok-site.zip          — архив многостраничной версии

Запуск:  python3 build_site.py
"""
import base64, json, os, re, shutil, zipfile

ROOT = os.path.dirname(os.path.abspath(__file__))
# Домен сайта — используется в canonical, robots.txt и sitemap.xml.
# Задаётся при сборке:  SITE_DOMAIN=https://kolobok-udomlya.ru python3 build_site.py
DOMAIN = os.environ.get('SITE_DOMAIN', 'https://kolobok-udomlya.pages.dev').rstrip('/')
# исходники лежат в 'src' (папка 'build' не попадает в резервные копии workspace)
B = os.path.join(ROOT, 'src')
if not os.path.isdir(B):
    B = os.path.join(ROOT, 'build')
SITE = os.path.join(ROOT, 'site')
BUNDLE = os.path.join(ROOT, 'kolobok-udomlya.html')
ZIP = os.path.join(ROOT, 'kolobok-site.zip')

PAGES = [
    dict(slug='index',    file='page_index.html',    title='Кафе «КОЛОБОК» в Удомле — шаурма, кура-гриль, выпечка с доставкой',
         desc='Кафе «Колобок», Удомля, ул. Космонавтов, 1а. Шаурма на гриле, кура-гриль, бургеры, выпечка. Заказ онлайн, оплата при получении или по СБП, доставка по городу за 30–45 минут. Тел. +7 (900) 473-20-35'),
    dict(slug='menu',     file='page_menu.html',     title='Меню — «КОЛОБОК» Удомля: шаурма, кура-гриль, комбо, выпечка',
         desc='Меню кафе «Колобок» в Удомле: 7 категорий, конструктор «своя шаурма», пожелания к каждому блюду. Доставка и самовывоз.'),
    dict(slug='delivery', file='page_delivery.html', title='Доставка и оплата — «КОЛОБОК» Удомля',
         desc='Доставка по Удомле за 30–45 минут, бесплатно от 700 ₽. Оплата при получении или переводом по СБП. Заказ уходит администратору в WhatsApp или SMS на +7 (900) 473-20-35.'),
    dict(slug='about',    file='page_about.html',    title='О кафе «КОЛОБОК» в Удомле — фото, отзывы, атмосфера',
         desc='Кафе «Колобок» на ул. Космонавтов, 1а в Удомле: сказочная атмосфера, домашняя кухня, отзывы гостей с Яндекс.Карт.'),
    dict(slug='contacts', file='page_contacts.html', title='Контакты кафе «КОЛОБОК», Удомля — адрес, телефон, часы',
         desc='Кафе «Колобок»: г. Удомля, ул. Космонавтов, 1а. Телефон и WhatsApp +7 (900) 473-20-35, ежедневно 11:00–21:00. Банкеты и корпоративные заказы.'),
    dict(slug='checkout', file='page_checkout.html', title='Оформление заказа — «КОЛОБОК» Удомля',
         desc='Оформите заказ в кафе «Колобок»: доставка или самовывоз, оплата при получении или переводом по СБП. Онлайн-оплата картой — в процессе подключения.'),
]

URLS_MP = {p['slug']: (('index.html' if p['slug'] == 'index' else p['slug'] + '.html')) for p in PAGES}
URLS_BD = {p['slug']: ('#/' if p['slug'] == 'index' else '#/' + p['slug']) for p in PAGES}


def data_uri(path):
    with open(path, 'rb') as f:
        return 'data:image/jpeg;base64,' + base64.b64encode(f.read()).decode()


def read(p):
    with open(p, encoding='utf-8') as f:
        return f.read()


def split_partials():
    txt = read(os.path.join(B, 'partials.html'))
    out = {}
    for m in re.finditer(r'<!--@(\w+)-->(.*?)(?=<!--@\w+-->|\Z)', txt, re.S):
        out[m.group(1)] = m.group(2).strip()
    return out


def fill_urls(html, urls, hash_settings):
    for slug, href in urls.items():
        html = html.replace('{{URL_' + slug.upper() + '}}', href)
    return html.replace('{{HASH_SETTINGS}}', hash_settings)


def fill_images(html, hero, photos):
    html = html.replace('{{HERO_SRC}}', hero)
    for k, v in photos.items():
        html = html.replace('{{' + k + '}}', v)
    return html


def main():
    parts = split_partials()
    css = read(os.path.join(B, 'fonts.css')) + '\n' + read(os.path.join(B, 'site.css'))
    song_css_path = os.path.join(B, 'song.css')          # стили плеера «Гимн кафе»
    if os.path.exists(song_css_path):
        css += '\n' + read(song_css_path)
    js = read(os.path.join(B, 'site.js'))
    song_js_path = os.path.join(B, 'song.js')            # плеер песни «Колобок 2.0»
    song_js = read(song_js_path) if os.path.exists(song_js_path) else ''
    AUDIO_SRC_DIR = os.path.join(ROOT, 'assets-src', 'audio')
    img_dir = os.path.join(B, 'img')
    imgs = [f for f in sorted(os.listdir(img_dir)) if f.endswith('.jpg')]

    # ---------- многостраничная версия ----------
    if os.path.isdir(SITE):
        shutil.rmtree(SITE)
    for d in ('assets/css', 'assets/js', 'assets/img'):
        os.makedirs(os.path.join(SITE, d), exist_ok=True)
    with open(os.path.join(SITE, 'assets/css/site.css'), 'w', encoding='utf-8') as f:
        f.write(css)
    with open(os.path.join(SITE, 'assets/js/site.js'), 'w', encoding='utf-8') as f:
        f.write("window.IMG_BASE = 'assets/img/';\n" + js)
    if song_js:
        shutil.copy(song_js_path, os.path.join(SITE, 'assets/js/song.js'))
    # --- звук песни: колобок-song.mp3 + короткий джингл + обложка ---
    if os.path.isdir(AUDIO_SRC_DIR):
        os.makedirs(os.path.join(SITE, 'assets/audio'), exist_ok=True)
        for f in ('kolobok-song.mp3', 'kolobok-jingle.mp3'):
            src = os.path.join(AUDIO_SRC_DIR, f)
            if os.path.exists(src):
                shutil.copy(src, os.path.join(SITE, 'assets/audio', f))
        cover = os.path.join(AUDIO_SRC_DIR, 'cover.jpg')
        if os.path.exists(cover):
            shutil.copy(cover, os.path.join(SITE, 'assets/img/song-cover.jpg'))
    for f in imgs:
        shutil.copy(os.path.join(img_dir, f), os.path.join(SITE, 'assets/img', f))

    # --- _headers (Cloudflare Pages / Netlify): безопасность и кэш ---
    with open(os.path.join(SITE, '_headers'), 'w', encoding='utf-8') as f:
        f.write('''/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: SAMEORIGIN
  Permissions-Policy: geolocation=(), microphone=(), camera=()

/assets/img/*
  Cache-Control: public, max-age=604800

/assets/css/*
  Cache-Control: public, max-age=3600

/assets/js/*
  Cache-Control: public, max-age=3600

/assets/audio/*
  Cache-Control: public, max-age=604800
''')

    # --- robots.txt ---
    with open(os.path.join(SITE, 'robots.txt'), 'w', encoding='utf-8') as f:
        f.write('User-agent: *\nAllow: /\n\nSitemap: ' + DOMAIN + '/sitemap.xml\n')

    # --- sitemap.xml ---
    today = __import__('datetime').date.today().isoformat()
    urls = ''
    for p in PAGES:
        loc = DOMAIN + '/' + ('' if p['slug'] == 'index' else p['slug'] + '.html')
        urls += ('  <url>\n    <loc>' + loc + '</loc>\n    <lastmod>' + today + '</lastmod>\n'
                 '    <changefreq>weekly</changefreq>\n    <priority>'
                 + ('1.0' if p['slug'] == 'index' else '0.8') + '</priority>\n  </url>\n')
    with open(os.path.join(SITE, 'sitemap.xml'), 'w', encoding='utf-8') as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + '</urlset>\n')

    # --- 404.html (Cloudflare Pages отдаёт её для несуществующих адресов) ---
    with open(os.path.join(SITE, '404.html'), 'w', encoding='utf-8') as f:
        f.write('''<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Страница не найдена — Кафе «Колобок»</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
background:radial-gradient(120% 90% at 78% 12%,#3A1E0B 0%,#1B120C 42%,#0F0B08 100%);
color:#fff;font-family:'Segoe UI',system-ui,Arial,sans-serif;text-align:center;padding:24px}
.ball{width:96px;height:96px;border-radius:50%;margin:0 auto 22px;background:radial-gradient(circle at 32% 28%,#FFD79A,#FFB020 45%,#E86A00)}
h1{font-family:Arial Narrow,Impact,sans-serif;font-size:44px;margin:0 0 10px;text-transform:uppercase;letter-spacing:.02em}
p{color:#BFAEA2;max-width:460px;margin:0 auto 26px}
a{display:inline-block;background:linear-gradient(135deg,#FF8A24,#E85F00);color:#fff;text-decoration:none;
padding:15px 28px;border-radius:999px;font-weight:700;margin:6px} a.ghost{background:transparent;border:1.5px solid rgba(255,255,255,.3)}
</style></head><body><div><div class="ball"></div><h1>Страница уехала</h1>
<p>Такой страницы нет, но шаурма на месте. Вернитесь на главную или посмотрите меню.</p>
<a href="/">На главную</a><a class="ghost" href="/menu.html">Смотреть меню</a></div></body></html>\n''')

    photos_mp = {k: 'assets/img/' + k.replace('PH_', '').lower() + '.jpg' for k in
                 ('PH_ATMOS1', 'PH_ATMOS2', 'PH_ATMOS3', 'PH_KURA')}
    for p in PAGES:
        content = fill_images(read(os.path.join(B, p['file'])), 'assets/img/hero.jpg', photos_mp)
        content = fill_urls(content, URLS_MP, '')
        canon = DOMAIN + '/' + ('' if p['slug'] == 'index' else p['slug'] + '.html')
        html = (parts['head'].replace('{{TITLE}}', p['title']).replace('{{DESC}}', p['desc'])
                .replace('{{PAGE}}', p['slug']).replace('{{ASSET_CSS}}', 'assets/css/site.css')
                .replace('{{CANON}}', canon).replace('{{DOMAIN}}', DOMAIN))
        html += '\n' + fill_urls(parts['header'], URLS_MP, '')
        html += '\n' + content
        html += '\n' + fill_urls(parts['footer'], URLS_MP, '')
        html += '\n' + parts['overlays']
        html += '\n<script src="assets/js/site.js"></script>'
        if song_js:
            html += '\n<script src="assets/js/song.js" defer></script>'
        html += '\n<script>document.getElementById("year").textContent=new Date().getFullYear();</script>\n</body>\n</html>\n'
        with open(os.path.join(SITE, p['slug'] + '.html'), 'w', encoding='utf-8') as f:
            f.write(html)

    # ---------- версия одним файлом ----------
    imgs_data = {os.path.splitext(f)[0]: data_uri(os.path.join(img_dir, f)) for f in imgs}
    photos_bd = {'PH_ATMOS1': imgs_data['atmos1'], 'PH_ATMOS2': imgs_data['atmos2'],
                 'PH_ATMOS3': imgs_data['atmos3'], 'PH_KURA': imgs_data['kura']}
    body = []
    for p in PAGES:
        content = fill_images(read(os.path.join(B, p['file'])), imgs_data['hero'], photos_bd)
        content = fill_urls(content, URLS_BD, 'settings')
        body.append(f'<div class="page" data-page="{p["slug"]}">{content}</div>')
    head = (parts['head'].replace('{{TITLE}}', 'Кафе «КОЛОБОК» в Удомле — заказ еды с доставкой')
            .replace('{{DESC}}', 'Шаурма, кура-гриль, выпечка. Заказ онлайн, доставка по Удомле.')
            .replace('{{CANON}}', DOMAIN + '/').replace('{{DOMAIN}}', DOMAIN)
            .replace('{{PAGE}}', 'index').replace('{{ASSET_CSS}}', '#')  # стили встроены ниже
            .replace('<link rel="stylesheet" href="#">', ''))
    html = (head + '\n<style>\n' + css + '\n.page{display:none}.page.active-page{display:block}\n</style>\n'
            + fill_urls(parts['header'], URLS_BD, 'settings')
            + '\n<main>' + '\n'.join(body) + '</main>\n'
            + fill_urls(parts['footer'], URLS_BD, 'settings')
            + '\n' + parts['overlays']
            + f'\n<script>window.IMG={json.dumps(imgs_data, ensure_ascii=False)};window.__BUNDLE__=true;</script>'
            + '\n<script>\n' + js + '\n</script>'
            + '\n<script>document.getElementById("year").textContent=new Date().getFullYear();</script>\n</body>\n</html>\n')
    # --- звук и обложка прямо в HTML (однофайловая версия работает офлайн) ---
    audio_uri = cover_uri = ''
    bundle_audio = os.path.join(AUDIO_SRC_DIR, 'song-bundle.mp3')
    if os.path.exists(bundle_audio):
        audio_uri = 'data:audio/mpeg;base64,' + base64.b64encode(open(bundle_audio, 'rb').read()).decode()
    bundle_cover = os.path.join(AUDIO_SRC_DIR, 'cover.jpg')
    if os.path.exists(bundle_cover):
        cover_uri = 'data:image/jpeg;base64,' + base64.b64encode(open(bundle_cover, 'rb').read()).decode()
    extra = ''
    if audio_uri or cover_uri:
        extra += ('\n<script>window.AUDIO_SRC="' + audio_uri + '";window.SONG_COVER="' + cover_uri + '";</script>')
    if song_js:
        extra += '\n<script>\n' + song_js + '\n</script>'
    if extra:
        html = html.replace('\n<script>document.getElementById("year")', extra + '\n<script>document.getElementById("year")')
    assert '{{' not in html, re.findall(r'\{\{[^}]*\}\}', html)[:5]
    with open(BUNDLE, 'w', encoding='utf-8') as f:
        f.write(html)

    # ---------- архив ----------
    with zipfile.ZipFile(ZIP, 'w', zipfile.ZIP_DEFLATED) as z:
        for root, _, files in os.walk(SITE):
            for f in files:
                full = os.path.join(root, f)
                z.write(full, os.path.relpath(full, ROOT))

    print('Готово:')
    print('  site/ —', len(PAGES), 'страниц,', len(imgs), 'изображений')
    if os.path.isdir(os.path.join(SITE, 'assets/audio')):
        print('  assets/audio/ —', ', '.join(sorted(os.listdir(os.path.join(SITE, 'assets/audio')))))
    print('  kolobok-udomlya.html —', round(os.path.getsize(BUNDLE) / 1048576, 2), 'МБ')
    print('  kolobok-site.zip —', round(os.path.getsize(ZIP) / 1048576, 2), 'МБ')


if __name__ == '__main__':
    main()
