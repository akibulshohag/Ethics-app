package com.eatix.app

import android.app.Application
import com.facebook.FacebookSdk
import com.facebook.appevents.AppEventsLogger
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          add(MediaScannerRefreshPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    // Avoid startup crash when Facebook client token is not configured yet.
    val appId = getString(R.string.facebook_app_id).trim()
    val clientToken = getString(R.string.facebook_client_token).trim()
    if (appId.isNotEmpty() && clientToken.isNotEmpty()) {
      FacebookSdk.setApplicationId(appId)
      FacebookSdk.setClientToken(clientToken)
      FacebookSdk.fullyInitialize()
      AppEventsLogger.activateApp(this)
    }
    SigningKeyHashUtil.logSigningFingerprints(packageName, packageManager)
    loadReactNative(this)
  }
}
