package ru.nexgram.app.nativeui

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/** Локальный рапорт — без сервера (этап 2). */
object RaportStore {
    private const val PREF = "radar_native_raport"

    data class Line(
        val localId: String,
        val title: String,
        val place: String,
        val note: String,
        val ts: Long
    )

    private fun key(naryadId: String) = "lines:$naryadId"

    fun list(ctx: Context, naryadId: String): List<Line> {
        val raw = ctx.getSharedPreferences(PREF, Context.MODE_PRIVATE)
            .getString(key(naryadId), "[]") ?: "[]"
        return try {
            val arr = JSONArray(raw)
            (0 until arr.length()).mapNotNull { i ->
                val o = arr.optJSONObject(i) ?: return@mapNotNull null
                Line(
                    localId = o.optString("localId"),
                    title = o.optString("title"),
                    place = o.optString("place"),
                    note = o.optString("note"),
                    ts = o.optLong("ts")
                )
            }.sortedBy { it.ts }
        } catch (_: Exception) {
            emptyList()
        }
    }

    fun save(ctx: Context, naryadId: String, lines: List<Line>) {
        val arr = JSONArray()
        lines.forEach {
            arr.put(
                JSONObject()
                    .put("localId", it.localId)
                    .put("title", it.title)
                    .put("place", it.place)
                    .put("note", it.note)
                    .put("ts", it.ts)
            )
        }
        ctx.getSharedPreferences(PREF, Context.MODE_PRIVATE)
            .edit().putString(key(naryadId), arr.toString()).apply()
    }

    fun add(ctx: Context, naryadId: String, title: String, place: String = "", note: String = "", ts: Long = System.currentTimeMillis() / 1000): Line {
        val line = Line(
            localId = "L${System.currentTimeMillis()}_${(Math.random() * 1e6).toInt()}",
            title = title.trim(),
            place = place.trim(),
            note = note.trim(),
            ts = ts
        )
        val all = list(ctx, naryadId).toMutableList()
        all.add(line)
        save(ctx, naryadId, all)
        return line
    }

    fun update(ctx: Context, naryadId: String, localId: String, title: String, place: String, note: String, ts: Long) {
        val all = list(ctx, naryadId).map {
            if (it.localId == localId) it.copy(title = title, place = place, note = note, ts = ts)
            else it
        }
        save(ctx, naryadId, all)
    }

    fun delete(ctx: Context, naryadId: String, localId: String) {
        save(ctx, naryadId, list(ctx, naryadId).filter { it.localId != localId })
    }
}
