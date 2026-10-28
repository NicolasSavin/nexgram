package ru.nexgram.app

import android.Manifest
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.telephony.SmsManager
import android.telephony.SubscriptionManager
import androidx.core.content.ContextCompat

object SmsHelper {
    fun hasSmsPermission(ctx: Context): Boolean {
        return ContextCompat.checkSelfPermission(ctx, Manifest.permission.SEND_SMS) ==
            PackageManager.PERMISSION_GRANTED
    }

    fun send(ctx: Context, phone: String, text: String, simSlot: Int = -1): String {
        if (!hasSmsPermission(ctx)) return "no_permission"
        val digits = phone.filter { it.isDigit() || it == '+' }
        if (digits.length < 5) return "bad_number"
        if (text.isBlank()) return "empty"
        return try {
            val sms = smsManagerFor(ctx, simSlot)
            val parts = sms.divideMessage(text)
            if (parts.size == 1) {
                sms.sendTextMessage(digits, null, text, sentPi(ctx), null)
            } else {
                val sent = ArrayList<PendingIntent>()
                repeat(parts.size) { sent.add(sentPi(ctx)) }
                sms.sendMultipartTextMessage(digits, null, parts, sent, null)
            }
            "ok"
        } catch (e: Exception) {
            "fail:${e.message ?: "error"}"
        }
    }

    private fun smsManagerFor(ctx: Context, simSlot: Int): SmsManager {
        if (simSlot >= 0 && Build.VERSION.SDK_INT >= 31) {
            try {
                val sm = ctx.getSystemService(SubscriptionManager::class.java)
                val list = sm.activeSubscriptionInfoList
                if (list != null && simSlot < list.size) {
                    val subId = list[simSlot].subscriptionId
                    return SmsManager.getSmsManagerForSubscriptionId(subId)
                }
            } catch (_: Exception) {}
        }
        return if (Build.VERSION.SDK_INT >= 23) {
            ctx.getSystemService(SmsManager::class.java) ?: SmsManager.getDefault()
        } else {
            @Suppress("DEPRECATION")
            SmsManager.getDefault()
        }
    }

    private fun sentPi(ctx: Context): PendingIntent {
        val i = Intent("ru.nexgram.app.SMS_SENT")
        return PendingIntent.getBroadcast(
            ctx, (System.currentTimeMillis() % 100000).toInt(), i,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }
}
