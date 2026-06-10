package expo.modules.screenstate

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Emits a "screenOff" event when the display turns off (ACTION_SCREEN_OFF).
 * Used by the app lock's "lock when the phone locks" mode - there is no
 * JS-side API for this, and the broadcast can only be received by a
 * dynamically registered receiver (process lifetime, which matches the
 * lock's needs exactly).
 */
class ScreenStateModule : Module() {
  private var receiver: BroadcastReceiver? = null

  override fun definition() = ModuleDefinition {
    Name("ScreenState")

    Events("screenOff")

    OnCreate {
      val filter = IntentFilter(Intent.ACTION_SCREEN_OFF)
      receiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
          try {
            sendEvent("screenOff", mapOf<String, Any>())
          } catch (_: Throwable) {
            // JS runtime not ready / shutting down - nothing to do
          }
        }
      }
      appContext.reactContext?.registerReceiver(receiver, filter)
    }

    OnDestroy {
      receiver?.let {
        try {
          appContext.reactContext?.unregisterReceiver(it)
        } catch (_: Throwable) {
          // already unregistered
        }
      }
      receiver = null
    }
  }
}
