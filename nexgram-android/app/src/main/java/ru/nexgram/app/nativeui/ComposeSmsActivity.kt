package ru.nexgram.app.nativeui

import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

/** Нативный набор SMS с обязательным превью. */
class ComposeSmsActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        title = "SMS"
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(24, 24, 24, 24)
            setBackgroundColor(0xFF0B1A2E.toInt())
        }
        val phoneField = EditText(this).apply {
            hint = "Номер"
            setTextColor(0xFFE8EEF6.toInt())
            setHintTextColor(0xFF9AA8BC.toInt())
            setBackgroundColor(0xFF1A2332.toInt())
            setPadding(16, 20, 16, 20)
        }
        val bodyField = EditText(this).apply {
            hint = "Текст сообщения"
            minLines = 4
            setTextColor(0xFFE8EEF6.toInt())
            setHintTextColor(0xFF9AA8BC.toInt())
            setBackgroundColor(0xFF1A2332.toInt())
            setPadding(16, 20, 16, 20)
        }
        val send = Button(this).apply {
            text = "Отправить (с подтверждением)"
            setOnClickListener {
                val p = phoneField.text.toString().trim()
                val body = bodyField.text.toString().trim()
                if (p.length < 5 || body.isEmpty()) {
                    Toast.makeText(this@ComposeSmsActivity, "Номер и текст", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }
                SmsConfirm.sendWithPreview(this@ComposeSmsActivity, p, body) { r ->
                    val msg = when (r) {
                        "ok" -> "Отправлено"
                        "cancel" -> "Отменено"
                        else -> "Ошибка: $r"
                    }
                    Toast.makeText(this@ComposeSmsActivity, msg, Toast.LENGTH_SHORT).show()
                    if (r == "ok") finish()
                }
            }
        }
        root.addView(phoneField)
        root.addView(bodyField)
        root.addView(send)
        setContentView(root)
    }
}
