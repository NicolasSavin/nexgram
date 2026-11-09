package ru.nexgram.app.nativeui

/**
 * Хук для MainActivity.RadarBridge.
 * Полный пропатченный MainActivity.kt — в artifacts/radar-native-handoff.zip
 *
 * sendSms: auto/bg/escort → только если MasterAuto.isOn; иначе SmsConfirm.sendWithPreview
 * openNativeJournal / openNativeRaport / openNativeNaryad / masterAuto / masterAutoOn
 */
object BridgeHooks {
    const val DOC = "See radar-native-handoff.zip MainActivity.kt"
}
