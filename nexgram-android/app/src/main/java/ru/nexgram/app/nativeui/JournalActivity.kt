package ru.nexgram.app.nativeui

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.provider.CallLog
import android.provider.Telephony
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** Нативный журнал: звонки + SMS + ЧС (этап 1 / 1б). */
class JournalActivity : AppCompatActivity() {

    private lateinit var list: LinearLayout
    private val fmt = SimpleDateFormat("dd.MM HH:mm", Locale.getDefault())

    data class Row(val ts: Long, val phone: String, val label: String, val isSms: Boolean)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        title = "Журнал (натив)"
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(24, 24, 24, 24)
            setBackgroundColor(0xFF0B1A2E.toInt())
        }
        root.addView(TextView(this).apply {
            text = "Звонки и SMS · ЧС: ${BlacklistStore.list(this@JournalActivity).size}\nАвто: ${if (MasterAuto.isOn(this@JournalActivity)) "ВКЛ" else "ВЫКЛ"}"
            setTextColor(0xFFE8EEF6.toInt())
            textSize = 16f
            setPadding(0, 0, 0, 12)
        })
        val toggle = Button(this).apply {
            text = if (MasterAuto.isOn(this@JournalActivity)) "Выключить всё авто" else "Включить авто"
            setOnClickListener {
                MasterAuto.set(this@JournalActivity, !MasterAuto.isOn(this@JournalActivity))
                recreate()
            }
        }
        root.addView(toggle)
        val scroll = ScrollView(this)
        list = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        scroll.addView(list)
        root.addView(scroll, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))
        setContentView(root)

        val need = mutableListOf<String>()
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_CALL_LOG) != PackageManager.PERMISSION_GRANTED)
            need.add(Manifest.permission.READ_CALL_LOG)
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED)
            need.add(Manifest.permission.READ_SMS)
        if (need.isNotEmpty()) ActivityCompat.requestPermissions(this, need.toTypedArray(), 42)
        else load()
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        load()
    }

    private fun load() {
        list.removeAllViews()
        val rows = mutableListOf<Row>()
        try {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_CALL_LOG) == PackageManager.PERMISSION_GRANTED) {
                contentResolver.query(
                    CallLog.Calls.CONTENT_URI,
                    arrayOf(CallLog.Calls.NUMBER, CallLog.Calls.TYPE, CallLog.Calls.DATE),
                    null, null, CallLog.Calls.DATE + " DESC"
                )?.use { c ->
                    var n = 0
                    while (c.moveToNext() && n < 50) {
                        val phone = c.getString(0) ?: continue
                        val type = c.getInt(1)
                        val date = c.getLong(2)
                        val kind = when (type) {
                            CallLog.Calls.INCOMING_TYPE -> "Входящий"
                            CallLog.Calls.OUTGOING_TYPE -> "Исходящий"
                            CallLog.Calls.MISSED_TYPE -> "Пропущен"
                            else -> "Звонок"
                        }
                        rows.add(Row(date, phone, kind, false))
                        n++
                    }
                }
            }
        } catch (_: Exception) {}
        try {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED) {
                contentResolver.query(
                    Telephony.Sms.CONTENT_URI,
                    arrayOf(Telephony.Sms.ADDRESS, Telephony.Sms.BODY, Telephony.Sms.DATE, Telephony.Sms.TYPE),
                    null, null, Telephony.Sms.DATE + " DESC"
                )?.use { c ->
                    var n = 0
                    while (c.moveToNext() && n < 40) {
                        val phone = c.getString(0) ?: continue
                        val body = (c.getString(1) ?: "").replace('\n', ' ').take(40)
                        val date = c.getLong(2)
                        val type = c.getInt(3)
                        val kind = if (type == Telephony.Sms.MESSAGE_TYPE_INBOX) "SMS вх" else "SMS исх"
                        rows.add(Row(date, phone, "$kind · $body", true))
                        n++
                    }
                }
            }
        } catch (_: Exception) {}

        rows.sortByDescending { it.ts }
        if (rows.isEmpty()) {
            list.addView(TextView(this).apply {
                text = "Нет записей или нет доступа"
                setTextColor(0xFF9AA8BC.toInt())
            })
            return
        }
        rows.take(60).forEach { row ->
            val blocked = BlacklistStore.isBlocked(this, row.phone)
            val line = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                setPadding(8, 12, 8, 12)
            }
            line.addView(TextView(this).apply {
                text = "${row.phone}\n${row.label} · ${fmt.format(Date(row.ts))}" + if (blocked) " · ЧС" else ""
                setTextColor(if (blocked) 0xFFF9A8A8.toInt() else 0xFFE8EEF6.toInt())
                textSize = 14f
                layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
            })
            line.addView(Button(this).apply {
                text = if (blocked) "Снять" else "В ЧС"
                setOnClickListener {
                    if (BlacklistStore.isBlocked(this@JournalActivity, row.phone))
                        BlacklistStore.remove(this@JournalActivity, row.phone)
                    else
                        BlacklistStore.add(this@JournalActivity, row.phone, "журнал")
                    load()
                }
            })
            list.addView(line)
            list.addView(View(this).apply {
                setBackgroundColor(0x22FFFFFF)
                layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 1)
            })
        }
    }
}
