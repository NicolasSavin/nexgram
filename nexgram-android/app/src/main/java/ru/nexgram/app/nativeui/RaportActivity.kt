package ru.nexgram.app.nativeui

import android.os.Bundle
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** Локальный рапорт (этап 2). Синхронизация с сервером — позже, по кнопке. */
class RaportActivity : AppCompatActivity() {

    private lateinit var list: LinearLayout
    private var naryadId: String = "local"
    private val fmt = SimpleDateFormat("dd.MM HH:mm", Locale.getDefault())

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        naryadId = intent.getStringExtra("naryadId") ?: "local"
        title = "Рапорт (натив)"
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(20, 20, 20, 20)
            setBackgroundColor(0xFF0B1A2E.toInt())
        }
        root.addView(TextView(this).apply {
            text = "Только на телефоне · наряд $naryadId"
            setTextColor(0xFF9AA8BC.toInt())
            setPadding(0, 0, 0, 12)
        })
        root.addView(Button(this).apply {
            text = "+ Добавить запись"
            setOnClickListener { addDialog() }
        })
        val scroll = ScrollView(this)
        list = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        scroll.addView(list)
        root.addView(scroll, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))
        setContentView(root)
        reload()
    }

    private fun reload() {
        list.removeAllViews()
        val lines = RaportStore.list(this, naryadId)
        if (lines.isEmpty()) {
            list.addView(TextView(this).apply {
                text = "Пока пусто. Добавьте событие."
                setTextColor(0xFF9AA8BC.toInt())
            })
            return
        }
        lines.forEach { line ->
            val box = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(8, 12, 8, 12)
            }
            box.addView(TextView(this).apply {
                text = "${fmt.format(Date(line.ts * 1000))}\n${line.title}" +
                    (if (line.place.isNotBlank()) "\n${line.place}" else "") +
                    (if (line.note.isNotBlank()) "\n${line.note}" else "")
                setTextColor(0xFFE8EEF6.toInt())
                textSize = 15f
            })
            val actions = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
            actions.addView(Button(this).apply {
                text = "Изменить"
                setOnClickListener { editDialog(line) }
            })
            actions.addView(Button(this).apply {
                text = "Удалить"
                setOnClickListener {
                    RaportStore.delete(this@RaportActivity, naryadId, line.localId)
                    reload()
                }
            })
            box.addView(actions)
            list.addView(box)
        }
    }

    private fun addDialog() {
        val title = EditText(this).apply { hint = "Событие" }
        val place = EditText(this).apply { hint = "Место" }
        val col = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            addView(title); addView(place)
            setPadding(24, 16, 24, 8)
        }
        AlertDialog.Builder(this)
            .setTitle("Новая запись")
            .setView(col)
            .setPositiveButton("Сохранить") { _, _ ->
                val t = title.text.toString().trim()
                if (t.isEmpty()) {
                    Toast.makeText(this, "Нужно событие", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                RaportStore.add(this, naryadId, t, place.text.toString())
                reload()
            }
            .setNegativeButton("Отмена", null)
            .show()
    }

    private fun editDialog(line: RaportStore.Line) {
        val title = EditText(this).apply { setText(line.title); hint = "Событие" }
        val place = EditText(this).apply { setText(line.place); hint = "Место" }
        val note = EditText(this).apply { setText(line.note); hint = "Заметка" }
        val col = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            addView(title); addView(place); addView(note)
            setPadding(24, 16, 24, 8)
        }
        AlertDialog.Builder(this)
            .setTitle("Изменить")
            .setView(col)
            .setPositiveButton("Ок") { _, _ ->
                RaportStore.update(
                    this, naryadId, line.localId,
                    title.text.toString(), place.text.toString(), note.text.toString(), line.ts
                )
                reload()
            }
            .setNegativeButton("Отмена", null)
            .show()
    }
}
