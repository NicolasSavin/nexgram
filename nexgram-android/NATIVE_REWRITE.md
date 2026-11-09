# Radar native rewrite (продолжение в любой ветке)

Пакет: `ru.nexgram.app.nativeui`

## Этапы

| Этап | Статус | Файлы |
|------|--------|--------|
| 1 | done | BlacklistStore, SmsConfirm, JournalActivity (звонки) |
| 1б | done | JournalActivity + SMS + MasterAuto toggle |
| 2 | done skeleton | RaportStore, RaportActivity (локально add/edit/delete) |
| 3 | stub | NaryadActivity |
| 4 | stub | PttNative |
| 5 | todo | автодоклады только через MasterAuto |

## Bridge из WebView
- `ShieldPhone.openNativeJournal()`
- `ShieldPhone.openNativeRaport(naryadId)`
- `ShieldPhone.openNativeNaryad(naryadId)`
- `ShieldPhone.masterAuto('0'|'1')` / `masterAutoOn()`
- `sendSms` — ручные с превью; auto* только если MasterAuto вкл

## Сборка
```bash
cd nexgram-android && ./gradlew :app:assembleRelease
```

## Ветка
`native-rewrite` — все эти файлы.

Гибрид 1.8.40 на телефоне пока рабочий с авто=выкл.
