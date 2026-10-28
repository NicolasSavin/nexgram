package ru.nexgram.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.TelephonyManager

class CallReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action != TelephonyManager.ACTION_PHONE_STATE_CHANGED) return
        val state = intent.getStringExtra(TelephonyManager.EXTRA_STATE) ?: return
        if (state != TelephonyManager.EXTRA_STATE_RINGING) return
        val phone = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER) ?: return
        context.getSharedPreferences("radar_call", Context.MODE_PRIVATE).edit()
            .putString("last_incoming", phone)
            .putLong("last_incoming_at", System.currentTimeMillis())
            .apply()
    }
}
