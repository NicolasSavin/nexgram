# NexGram для Android

Нативное приложение-оболочка: WebView + клиент NGP из `app/src/main/assets/www`.

Иконка на рабочем столе, тёмная статус-панель, доступ в интернет для реле.

## Собрать APK (Android Studio)

1. Установите [Android Studio](https://developer.android.com/studio).
2. File → Open → папка `nexgram-android`.
3. Дождитесь Gradle Sync (скачает SDK, если его нет).
4. Build → Build Bundle(s) / APK(s) → Build APK(s).
5. APK: `app/build/outputs/apk/debug/app-debug.apk`.
6. Скопируйте на телефон, разрешите установку из файла.

Для установки на другие телефоны без Play: Build → Generate Signed App Bundle / APK и свой keystore.

Пакет: `ru.nexgram.app`. В Play Console это приложение нужно создать отдельно (аккаунт разработчика Google, 25 USD, политика, подпись). Отсюда магазин не публикуется.

## Живые комнаты с телефона

Долгое нажатие по экрану → адрес реле, например:

- `https://messenger.ваш-домен.ru`
- `ws://192.168.0.10:8787` в той же Wi‑Fi, что и `node server.js`

Пустое поле — только локальное демо без сети.

## PWA без Android Studio

На телефоне откройте сайт NexGram в Chrome → «Добавить на главный экран». Это не APK, но ставится как приложение.
