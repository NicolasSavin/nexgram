package ru.nexgram.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.os.Bundle
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.widget.EditText
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewClientCompat

class MainActivity : AppCompatActivity() {
    private lateinit var web: WebView
    private var pendingMic: PermissionRequest? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        androidx.core.view.WindowCompat.setDecorFitsSystemWindows(window, true)
        setContentView(R.layout.activity_main)
        web = findViewById(R.id.web)

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
        }
        web.webViewClient = object : WebViewClientCompat() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
                return assetLoader.shouldInterceptRequest(request.url)
            }
            override fun onPageFinished(view: WebView, url: String) {
                injectRelay()
            }
        }

        web.setOnLongClickListener {
            askRelay()
            true
        }

        web.loadUrl("https://appassets.androidplatform.net/assets/www/index.html")
    }

    override fun onRequestPermissionsResult(code: Int, perms: Array<out String>, res: IntArray) {
        super.onRequestPermissionsResult(code, perms, res)
        if (code == 31) {
            val ok = res.isNotEmpty() && res[0] == PackageManager.PERMISSION_GRANTED
            pendingMic?.let { if (ok) it.grant(it.resources) else it.deny() }
            pendingMic = null
        }
    }

    private fun prefs() = getSharedPreferences("nexgram", Context.MODE_PRIVATE)

    private fun injectRelay() {
        val relay = prefs().getString("relay", "") ?: ""
        val js = "window.NEXGRAM_RELAY = ${org.json.JSONObject.quote(relay)};"
        web.evaluateJavascript(js, null)
    }

    private fun askRelay() {
        val input = EditText(this)
        input.hint = getString(R.string.server_hint)
        input.setText(prefs().getString("relay", "") ?: "")
        AlertDialog.Builder(this)
            .setTitle(R.string.menu_server)
            .setMessage("Долгое нажатие — адрес реле. Рация работает после входа в комнату NGP.")
            .setView(input)
            .setPositiveButton(R.string.save) { _, _ ->
                prefs().edit().putString("relay", input.text.toString().trim()).apply()
                injectRelay()
            }
            .setNegativeButton(R.string.demo) { _, _ ->
                prefs().edit().putString("relay", "").apply()
                injectRelay()
            }
            .show()
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (web.canGoBack()) web.goBack() else super.onBackPressed()
    }
}
