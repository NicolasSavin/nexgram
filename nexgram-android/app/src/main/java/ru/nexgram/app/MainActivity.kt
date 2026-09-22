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
import okhttp3.Response
import java.util.concurrent.TimeUnit
import kotlin.concurrent.thread

class MainActivity : AppCompatActivity() {
    private lateinit var web: WebView
    private var pendingMic: PermissionRequest? = null
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var nativeWs: WebSocket? = null
    private val okHttp = OkHttpClient.Builder().readTimeout(0, TimeUnit.MILLISECONDS).build()

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        androidx.core.view.WindowCompat.setDecorFitsSystemWindows(window, true)
        setContentView(R.layout.activity_main)
        web = findViewById(R.id.web)
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
        s.cacheMode = WebSettings.LOAD_DEFAULT
        s.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        WebView.setWebContentsDebuggingEnabled(true)
        web.isFocusable = true
        web.isFocusableInTouchMode = true
        web.addJavascriptInterface(RadarBridge(), "RadarNative")
        ensureMsgChannel()

        web.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                val needsMic = request.resources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)
                if (!needsMic) {
                    request.grant(request.resources)
                    return
                }
                if (ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.RECORD_AUDIO)
                    == PackageManager.PERMISSION_GRANTED
                ) {
                    request.grant(request.resources)
                } else {
                    pendingMic = request
                    ActivityCompat.requestPermissions(
                        this@MainActivity,
                        arrayOf(Manifest.permission.RECORD_AUDIO),
                        31
                    )
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
        }
        web.webViewClient = object : WebViewClientCompat() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
                val host = request.url.host ?: return null
                if (host == "appassets.androidplatform.net") {
                    return assetLoader.shouldInterceptRequest(request.url)
                }
                return null
            }
            override fun onPageFinished(view: WebView, url: String) {
                injectRelay()
            }
        }

        web.loadUrl("https://appassets.androidplatform.net/assets/www/index.html")
        checkUpdate()
    }

    private fun checkUpdate() {
        val current = try {
            packageManager.getPackageInfo(packageName, 0).versionCode
        } catch (_: Exception) { 7 }
        thread {
            try {
                val raw = URL("https://nicolassavin.github.io/nexgram/version.json").readText()
                val j = JSONObject(raw)
                val remote = j.optInt("versionCode", 0)
                val name = j.optString("versionName", "")
                if (remote > current) {
                    runOnUiThread {
                        AlertDialog.Builder(this)
                            .setTitle("Радар")
                            .setMessage("Доступна версия $name")
                            .setPositiveButton("OK", null)
                            .show()
                    }
                }
            } catch (_: Exception) { }
        }
    }

    override fun onRequestPermissionsResult(code: Int, perms: Array<out String>, res: IntArray) {
        super.onRequestPermissionsResult(code, perms, res)
        if (code == 31) {
            val ok = res.isNotEmpty() && res[0] == PackageManager.PERMISSION_GRANTED
            pendingMic?.let { if (ok) it.grant(it.resources) else it.deny() }
            pendingMic = null
        }
    }

    private fun requestAppPerms() {
        val want = mutableListOf(Manifest.permission.RECORD_AUDIO)
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

    private fun injectRelay() {
        val js = "window.NEXGRAM_RELAY = ${org.json.JSONObject.quote("http://186.246.3.44")};"
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
            val req = Request.Builder().url(url).build()
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
