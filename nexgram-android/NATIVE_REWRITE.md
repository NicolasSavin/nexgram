# Radar native rewrite — complete handoff

Branch: `native-rewrite`  
https://github.com/NicolasSavin/nexgram/tree/native-rewrite

## On branch
- nativeui/BlacklistStore, SmsConfirm, MasterAuto
- nativeui/JournalActivity (звонки + SMS + ЧС + авто-рубильник)
- nativeui/RaportStore, RaportActivity (локальный рапорт)
- nativeui/NaryadActivity, PttNative (stubs)
- AndroidManifest: activities + READ_CALL_LOG + READ_SMS
- BridgeHooks.kt (описание правок MainActivity)

## MainActivity.kt
Полный файл с openNative* и превью SMS — в **radar-native-handoff.zip**  
(скачать и положить в `nexgram-android/app/src/main/java/ru/nexgram/app/MainActivity.kt` перед сборкой).

## Build
```bash
cd nexgram-android
# скопировать MainActivity из handoff zip если нужно
./gradlew :app:assembleRelease
```

## Hybrid phone
1.8.40, авто Выкл — пока основной рабочий APK.
