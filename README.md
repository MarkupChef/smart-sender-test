# Smart Sender Webhooks Admin

Адміністративний застосунок для входу, пошуку, перегляду та редагування вебхуків.
Backend повністю імітується в браузері через MSW.

## Презентація завдання та ключових рішень

### [Переглянути презентацію](https://notebook.google.com/notebook/5b07cc19-42f2-47ce-b764-4e9a89bf822d/artifact/de4b53cc-556b-4cb2-92f8-2da71f4d73ea?utm_source=nlm_web_share&utm_medium=google_oo&utm_campaign=art_share_1&utm_content=&utm_smc=nlm_web_share_google_oo_art_share_1_)

## Запуск

Потрібні Node.js `>=22.12` і pnpm `12.14.0`.

```bash
pnpm install
pnpm dev
```

Застосунок буде доступний за адресою `http://localhost:5173`.

## Тестові дані

- Email: `admin@smartsender.test`
- Password: `password123`

## Тести та перевірки

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Транспортний тест перевіряє обов'язковий single-flight-сценарій: два паралельні запити отримують
`401`, виконують одну ротацію сесії та успішно повторюються. Інші тести покривають помилки ротації,
повторний `401`, скасування запитів, CSRF single-flight і відновлення після `419`.

## Ключові рішення

Детальні правила та обґрунтування містяться в
[конституції](.specify/memory/constitution.md),
[`research.md`](specs/001-webhooks-admin-app/research.md) і
[`contracts/http-client.md`](specs/001-webhooks-admin-app/contracts/http-client.md).

- **Transport/session.** Один framework-agnostic HTTP client керує `fetch`, CSRF, `401`/`419`,
  single-flight-ротацією та єдиною повторною спробою. UI і TanStack Query не дублюють цю логіку.
- **URL state.** `page` і `search` зберігаються тільки в URL та перевіряються через zod. Пошук
  використовує debounce і `replace`, пагінація — `push`.
- **Типізовані межі й помилки.** Усі API-відповіді перевіряються zod, типи походять із `z.infer`,
  а помилки нормалізуються в дискриміноване об'єднання `ApiError`.
- **Зберігання токенів.** `device_session_token` існує лише як локальна змінна під час входу;
  `localStorage` містить тільки `fingerprint`. Імітована сесія MSW зберігається в пам'яті.
- **Обробка `422`.** Серверні помилки зіставляються з полями форми через `setError`, невідомі
  поля — з `root`. `401`/`419` належать транспорту, `404` і решта помилок — відповідним екранам.

## Обмеження

- Після повного перезавантаження потрібно ввійти знову: mock-сесія MSW зберігається лише в
  пам'яті браузерного воркера. Параметри списку в URL при цьому не втрачаються.

## Витрачений час

**4 години — повністю робоче рішення**

- 30 хв — ініціалізація проєкту
- 90 хв — формування завдань
- 120 хв — реалізація

**1 година — рефакторинг**
