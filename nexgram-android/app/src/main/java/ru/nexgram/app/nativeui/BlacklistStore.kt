package ru.nexgram.app.nativeui

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/** Чёрный список (ЧС) — SharedPreferences, без WebView. */
object BlacklistStore {
    private const val PREF = "radar_native_spam"
    private const val KEY = "list"

    data class Entry(val phone: String, val note: String, val ts: Long)

    private fun digits(phone: String): String {
        var d = phone.filter { it.isDigit() }
        if (d.length == 11 && (d.startsWith("7") || d.startsWith("8"))) d = d.drop(1)
        if (d.length > 10) d = d.takeLast(10)
        return d
    }

    fun list(ctx: Context): List<Entry> {
        val raw = ctx.getSharedPreferences(PREF, Context.MODE_PRIVATE).getString(KEY, "[]") ?: "[]"
        return try {
            val arr = JSONArray(raw)
            (0 until arr.length()).mapNotNull { i ->
                val o = arr.optJSONObject(i) ?: return@mapNotNull null
                Entry(
                    phone = o.optString("phone"),
                    note = o.optString("note"),
                    ts = o.optLong("ts")
                )
            }
        } catch (_: Exception) {
            emptyList()
        }
    }

    fun isBlocked(ctx: Context, phone: String): Boolean {
        val k = digits(phone)
        if (k.length < 7) return false
        return list(ctx).any { digits(it.phone) == k }
    }

    fun add(ctx: Context, phone: String, note: String = ""): Boolean {
        val k = digits(phone)
        if (k.length < 7) return false
        val rest = list(ctx).filter { digits(it.phone) != k }.toMutableList()
        rest.add(0, Entry(phone = phone, note = note, ts = System.currentTimeMillis()))
        save(ctx, rest)
        return true
    }

    fun remove(ctx: Context, phone: String) {
        val k = digits(phone)
        save(ctx, list(ctx).filter { digits(it.phone) != k })
    }

    private fun save(ctx: Context, items: List<Entry>) {
        val arr = JSONArray()
        items.forEach {
            arr.put(JSONObject().put("phone", it.phone).put("note", it.note).put("ts", it.ts))
        }
        ctx.getSharedPreferences(PREF, Context.MODE_PRIVATE).edit().putString(KEY, arr.toString()).apply()
    }
}
