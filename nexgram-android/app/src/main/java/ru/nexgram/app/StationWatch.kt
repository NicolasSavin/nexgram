package ru.nexgram.app

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

data class StationWatch(
    val id: String,
    val name: String,
    val lat: Double,
    val lon: Double,
    val nearM: Double = 800.0,
    val farM: Double = 1500.0,
    val escortPhone: String = "",
    val basePhone: String = "",
    val notifyEscort: Boolean = true
)

object StationWatchStore {
    private const val PREFS = "radar_watches"
    private const val KEY_LIST = "list"
    private const val KEY_STATE = "state"

    fun saveList(ctx: Context, json: String) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY_LIST, json).apply()
    }

    fun loadList(ctx: Context): List<StationWatch> {
        val raw = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_LIST, "[]") ?: "[]"
        return parse(raw)
    }

    fun parse(raw: String): List<StationWatch> {
        val out = mutableListOf<StationWatch>()
        try {
            val arr = JSONArray(raw)
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                val name = o.optString("name", o.optString("title", "")).trim()
                if (name.isEmpty()) continue
                val lat = o.optDouble("lat", o.optDouble("latitude", Double.NaN))
                val lon = o.optDouble("lon", o.optDouble("lng", o.optDouble("longitude", Double.NaN)))
                if (lat.isNaN() || lon.isNaN()) continue
                out.add(
                    StationWatch(
                        id = o.optString("id", name),
                        name = name,
                        lat = lat,
                        lon = lon,
                        nearM = o.optDouble("nearM", 800.0),
                        farM = o.optDouble("farM", 1500.0),
                        escortPhone = o.optString("escortPhone", o.optString("escort", "")),
                        basePhone = o.optString("basePhone", o.optString("base", "")),
                        notifyEscort = o.optBoolean("notifyEscort", true)
                    )
                )
            }
        } catch (_: Exception) {}
        return out
    }

    fun getState(ctx: Context): MutableMap<String, String> {
        val map = mutableMapOf<String, String>()
        try {
            val raw = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_STATE, "{}") ?: "{}"
            val o = JSONObject(raw)
            val keys = o.keys()
            while (keys.hasNext()) {
                val k = keys.next()
                map[k] = o.optString(k, "out")
            }
        } catch (_: Exception) {}
        return map
    }

    fun setState(ctx: Context, state: Map<String, String>) {
        val o = JSONObject()
        state.forEach { (k, v) -> o.put(k, v) }
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY_STATE, o.toString()).apply()
    }

    fun distanceM(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val r = 6371000.0
        val p1 = Math.toRadians(lat1)
        val p2 = Math.toRadians(lat2)
        val dP = Math.toRadians(lat2 - lat1)
        val dL = Math.toRadians(lon2 - lon1)
        val a = sin(dP / 2) * sin(dP / 2) + cos(p1) * cos(p2) * sin(dL / 2) * sin(dL / 2)
        val c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return r * c
    }
}
