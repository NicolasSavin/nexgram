package ru.nexgram.app.nativeui

import android.content.Context

/** Общий рубильник автоSMS / слежения (как в 1.8.40). По умолчанию ВЫКЛ. */
object MasterAuto {
    private const val PREF = "radar_native_auto"
    private const val KEY = "master"

    fun isOn(ctx: Context): Boolean {
        val p = ctx.getSharedPreferences(PREF, Context.MODE_PRIVATE)
        if (!p.contains(KEY)) return false
        return p.getBoolean(KEY, false)
    }

    fun set(ctx: Context, on: Boolean) {
        ctx.getSharedPreferences(PREF, Context.MODE_PRIVATE).edit().putBoolean(KEY, on).apply()
    }
}
