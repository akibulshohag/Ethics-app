package com.eatix.app

import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.bridge.WritableMap

/**
 * Android biometric prompts with explicit face vs fingerprint support.
 *
 * Important: BiometricManager.BIOMETRIC_WEAK succeeds for fingerprint alone.
 * Treating WEAK as "face available" makes Vivo/OPPO show face copy + fingerprint
 * sensor hints together (no Samsung-style Fingerprint|Face switcher).
 * We require FEATURE_FACE / FEATURE_FINGERPRINT for accurate availability.
 */
class EatixBiometricModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private val mainHandler = Handler(Looper.getMainLooper())

  override fun getName(): String = "EatixBiometric"

  @ReactMethod
  fun getCapabilities(promise: Promise) {
    try {
      val biometricManager = BiometricManager.from(reactContext)
      val pm = reactContext.packageManager
      val hasFingerprintHardware =
        pm.hasSystemFeature(PackageManager.FEATURE_FINGERPRINT)
      val hasFaceHardware =
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q &&
          pm.hasSystemFeature(PackageManager.FEATURE_FACE)

      val strongStatus =
        biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG)
      val weakStatus =
        biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK)

      // Fingerprint ≈ Class 3 (STRONG). Require fingerprint hardware.
      val fingerprintAvailable =
        hasFingerprintHardware && strongStatus == BiometricManager.BIOMETRIC_SUCCESS
      // Face unlock ≈ often WEAK. Require face hardware so FP-only phones
      // (e.g. Vivo side-sensor) are not mislabeled as face-capable.
      val faceAvailable =
        hasFaceHardware && weakStatus == BiometricManager.BIOMETRIC_SUCCESS
      val available = fingerprintAvailable || faceAvailable

      val map: WritableMap = Arguments.createMap()
      map.putBoolean("available", available)
      map.putBoolean("fingerprintAvailable", fingerprintAvailable)
      map.putBoolean("faceAvailable", faceAvailable)
      map.putBoolean("hasFingerprintHardware", hasFingerprintHardware)
      map.putBoolean("hasFaceHardware", hasFaceHardware)
      map.putString(
        "biometryType",
        when {
          faceAvailable && !fingerprintAvailable -> "Face"
          fingerprintAvailable -> "Biometrics"
          else -> "Biometrics"
        },
      )
      promise.resolve(map)
    } catch (e: Exception) {
      promise.reject("BIOMETRIC_CAP_ERROR", e)
    }
  }

  @ReactMethod
  fun simplePrompt(options: ReadableMap, promise: Promise) {
    val activity = reactApplicationContext.currentActivity as? FragmentActivity
    if (activity == null) {
      promise.reject("NO_ACTIVITY", "Activity not available")
      return
    }

    val promptMessage =
      (options.getString("promptMessage") ?: "Confirm your identity")
        .trim()
        .ifEmpty { "Confirm your identity" }
        .take(MAX_PROMPT_MESSAGE_LENGTH)
    val cancelButtonText = options.getString("cancelButtonText") ?: "Cancel"
    val method = options.getString("biometricMethod") ?: "any"
    val allowDeviceCredentials =
      if (options.hasKey("allowDeviceCredentials")) {
        options.getBoolean("allowDeviceCredentials")
      } else {
        false
      }

    val authenticators = resolveAuthenticators(method, allowDeviceCredentials)
    if (authenticators == 0) {
      promise.reject(
        "NOT_AVAILABLE",
        if (method == "face") {
          "Face unlock is not set up on this device"
        } else if (method == "fingerprint") {
          "Fingerprint is not set up on this device"
        } else {
          "Biometric authentication is not available"
        },
      )
      return
    }

    UiThreadUtil.runOnUiThread {
      try {
        val includesDeviceCredential =
          (authenticators and BiometricManager.Authenticators.DEVICE_CREDENTIAL) != 0

        // One subtitle only — never stack face description on fingerprint prompts
        // (Vivo OriginOS renders that as glowing / conflicting instructions).
        val subtitle =
          when (method) {
            "face" -> "Confirm with face unlock"
            "fingerprint" -> "Touch the fingerprint sensor to continue"
            else -> promptMessage
          }

        val builder =
          BiometricPrompt.PromptInfo.Builder()
            .setTitle(PROMPT_TITLE)
            .setSubtitle(subtitle)
            .setAllowedAuthenticators(authenticators)

        if (!includesDeviceCredential) {
          val negativeText = cancelButtonText.trim().ifEmpty { "Cancel" }
          builder.setNegativeButtonText(negativeText)
        }

        val executor = ContextCompat.getMainExecutor(activity)
        val biometricPrompt =
          BiometricPrompt(
            activity,
            executor,
            object : BiometricPrompt.AuthenticationCallback() {
              override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                val map: WritableMap = Arguments.createMap()
                map.putBoolean("success", true)
                promise.resolve(map)
              }

              override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                when (errorCode) {
                  BiometricPrompt.ERROR_USER_CANCELED,
                  BiometricPrompt.ERROR_NEGATIVE_BUTTON,
                  BiometricPrompt.ERROR_CANCELED,
                  -> {
                    val map: WritableMap = Arguments.createMap()
                    map.putBoolean("success", false)
                    map.putString("error", errString.toString())
                    promise.resolve(map)
                  }
                  else -> promise.reject("AUTH_ERROR", errString.toString())
                }
              }

              override fun onAuthenticationFailed() {
                // User can retry.
              }
            },
          )

        val promptInfo = builder.build()
        mainHandler.postDelayed(
          {
            try {
              if (activity.isFinishing || activity.isDestroyed) {
                promise.reject("NO_ACTIVITY", "Activity not available")
                return@postDelayed
              }
              biometricPrompt.authenticate(promptInfo)
            } catch (e: Exception) {
              promise.reject("PROMPT_ERROR", e)
            }
          },
          PROMPT_SHOW_DELAY_MS,
        )
      } catch (e: Exception) {
        promise.reject("PROMPT_ERROR", e)
      }
    }
  }

  private fun resolveAuthenticators(method: String, allowDeviceCredentials: Boolean): Int {
    val biometricManager = BiometricManager.from(reactContext)
    val pm = reactContext.packageManager
    val hasFingerprintHardware =
      pm.hasSystemFeature(PackageManager.FEATURE_FINGERPRINT)
    val hasFaceHardware =
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q &&
        pm.hasSystemFeature(PackageManager.FEATURE_FACE)

    when (method) {
      "face" -> {
        // System face unlock only (BIOMETRIC_WEAK). Real OS face match required.
        if (!hasFaceHardware) return 0
        val weakStatus =
          biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK)
        return if (weakStatus == BiometricManager.BIOMETRIC_SUCCESS) {
          BiometricManager.Authenticators.BIOMETRIC_WEAK
        } else {
          0
        }
      }
      "fingerprint" -> {
        if (!hasFingerprintHardware) return 0
        val strongStatus =
          biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG)
        return if (strongStatus == BiometricManager.BIOMETRIC_SUCCESS) {
          // STRONG only — never OR with WEAK (that brings face copy on Samsung
          // and conflicting hints on Vivo).
          BiometricManager.Authenticators.BIOMETRIC_STRONG
        } else {
          0
        }
      }
      else -> {
        // Prefer a single authenticator class when possible.
        val strongStatus =
          biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG)
        if (hasFingerprintHardware && strongStatus == BiometricManager.BIOMETRIC_SUCCESS) {
          var authenticators = BiometricManager.Authenticators.BIOMETRIC_STRONG
          if (allowDeviceCredentials && Build.VERSION.SDK_INT > Build.VERSION_CODES.Q) {
            authenticators =
              authenticators or BiometricManager.Authenticators.DEVICE_CREDENTIAL
          }
          return authenticators
        }
        val weakStatus =
          biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK)
        if (hasFaceHardware && weakStatus == BiometricManager.BIOMETRIC_SUCCESS) {
          return BiometricManager.Authenticators.BIOMETRIC_WEAK
        }
        return 0
      }
    }
  }

  private companion object {
    const val PROMPT_TITLE = "Eatwaze"
    const val MAX_PROMPT_MESSAGE_LENGTH = 60
    const val PROMPT_SHOW_DELAY_MS = 180L
  }
}
