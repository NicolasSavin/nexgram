package ru.nexgram.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.os.Bundle
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.os.Build
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewClientCompat
import org.json.JSONObject
import java.net.URL
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import java.util.concurrent.TimeUnit
import kotlin.concurrent.thread

class MainActivity : AppCompatActivity() {
    private lateinit var web: WebView
    private var pendingMic: PermissionRequest? = null
    private var geoCallback: android.webkit.GeolocationPermissions.Callback? = null
    private var geoOrigin: String? = null
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var nativeWs: WebSocket? = null
    private val okHttp = OkHttpClient.Builder().readTimeout(0, TimeUnit.MILLISECONDS).build()
    private val httpClient = OkHttpClient.Builder()
        .readTimeout(25, TimeUnit.SECONDS)
        .connectTimeout(10, TimeUnit.SECONDS)
        .build()

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        androidx.core.view.WindowCompat.setDecorFitsSystemWindows(window, true)
        setContentView(R.layout.activity_main)
        web = findViewById(R.id.web)
        web.setBackgroundColor(android.graphics.Color.parseColor("#0E1621"))
        requestAppPerms()

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        val s = web.settings
        s.javaScriptEnabled = true
        s.domStorageEnabled = true
        s.databaseEnabled = true
        s.mediaPlaybackRequiresUserGesture = false
        s.allowFileAccess = true
        s.cacheMode = WebSettings.LOAD_NO_CACHE
        s.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        WebView.setWebContentsDebuggingEnabled(true)
        web.isFocusable = true
        web.isFocusableInTouchMode = true
        web.addJavascriptInterface(RadarBridge(), "RadarNative")
        ensureMsgChannel()

        web.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                val need = mutableListOf<String>()
                if (request.resources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE) &&
                    ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.RECORD_AUDIO)
                    != PackageManager.PERMISSION_GRANTED
                ) need += Manifest.permission.RECORD_AUDIO
                if (request.resources.contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE) &&
                    ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.CAMERA)
                    != PackageManager.PERMISSION_GRANTED
                ) need += Manifest.permission.CAMERA
                if (need.isEmpty()) {
                    request.grant(request.resources)
                } else {
                    pendingMic = request
                    ActivityCompat.requestPermissions(this@MainActivity, need.toTypedArray(), 31)
                }
            }
            override fun onShowFileChooser(
                webView: WebView,
                filePathCallback: ValueCallback<Array<Uri>>,
                fileChooserParams: FileChooserParams
            ): Boolean {
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback
                val intent = Intent(Intent.ACTION_GET_CONTENT)
                intent.addCategory(Intent.CATEGORY_OPENABLE)
                intent.type = "*/*"
                intent.putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("image/*", "video/*", "audio/*"))
                startActivityForResult(Intent.createChooser(intent, "Файл"), 77)
                return true
            }
            override fun onGeolocationPermissionsShowPrompt(
                origin: String,
                callback: android.webkit.GeolocationPermissions.Callback
            ) {
                val fine = ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.ACCESS_FINE_LOCATION)
                val coarse = ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.ACCESS_COARSE_LOCATION)
                if (fine == PackageManager.PERMISSION_GRANTED || coarse == PackageManager.PERMISSION_GRANTED) {
                    callback.invoke(origin, true, false)
                    return
                }
                geoOrigin = origin
                geoCallback = callback
                ActivityCompat.requestPermissions(
                    this@MainActivity,
                    arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION),
                    32
                )
            }
        }
        web.webViewClient = object : WebViewClientCompat() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
                val host = request.url.host ?: return null
                if (host == "appassets.androidplatform.net") {
                    return assetLoader.shouldInterceptRequest(request.url)
                }
                return null
            }
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val uri = request.url ?: return false
                val scheme = uri.scheme ?: ""
                if (scheme == "sms" || scheme == "smsto" || scheme == "tel") {
                    try {
                        startActivity(Intent(Intent.ACTION_SENDTO, uri).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                    } catch (_: Exception) {}
                    return true
                }
                val host = uri.host ?: return false
                val inside = host == "appassets.androidplatform.net" ||
                    host.endsWith("trycloudflare.com") ||
                    host == "karavanmessage.ru" ||
                    host == "186.246.3.44" ||
                    host.endsWith("github.io") ||
                    host.endsWith("jsdelivr.net")
                if (inside) return false
                if (host == "pass.rzd.ru" || host.endsWith(".rzd.ru")) {
                    val launch = packageManager.getLaunchIntentForPackage("ru.rzd.pass")
                    if (launch != null) {
                        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        startActivity(launch)
                    }
                    return true
                }
                try {
                    startActivity(Intent(Intent.ACTION_VIEW, uri))
                } catch (_: Exception) {}
                return true
            }
            override fun onPageFinished(view: WebView, url: String) {
                injectRelay()
            }
        }

        web.loadUrl("https://appassets.androidplatform.net/assets/www/index.html")
        checkUpdate(false)
    }

    private var pendingApk: java.io.File? = null

    private fun checkUpdate(manual: Boolean = false) {
        val current = try {
            if (Build.VERSION.SDK_INT >= 28) {
                packageManager.getPackageInfo(packageName, 0).longVersionCode.toInt()
            } else {
                @Suppress("DEPRECATION")
                packageManager.getPackageInfo(packageName, 0).versionCode
            }
        } catch (_: Exception) { 0 }
        thread {
            try {
                val bases = listOf(
                    "https://photography-word-essence-knowledge.trycloudflare.com",
                    "http://186.246.3.44"
                )
                var raw = ""
                for (b in bases) {
                    try {
                        raw = httpGet("$b/version.json")
                        if (raw.contains("versionCode")) break
                    } catch (_: Exception) {}
                }
                if (!raw.contains("versionCode")) {
                    if (manual) runOnUiThread {
                        AlertDialog.Builder(this).setMessage("Сервер обновления не ответил.").setPositiveButton("OK", null).show()
                    }
                    return@thread
                }
                val j = JSONObject(raw)
                val remote = j.optInt("versionCode", 0)
                val name = j.optString("versionName", "")
                val file = j.optString("file", "")
                if (remote > current && file.endsWith(".apk")) {
                    runOnUiThread {
                        AlertDialog.Builder(this)
                            .setTitle("Есть обновление")
                            .setMessage("Радар $name. Старое удалять не нужно. Нажмите «Установить».")
                            .setPositiveButton("Обновить") { _, _ -> downloadAndInstall(file) }
                            .setNegativeButton("Позже", null)
                            .show()
                    }
                } else if (manual) {
                    runOnUiThread {
                        AlertDialog.Builder(this).setMessage("Уже последняя версия.").setPositiveButton("OK", null).show()
                    }
                }
            } catch (_: Exception) {}
        }
    }

    private fun downloadAndInstall(fileName: String) {
        val dlg = AlertDialog.Builder(this).setTitle("Радар").setMessage("Скачиваю обновление…").setCancelable(false).show()
        thread {
            var saved: java.io.File? = null
            val bases = listOf(
                "https://photography-word-essence-knowledge.trycloudflare.com",
                "http://186.246.3.44"
            )
            for (b in bases) {
                try {
                    val dir = java.io.File(cacheDir, "apk")
                    dir.mkdirs()
                    val out = java.io.File(dir, "radar-update.apk")
                    val req = Request.Builder().url("$b/$fileName")
                        .header("User-Agent", "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36")
                        .build()
                    httpClient.newCall(req).execute().use { resp ->
                        if (!resp.isSuccessful) return@use
                        val body = resp.body ?: return@use
                        out.outputStream().use { body.byteStream().copyTo(it) }
                    }
                    if (out.length() > 100000) { saved = out; break }
                } catch (_: Exception) {}
            }
            val apk = saved
            runOnUiThread {
                try { dlg.dismiss() } catch (_: Exception) {}
                if (apk == null) {
                    AlertDialog.Builder(this).setMessage("Не скачалось. Откройте сайт и нажмите синюю кнопку.").setPositiveButton("OK", null).show()
                } else installApk(apk)
            }
        }
    }

    private fun installApk(file: java.io.File) {
        if (Build.VERSION.SDK_INT >= 26 && !packageManager.canRequestPackageInstalls()) {
            pendingApk = file
            AlertDialog.Builder(this)
                .setTitle("Разрешите установку")
                .setMessage("Включите «Разрешить из этого источника» для Радара и вернитесь сюда.")
                .setPositiveButton("Открыть") { _, _ ->
                    startActivity(Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:$packageName")))
                }
                .show()
            return
        }
        val uri = androidx.core.content.FileProvider.getUriForFile(this, "$packageName.fileprovider", file)
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        startActivity(intent)
    }

    override fun onResume() {
        super.onResume()
        val apk = pendingApk
        if (apk != null && Build.VERSION.SDK_INT >= 26 && packageManager.canRequestPackageInstalls()) {
            pendingApk = null
            installApk(apk)
        }
    }

    override fun onRequestPermissionsResult(code: Int, perms: Array<out String>, res: IntArray) {
        super.onRequestPermissionsResult(code, perms, res)
        if (code == 31) {
            val ok = res.isNotEmpty() && res[0] == PackageManager.PERMISSION_GRANTED
            pendingMic?.let { if (ok) it.grant(it.resources) else it.deny() }
            pendingMic = null
        }
        if (code == 32) {
            val ok = res.any { it == PackageManager.PERMISSION_GRANTED }
            geoCallback?.invoke(geoOrigin, ok, false)
            geoCallback = null
            geoOrigin = null
        }
    }

    private fun requestAppPerms() {
        val want = mutableListOf(
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.CAMERA,
            Manifest.permission.ACCESS_COARSE_LOCATION,
            Manifest.permission.ACCESS_FINE_LOCATION
        )
        if (android.os.Build.VERSION.SDK_INT >= 33) {
            want += Manifest.permission.READ_MEDIA_IMAGES
            want += Manifest.permission.READ_MEDIA_VIDEO
            want += Manifest.permission.READ_MEDIA_AUDIO
        } else {
            want += Manifest.permission.READ_EXTERNAL_STORAGE
        }
        if (android.os.Build.VERSION.SDK_INT >= 33) {
            want += Manifest.permission.POST_NOTIFICATIONS
        }
        val need = want.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (need.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, need.toTypedArray(), 32)
        }
    }

    private fun httpGet(url: String): String {
        val req = Request.Builder().url(url)
            .header("User-Agent", "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36")
            .build()
        httpClient.newCall(req).execute().use { resp ->
            if (!resp.isSuccessful) throw RuntimeException("bad")
            return resp.body?.string() ?: ""
        }
    }

    private fun injectRelay() {
        val ver = try {
            packageManager.getPackageInfo(packageName, 0).versionName ?: ""
        } catch (_: Exception) { "" }
        val js = "window.NEXGRAM_RELAY = ${org.json.JSONObject.quote("http://186.246.3.44")};" +
            "var __v=document.querySelector('.drawer-phone'); if(__v) __v.textContent=" + org.json.JSONObject.quote("версия $ver") + ";"
        web.evaluateJavascript(js, null)
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != 77) return
        val uri = if (resultCode == Activity.RESULT_OK) data?.data else null
        filePathCallback?.onReceiveValue(if (uri != null) arrayOf(uri) else null)
        filePathCallback = null
    }

    inner class RadarBridge {
        @JavascriptInterface
        fun updateApp() {
            runOnUiThread { checkUpdate(true) }
        }
        @JavascriptInterface
        fun openRzd() {
            runOnUiThread {
                val launch = packageManager.getLaunchIntentForPackage("ru.rzd.pass")
                if (launch != null) {
                    launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    startActivity(launch)
                    return@runOnUiThread
                }
                try {
                    startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://apps.rustore.ru/catalog/app/ru.rzd.pass")))
                } catch (_: Exception) {}
            }
        }
        @JavascriptInterface
        fun openExternal(url: String) {
            runOnUiThread {
                try {
                    startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                } catch (_: Exception) {}
            }
        }
        @JavascriptInterface
        fun notify(title: String, body: String) {
            runOnUiThread { showMsg(title, body) }
        }
        @JavascriptInterface
        fun keepAlive(on: Boolean) {
            runOnUiThread {
                val i = Intent(this@MainActivity, RadarService::class.java)
                if (on) {
                    if (Build.VERSION.SDK_INT >= 26) startForegroundService(i) else startService(i)
                } else stopService(i)
            }
        }
        @JavascriptInterface
        fun wsOpen(url: String) {
            nativeWs?.cancel()
            val httpUrl = url.replace(Regex("^ws://"), "http://").replace(Regex("^wss://"), "https://")
            val req = Request.Builder().url(httpUrl).build()
            nativeWs = okHttp.newWebSocket(req, object : WebSocketListener() {
                override fun onOpen(webSocket: WebSocket, response: Response) {
                    runOnUiThread { web.evaluateJavascript("window.__radarWsOnOpen&&window.__radarWsOnOpen()", null) }
                }
                override fun onMessage(webSocket: WebSocket, text: String) {
                    val q = JSONObject.quote(text)
                    runOnUiThread { web.evaluateJavascript("window.__radarWsOnMessage&&window.__radarWsOnMessage($q)", null) }
                }
                override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                    runOnUiThread { web.evaluateJavascript("window.__radarWsOnClose&&window.__radarWsOnClose()", null) }
                }
                override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                    val q = JSONObject.quote(t.message ?: "fail")
                    runOnUiThread { web.evaluateJavascript("window.__radarWsOnError&&window.__radarWsOnError($q)", null) }
                }
            })
        }
        @JavascriptInterface
        fun wsSend(data: String) { nativeWs?.send(data) }
        @JavascriptInterface
        fun wsClose() { nativeWs?.close(1000, "bye"); nativeWs = null }
        @JavascriptInterface
        fun httpReq(id: String, method: String, url: String, body: String) {
            thread {
                try {
                    val b = Request.Builder().url(url)
                    if (method.equals("POST", ignoreCase = true)) {
                        b.post((body ?: "").toRequestBody("application/json; charset=utf-8".toMediaType()))
                    }
                    httpClient.newCall(b.build()).execute().use { resp ->
                        val text = resp.body?.string() ?: ""
                        val js = "window.__radarHttpCb&&window.__radarHttpCb(${JSONObject.quote(id)},${JSONObject.quote(text)})"
                        runOnUiThread { web.evaluateJavascript(js, null) }
                    }
                } catch (e: Exception) {
                    val js = "window.__radarHttpCb&&window.__radarHttpCb(${JSONObject.quote(id)},${JSONObject.quote("ERR:" + (e.message ?: "fail"))})"
                    runOnUiThread { web.evaluateJavascript(js, null) }
                }
            }
        }
    }

    private fun ensureMsgChannel() {
        if (Build.VERSION.SDK_INT < 26) return
        val nm = getSystemService(NotificationManager::class.java)
        val ch = NotificationChannel("radar_msg", "Сообщения Радара", NotificationManager.IMPORTANCE_HIGH)
        ch.enableVibration(true)
        ch.setSound(android.provider.Settings.System.DEFAULT_NOTIFICATION_URI, Notification.AUDIO_ATTRIBUTES_DEFAULT)
        nm.createNotificationChannel(ch)
    }

    private fun showMsg(title: String, body: String) {
        val nm = getSystemService(NotificationManager::class.java)
        val open = PendingIntent.getActivity(
            this, 2, Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val n = if (Build.VERSION.SDK_INT >= 26) {
            Notification.Builder(this, "radar_msg")
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
        }
            .setContentTitle(title)
            .setContentText(body)
            .setSmallIcon(R.drawable.ic_radar)
            .setContentIntent(open)
            .setAutoCancel(true)
            .setDefaults(Notification.DEFAULT_ALL)
            .build()
        nm.notify((System.currentTimeMillis() % 100000).toInt(), n)
    }

    override fun onPause() {
        super.onPause()
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (web.canGoBack()) web.goBack() else super.onBackPressed()
    }
}
