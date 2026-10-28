# Шаг 1 — SMS / прибытие–убытие в фоне

## Сделано
- SmsHelper — нативная отправка SMS
- RadarService — гео + SMS из фона, START_STICKY
- BootReceiver — старт после reboot
- MainActivity: ShieldPhone.sendSms, startBg, lastGeo
- Manifest: SEND_SMS, FOREGROUND_SERVICE_LOCATION, BOOT_COMPLETED

## Сборка
cd nexgram-android && ./gradlew :app:assembleRelease

## На телефоне
Разрешить SMS, телефон, гео (всегда). Батарея без ограничений. Уведомление «Радар» в шторке.
