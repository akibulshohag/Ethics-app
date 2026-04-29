# =======================================================
#  React Native App Proguard Rules
# =======================================================

# -------------------------------------------------------
#  React Native Core & JNI
# -------------------------------------------------------
-keep class com.facebook.react.** { *; }
-keep class com.facebook.yoga.** { *; }
-keep class * extends com.facebook.react.bridge.JavaScriptModule { *; }
-keep class * extends com.facebook.react.bridge.NativeModule { *; }
-keepclassmembers class * extends com.facebook.react.bridge.NativeModule {
    @com.facebook.react.bridge.ReactMethod *;
}
-keep class * extends com.facebook.react.uimanager.ViewManager { *; }
-keepclassmembers class * extends com.facebook.react.uimanager.ViewManager {
    @com.facebook.react.uimanager.annotations.ReactProp *;
    @com.facebook.react.uimanager.annotations.ReactPropGroup *;
}
-dontwarn com.facebook.react.**

# -------------------------------------------------------
#  Fresco (Image Loading)
# -------------------------------------------------------
-keep class com.facebook.imagepipeline.** { *; }
-keep class com.facebook.fresco.** { *; }
-dontwarn com.facebook.fresco.**

# -------------------------------------------------------
#  OkHttp (Network requests)
# -------------------------------------------------------
-keepattributes Signature
-keepattributes *Annotation*
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**

# -------------------------------------------------------
#  Specific Libraries from package.json
# -------------------------------------------------------

# react-native-html-to-pdf / pdfbox (Fixes the missing class error)
-dontwarn com.gemalto.jp2.**
-dontwarn com.tom_roush.pdfbox.**
-dontwarn org.apache.fontbox.**
-keep class com.tom_roush.pdfbox.** { *; }

# react-native-vision-camera
-keep class com.mrousavy.camera.** { *; }
-dontwarn com.mrousavy.camera.**

# react-native-vector-icons
-keep class com.oblador.vectoricons.** { *; }

# react-native-maps
-keep class com.airbnb.android.react.maps.** { *; }
-dontwarn com.airbnb.android.react.maps.**

# react-native-video
-keep class com.brentvatne.react.** { *; }
-dontwarn com.brentvatne.react.**

# react-native-image-crop-picker / image-picker
-keep class com.reactnative.ivpusic.imagepicker.** { *; }
-dontwarn com.reactnative.ivpusic.imagepicker.**

# react-native-blob-util
-keep class com.ReactNativeBlobUtil.** { *; }

# -------------------------------------------------------
#  General Optimizations
# -------------------------------------------------------
# Remove logs in release to reduce size and improve security
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int i(...);
    public static int w(...);
    public static int d(...);
}

# Preserve line numbers for crash reporting (like Crashlytics/Sentry)
-keepattributes SourceFile,LineNumberTable
