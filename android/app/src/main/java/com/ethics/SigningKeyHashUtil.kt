package com.eatix.app

import android.content.pm.PackageManager
import android.util.Base64
import android.util.Log
import java.security.MessageDigest

/**
 * Logs the APK signing certificate hash Meta calls "Key hash" and SHA-1 for Google Cloud.
 * After installing a release APK, run: adb logcat -s EatixSigningKeys
 */
object SigningKeyHashUtil {
  private const val TAG = "EatixSigningKeys"

  fun logSigningFingerprints(packageName: String, packageManager: PackageManager) {
    try {
      val pkg =
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
          packageManager.getPackageInfo(
            packageName,
            PackageManager.GET_SIGNING_CERTIFICATES,
          )
        } else {
          @Suppress("DEPRECATION")
          packageManager.getPackageInfo(packageName, PackageManager.GET_SIGNATURES)
        }

      val signatures =
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
          pkg.signingInfo?.apkContentsSigners?.toList().orEmpty()
        } else {
          @Suppress("DEPRECATION")
          pkg.signatures?.toList().orEmpty()
        }

      if (signatures.isEmpty()) {
        Log.e(TAG, "No signing certificates found for $packageName")
        return
      }

      signatures.forEachIndexed { index, signature ->
        val certBytes = signature.toByteArray()

        val sha1 = MessageDigest.getInstance("SHA-1").digest(certBytes)
        val sha1Hex =
          sha1.joinToString(":") { b -> "%02X".format(b.toInt() and 0xff) }

        val fbHash =
          Base64.encodeToString(
            MessageDigest.getInstance("SHA-1").digest(certBytes),
            Base64.NO_WRAP,
          )

        Log.e(TAG, "Certificate #${index + 1} for installed APK:")
        Log.e(TAG, "  Facebook Key hash (paste in Meta Developer Console): $fbHash")
        Log.e(TAG, "  Google SHA-1 (Firebase / Google Cloud Android OAuth): $sha1Hex")
        Log.e(TAG, "  Package name: $packageName")
      }
    } catch (e: Exception) {
      Log.e(TAG, "Could not read signing fingerprints", e)
    }
  }
}
