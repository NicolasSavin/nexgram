package ru.nexgram.app

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.content.ContextCompat

class RadarService : Service(), LocationListener {
    private val handler = Handler(Looper.getMainLooper())
    private var locationManager: LocationManager? = null
    private var lastLat = 0.0
    private var lastLon = 0.0
    private var lastFixAt = 0L

    private val tick = object : Runnable {
        override fun run() {
            try {
                requestLocationOnce()
                updateNotification()
            } catch (_: Exception) {}
            handler.postDelayed(this, TICK_MS)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        instance = this
        ensureChannel()
        startAsForeground()
        locationManager = getSystemService(LOCATION_SERVICE) as LocationManager
        handler.post(tick)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startAsForeground()
        if (intent != null) {
            when (intent.action) {
                ACTION_SEND_SMS -> {
                    val phone = intent.getStringExtra(EXTRA_PHONE) ?: ""
                    val text = intent.getStringExtra(EXTRA_TEXT) ?: ""
                    val sim = intent.getIntExtra(EXTRA_SIM, -1)
                    val result = SmsHelper.send(this, phone, text, sim)
                    getSharedPreferences(PREFS, MODE_PRIVATE).edit()
                        .putString("last_sms_result", result)
                        .putLong("last_sms_at", System.currentTimeMillis())
                        .putString("last_sms_phone", phone)
                        .apply()
                }
                ACTION_PING_GEO -> requestLocationOnce()
            }
        }
        return START_STICKY
    }

    override fun onDestroy() {
        handler.removeCallbacks(tick)
        try { locationManager?.removeUpdates(this) } catch (_: Exception) {}
        instance = null
        super.onDestroy()
        try {
            val i = Intent(this, RadarService::class.java)
            if (Build.VERSION.SDK_INT >= 26) startForegroundService(i) else startService(i)
        } catch (_: Exception) {}
    }

    private fun startAsForeground() {
        val n = buildNotification("Гео и SMS в фоне")
        if (Build.VERSION.SDK_INT >= 34) {
            val types = ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION or
                ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
            startForeground(NOTIF_ID, n, types)
        } else if (Build.VERSION.SDK_INT >= 29) {
            startForeground(NOTIF_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
        } else {
            startForeground(NOTIF_ID, n)
        }
    }

    private fun ensureChannel() {
        if (Build.VERSION.SDK_INT < 26) return
        val nm = getSystemService(NotificationManager::class.java)
        val ch = NotificationChannel(CH_ID, "Радар: фон", NotificationManager.IMPORTANCE_LOW)
        ch.setShowBadge(false)
        ch.setSound(null, null)
        nm.createNotificationChannel(ch)
    }

    private fun buildNotification(text: String): Notification {
        val open = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val b = if (Build.VERSION.SDK_INT >= 26) {
            Notification.Builder(this, CH_ID)
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
        }
        return b.setContentTitle("Радар")
            .setContentText(text)
            .setSmallIcon(R.drawable.ic_radar)
            .setContentIntent(open)
            .setOngoing(true)
            .build()
    }

    private fun updateNotification() {
        val age = if (lastFixAt > 0) ((System.currentTimeMillis() - lastFixAt) / 1000).toInt() else -1
        val text = when {
            lastFixAt <= 0 -> "Ожидание геолокации…"
            age in 0..120 -> "Координаты свежие · SMS из фона готовы"
            else -> "Последний FIX ${age}с назад"
        }
        getSystemService(NotificationManager::class.java).notify(NOTIF_ID, buildNotification(text))
        getSharedPreferences(PREFS, MODE_PRIVATE).edit()
            .putString("last_lat", lastLat.toString())
            .putString("last_lon", lastLon.toString())
            .putLong("last_fix_at", lastFixAt)
            .apply()
    }

    private fun hasLocationPermission(): Boolean {
        val fine = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED
        val coarse = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED
        return fine || coarse
    }

    private fun requestLocationOnce() {
        if (!hasLocationPermission()) return
        val lm = locationManager ?: return
        try {
            for (p in listOf(LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER)) {
                if (!lm.isProviderEnabled(p)) continue
                lm.getLastKnownLocation(p)?.let { onLocationChanged(it) }
                try { lm.requestSingleUpdate(p, this, Looper.getMainLooper()) } catch (_: Exception) {}
            }
        } catch (_: Exception) {}
    }

    override fun onLocationChanged(location: Location) {
        lastLat = location.latitude
        lastLon = location.longitude
        lastFixAt = System.currentTimeMillis()
        updateNotification()
    }

    @Deprecated("Deprecated in Java")
    override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
    override fun onProviderEnabled(provider: String) {}
    override fun onProviderDisabled(provider: String) {}

    companion object {
        const val CH_ID = "radar_bg"
        const val NOTIF_ID = 11
        const val PREFS = "radar_bg"
        const val TICK_MS = 60_000L
        const val ACTION_SEND_SMS = "ru.nexgram.app.SEND_SMS"
        const val ACTION_PING_GEO = "ru.nexgram.app.PING_GEO"
        const val EXTRA_PHONE = "phone"
        const val EXTRA_TEXT = "text"
        const val EXTRA_SIM = "sim"

        @Volatile
        var instance: RadarService? = null

        fun ensureRunning(ctx: android.content.Context) {
            val i = Intent(ctx, RadarService::class.java)
            try {
                if (Build.VERSION.SDK_INT >= 26) ctx.startForegroundService(i)
                else ctx.startService(i)
            } catch (_: Exception) {}
        }

        fun sendSms(ctx: android.content.Context, phone: String, text: String, simSlot: Int = -1) {
            ensureRunning(ctx)
            val i = Intent(ctx, RadarService::class.java).apply {
                action = ACTION_SEND_SMS
                putExtra(EXTRA_PHONE, phone)
                putExtra(EXTRA_TEXT, text)
                putExtra(EXTRA_SIM, simSlot)
            }
            try {
                if (Build.VERSION.SDK_INT >= 26) ctx.startForegroundService(i)
                else ctx.startService(i)
            } catch (_: Exception) {
                SmsHelper.send(ctx, phone, text, simSlot)
            }
        }

        fun lastLocation(ctx: android.content.Context): Pair<Double, Double>? {
            val p = ctx.getSharedPreferences(PREFS, MODE_PRIVATE)
            val lat = p.getString("last_lat", null)?.toDoubleOrNull() ?: return null
            val lon = p.getString("last_lon", null)?.toDoubleOrNull() ?: return null
            return lat to lon
        }
    }
}
