package ru.nexgram.app.nativeui

/**
 * Этап 4 — нативная рация (каркас).
 * Живой эфир: WebSocket на karavanmessage.ru / запасной IP, Opus куски.
 * Пока заглушка API для сборки.
 */
object PttNative {
    @Volatile var connected: Boolean = false
    fun connect(relayWs: String, room: String, nick: String): Boolean {
        // TODO: OkHttp WebSocket + NGP frame
        connected = false
        return false
    }
    fun talkStart() {}
    fun talkEnd() {}
    fun disconnect() { connected = false }
}
