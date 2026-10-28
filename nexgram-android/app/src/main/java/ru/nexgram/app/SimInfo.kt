package ru.nexgram.app

import android.content.Context
import android.os.Build
import android.telephony.SubscriptionManager
import android.telephony.TelephonyManager
import org.json.JSONArray
import org.json.JSONObject

object SimInfo {
    /** JSON array: [{slot, label, carrier, subId}] */
    fun listSimsJson(ctx: Context): String {
        val arr = JSONArray()
        try {
            if (Build.VERSION.SDK_INT >= 22) {
                val sm = ctx.getSystemService(SubscriptionManager::class.java)
                val list = try { sm.activeSubscriptionInfoList } catch (_: SecurityException) { null }
                if (list != null && list.isNotEmpty()) {
                    for (info in list) {
                        val slot = info.simSlotIndex
                        val carrier = (info.carrierName?.toString() ?: "").ifBlank { info.displayName?.toString() ?: "" }
                        val label = if (carrier.isNotBlank()) "$carrier · SIM ${slot + 1}" else "SIM ${slot + 1}"
                        arr.put(JSONObject()
                            .put("slot", slot)
                            .put("label", label)
                            .put("carrier", carrier)
                            .put("subId", info.subscriptionId))
                    }
                    return arr.toString()
                }
            }
        } catch (_: Exception) {}
        // fallback: two slots
        arr.put(JSONObject().put("slot", 0).put("label", "SIM 1").put("carrier", "").put("subId", -1))
        arr.put(JSONObject().put("slot", 1).put("label", "SIM 2").put("carrier", "").put("subId", -1))
        return arr.toString()
    }
}
