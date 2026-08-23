package com.aistudio.myquro.pkfxt

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.Build
import androidx.core.app.NotificationCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class SoundModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private var toneGenerator: ToneGenerator? = null
    private val CHANNEL_ID = "myquro_merchant_channel"

    init {
        try {
            toneGenerator = ToneGenerator(AudioManager.STREAM_NOTIFICATION, 100)
            createNotificationChannel()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    override fun getName(): String {
        return "SoundModule"
    }

    @ReactMethod
    fun playNotificationSound() {
        try {
            toneGenerator?.startTone(ToneGenerator.TONE_PROP_ACK, 250)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "MyQuro Alerts"
            val descriptionText = "Notifications for new orders and reservations"
            val importance = NotificationManager.IMPORTANCE_HIGH
            val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
                description = descriptionText
                enableLights(true)
                enableVibration(true)
            }
            val notificationManager = reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    @ReactMethod
    fun showLocalNotification(title: String, message: String) {
        try {
            // Play sound locally too
            playNotificationSound()

            // Open main activity when notification clicked
            val intent = reactContext.packageManager.getLaunchIntentForPackage(reactContext.packageName)?.apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            }
            
            val pendingIntent: PendingIntent = PendingIntent.getActivity(
                reactContext, 
                0, 
                intent, 
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            // Get a default app icon or a fallback system notification icon
            val smallIconResId = reactContext.resources.getIdentifier(
                "ic_notification", "mipmap", reactContext.packageName
            ).let {
                if (it == 0) {
                    reactContext.resources.getIdentifier(
                        "ic_launcher", "mipmap", reactContext.packageName
                    ).let { launcherId ->
                        if (launcherId == 0) android.R.drawable.ic_dialog_info else launcherId
                    }
                } else it
            }

            val builder = NotificationCompat.Builder(reactContext, CHANNEL_ID)
                .setSmallIcon(smallIconResId)
                .setContentTitle(title)
                .setContentText(message)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setContentIntent(pendingIntent)
                .setAutoCancel(true)

            val notificationManager = reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.notify(System.currentTimeMillis().toInt(), builder.build())
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
