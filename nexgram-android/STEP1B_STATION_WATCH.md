# Шаг 1b — прибытие/убытие в фоне

## Уже в репозитории
- `StationWatch.kt` — список станций и расстояние
- `RadarService.processWatches` — near → SMS «Прибыли…», far → «Убыли…»
- `CallReceiver` — пишет `last_incoming` (задел шага 2)
- Manifest: PHONE_STATE receiver

## Из WebView
```js
ShieldPhone.setWatches(JSON.stringify([{
  id: "khv",
  name: "Хабаровск",
  lat: 48.48,
  lon: 135.07,
  nearM: 800,
  farM: 1500,
  escortPhone: "79001234567",
  notifyEscort: true
}]));
ShieldPhone.startBg();
// событие:
ShieldPhone.lastStationEvent(); // "прибыли|Хабаровск|ts"
ShieldPhone.lastIncoming();
```

## Сборка
```bash
cd nexgram-android && ./gradlew :app:assembleRelease
```
