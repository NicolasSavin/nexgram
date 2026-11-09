package ru.nexgram.app.nativeui

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

/** Нативный набор SMS с обязательным превью и запросом разрешения. */
class ComposeSmsActivity : AppCompatActivity() {

    private lateinit var phoneField: EditText
    private lateinit var bodyField: EditText

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        title = "SMS"
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(24, 24, 24, 24)
            setBackgroundColor(0xFF0B1A2E.toInt())
        }
        phoneField = EditText(this).apply {
            hint = "Номер"
            setTextColor(0xFFE8EEF6.toInt())
            setHintTextColor(0xFF9AA8BC.toInt())
            setBackgroundColor(0xFF1A2332.toInt())
            setPadding(16, 20, 16, 20)
        }
        bodyField = EditText(this).apply {
            hint = "Текст сообщения"
            minLines = 4
            setTextColor(0xFFE8EEF6.toInt())
            setHintTextColor(0xFF9AA8BC.toInt())
            setBackgroundColor(0xFF1A2332.toInt())
            setPadding(16, 20, 16, 20)
        }
        val send = Button(this).apply {
            text = "Отправить (с подтверждением)"
            setOnClickListener { trySend() }
        }
        root.addView(phoneField)
        root.addView(bodyField)
        root.addView(send)
        setContentView(root)

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.SEND_SMS)
            != PackageManager.PERMISSION_GRANTED
        ) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(
                    Manifest.permission.SEND_SMS,
                    Manifest.permission.READ_PHONE_STATE
                ),
                91
            )
        }
    }

    private fun trySend() {
        val p = phoneField.text.toString().trim()
        val body = bodyField.text.toString().trim()
        if (p.length < 5 || body.isEmpty()) {
            Toast.makeText(this, "Номер и текст", Toast.LENGTH_SHORT).show()
            return
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.SEND_SMS)
            != PackageManager.PERMISSION_GRANTED
        ) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.SEND_SMS, Manifest.permission.READ_PHONE_STATE),
                92
            )
            Toast.makeText(this, "Разрешите SMS и нажмите снова", Toast.LENGTH_LONG).show()
            return
        }
        SmsConfirm.sendWithPreview(this, p, body) { r ->
            val msg = when (r) {
                "ok" -> "Отправлено"
                "cancel" -> "Отменено"
                "no_permission" -> "Нет разрешения SMS — включите в настройках"
                else -> "Ошибка: $r"
            }
            Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()
            if (r == "ok") finish()
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 92 && grantResults.isNotEmpty()
            && grantResults[0] == PackageManager.PERMISSION_GRANTED
        ) {
            trySend()
        }
    }
}
