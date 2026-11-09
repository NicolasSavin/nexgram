package ru.nexgram.app.nativeui

import android.app.Activity
import android.content.Context
import androidx.appcompat.app.AlertDialog
import ru.nexgram.app.SmsHelper

object SmsConfirm {
    fun sendWithPreview(
        activity: Activity,
        phone: String,
        text: String,
        simSlot: Int = -1,
        onResult: ((String) -> Unit)? = null
    ) {
        val body = text.trim()
        val to = phone.trim()
        if (to.length < 5 || body.isEmpty()) {
            onResult?.invoke("bad")
            return
        }
        val msg = "Кому: $to\n\n$body"
        AlertDialog.Builder(activity)
            .setTitle("Отправить SMS?")
            .setMessage(msg)
            .setNegativeButton("Отмена") { d, _ ->
                d.dismiss()
                onResult?.invoke("cancel")
            }
            .setPositiveButton("Отправить") { d, _ ->
                d.dismiss()
                val r = SmsHelper.send(activity, to, body, simSlot)
                onResult?.invoke(r)
            }
            .show()
    }

    fun sendSilent(ctx: Context, phone: String, text: String, simSlot: Int = -1): String {
        return SmsHelper.send(ctx, phone, text, simSlot)
    }
}
