package ru.nexgram.app.nativeui

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import ru.nexgram.app.MainActivity

/** Нативный дом: полный Радар + стабильные экраны. */
class NativeHomeActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        title = "Радар"
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(28, 36, 28, 28)
            setBackgroundColor(0xFF0B1A2E.toInt())
        }
        root.addView(TextView(this).apply {
            text = "Радар"
            setTextColor(0xFFE8EEF6.toInt())
            textSize = 28f
            setPadding(0, 0, 0, 8)
        })
        root.addView(TextView(this).apply {
            text = "Полный интерфейс и нативные инструменты\nАвто: " +
                if (MasterAuto.isOn(this@NativeHomeActivity)) "ВКЛ" else "ВЫКЛ"
            setTextColor(0xFF9AA8BC.toInt())
            setPadding(0, 0, 0, 24)
        })

        fun btn(label: String, block: () -> Unit): Button {
            return Button(this).apply {
                text = label
                textSize = 16f
                setPadding(20, 28, 20, 28)
                setOnClickListener { block() }
            }.also {
                val lp = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                )
                lp.bottomMargin = 12
                root.addView(it, lp)
            }
        }

        btn("Полный Радар (весь функционал)") {
            startActivity(Intent(this, MainActivity::class.java))
        }
        btn("Журнал звонков и SMS") {
            startActivity(Intent(this, JournalActivity::class.java))
        }
        btn("Рапорт (локально)") {
            startActivity(Intent(this, RaportActivity::class.java).putExtra("naryadId", "local"))
        }
        btn("Написать SMS") {
            startActivity(Intent(this, ComposeSmsActivity::class.java))
        }
        btn("Наряд") {
            startActivity(Intent(this, NaryadActivity::class.java).putExtra("naryadId", "local"))
        }
        btn(if (MasterAuto.isOn(this)) "Авто: ВЫКЛЮЧИТЬ" else "Авто: включить") {
            MasterAuto.set(this, !MasterAuto.isOn(this))
            recreate()
        }
        setContentView(root)
    }
}
