package ru.nexgram.app.nativeui

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

/** Каркас наряда (этап 3) — пока переход в нативный рапорт/журнал. */
class NaryadActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val id = intent.getStringExtra("naryadId") ?: "local"
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(24, 24, 24, 24)
            setBackgroundColor(0xFF0B1A2E.toInt())
        }
        root.addView(TextView(this).apply {
            text = "Наряд (натив, этап 3)\n$id\n\nПолный разбор наряда с сайта — следующий подэтап."
            setTextColor(0xFFE8EEF6.toInt())
            textSize = 16f
        })
        root.addView(Button(this).apply {
            text = "Рапорт"
            setOnClickListener {
                startActivity(Intent(this@NaryadActivity, RaportActivity::class.java).putExtra("naryadId", id))
            }
        })
        root.addView(Button(this).apply {
            text = "Журнал"
            setOnClickListener {
                startActivity(Intent(this@NaryadActivity, JournalActivity::class.java))
            }
        })
        setContentView(root)
    }
}
