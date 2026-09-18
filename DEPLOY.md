# Публикация сайта на Cloudflare Pages

Сайт **полностью статический** — сервер не нужен, база не нужна. Публикация занимает 5 минут.

В репозитории уже лежит:
```
site/                 ← то, что публикуется (index.html, menu.html, … , assets/, _headers, robots.txt, sitemap.xml, 404.html)
build/                ← исходники страниц (правки вносятся здесь)
build_site.py         ← сборка: python3 build_site.py  →  обновляет site/ + kolobok-udomlya.html + kolobok-site.zip
kolobok-udomlya.html  ← весь сайт одним файлом (для отправки в мессенджерах)
ПОДКЛЮЧЕНИЕ.md        ← заказы на телефон + ЮKassa
```

---

## Вариант A — через GitHub (рекомендуется, «через хаб»)

Каждый `git push` → Cloudflare сам пересобирает и публикует сайт.

1. Залейте репозиторий на GitHub (если ещё не залит):
   ```bash
   git remote add origin https://github.com/ВАШ_ЛОГИН/kolobok-site.git
   git branch -M main
   git push -u origin main
   ```
2. Зайдите на [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → вкладка **Pages** → **Connect to Git**.
3. Разрешите Cloudflare доступ к GitHub и выберите репозиторий `kolobok-site`.
4. Настройки сборки (важно — заполнить ровно так):
   | Поле | Значение |
   |---|---|
   | Framework preset | **None** |
   | Build command | *(оставить пустым)* |
   | Build output directory | **site** |
   | Root directory | *(оставить пустым)* |
5. **Save and Deploy** → через 20–30 секунд сайт доступен на `https://kolobok-site.pages.dev`.
6. Дальше: **Custom domains → Set up a custom domain** → впишите свой домен (например `kolobok-udomlya.ru`).
   Если домен уже обслуживается в Cloudflare — подключится автоматически, HTTPS включится сам.
   Если домен у другого регистратора — Cloudflare покажет, какие DNS-записи прописать (или попросит сменить NS на Cloudflare).

**Если домен поменяли** — пересоберите сайт, чтобы canonical, sitemap и robots указывали на новый адрес:
```bash
SITE_DOMAIN=https://kolobok-udomlya.ru python3 build_site.py
git add -A && git commit -m "update domain" && git push
```

---

## Вариант B — прямой залив без GitHub (быстрее всего)

Если репозиторий не нужен — залейте папку `site` напрямую командой (нужен Node.js):

```bash
npx wrangler pages deploy site --project-name=kolobok-udomlya
```

Первый запуск откроет браузер для входа в Cloudflare (или используйте токен: `CLOUDFLARE_API_TOKEN=... npx wrangler pages deploy site --project-name=kolobok-udomlya`).
Адрес сайта: `https://kolobok-udomlya.pages.dev`.

---

## Вариант C — автодеплой из GitHub Actions (если не хотите подключать Git в дашборде)

1. Создайте в репозитории файл `.github/workflows/deploy.yml` и вставьте в него содержимое `deploy-examples/cloudflare-pages-workflow.yml`
   (готовый файл лежит в папке-примере, потому что у токена автоматической заливки нет права `workflow` — GitHub так защищает Actions).
2. В настройках репозитория: **Settings → Secrets and variables → Actions** добавьте:
   - `CLOUDFLARE_API_TOKEN` — токен Cloudflare с правами **Account → Cloudflare Pages → Edit**;
   - `CLOUDFLARE_ACCOUNT_ID` — ID аккаунта (виден на главной странице дашборда Cloudflare справа).
3. Каждый `git push` в `main` будет публиковать сайт.

---

## Что уже сделано для «полностью рабочего» сайта

- **`_headers`** — заголовки безопасности и кэширования (Cloudflare Pages подхватывает автоматически).
- **`404.html`** — красивая страница ошибки в стиле кафе.
- **`robots.txt`** и **`sitemap.xml`** — индексация в поисковиках.
- **JSON-LD `Restaurant`** на всех страницах — карточка кафе с адресом, телефоном, часами и рейтингом может показываться в поиске.
- **canonical / og:url** — правильные канонические адреса страниц.
- Мобильная вёрстка, HTTPS и CDN — на стороне Cloudflare включены по умолчанию.

## После публикации — 10 минут на пользу

1. Добавьте адрес сайта в **Яндекс.Бизнес** и **2ГИС** (ссылка на сайт в карточке = бесплатный трафик).
2. Проверьте ссылку в **Яндекс.Вебмастере** и **Google Search Console**, отправьте `sitemap.xml`.
3. Зайдите в панель ⚙ на сайте, впишите вебхук для заказов (см. `ПОДКЛЮЧЕНИЕ.md`).
4. Позвоните на свой номер и оформите тестовый заказ с телефона — проверьте, что сообщение приходит.
