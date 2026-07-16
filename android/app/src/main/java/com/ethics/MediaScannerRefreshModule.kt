package com.eatix.app

import android.graphics.Bitmap
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.util.Size
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import java.io.File
import java.io.FileOutputStream
import kotlin.concurrent.thread

/**
 * Triggers Android's MediaScanner to index new videos so they appear in the gallery picker.
 * Scans public directories (DCIM, Movies, Download) where new videos typically appear.
 */
class MediaScannerRefreshModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "MediaScannerRefresh"

  @ReactMethod
  fun refreshVideoDirectories(promise: Promise) {
    try {
      thread {
        try {
          val pathsToScan = mutableListOf<String>()
          val context = reactApplicationContext

          // Public directories where new videos usually appear (camera, downloads, etc.)
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            @Suppress("DEPRECATION")
            val dirs = listOf(
              Environment.DIRECTORY_DCIM,
              Environment.DIRECTORY_MOVIES,
              Environment.DIRECTORY_DOWNLOADS,
            )
            for (dirName in dirs) {
              @Suppress("DEPRECATION")
              val dir = Environment.getExternalStoragePublicDirectory(dirName)
              if (dir.exists()) {
                // Scan the directory path itself (some devices refresh from this)
                pathsToScan.add(dir.absolutePath)
                try {
                  // Add recent files so new downloads/camera videos get indexed (may be restricted on Android 10+)
                  collectRecentFilePaths(dir, pathsToScan, maxFiles = 30)
                } catch (_: Exception) { /* ignore: scoped storage may block listing */ }
              }
            }
          }

          if (pathsToScan.isEmpty()) {
            promise.resolve(null)
            return@thread
          }

          MediaScannerConnection.scanFile(
            context,
            pathsToScan.toTypedArray(),
            null,
            null
          )
          promise.resolve(null)
        } catch (e: Exception) {
          promise.reject("MEDIA_SCAN_ERROR", e)
        }
      }
    } catch (e: Exception) {
      promise.reject("MEDIA_SCAN_ERROR", e)
    }
  }

  /**
   * Returns device videos from MediaStore sorted by date added (newest first).
   * Use this for an in-app gallery so latest videos always show without depending on system picker.
   */
  @ReactMethod
  fun getVideoList(limit: Int, promise: Promise) {
    if (limit <= 0) {
      promise.resolve(Arguments.createArray())
      return
    }
    thread {
      try {
        val context = reactApplicationContext
        val projection = arrayOf(
          MediaStore.Video.Media._ID,
          MediaStore.Video.Media.DISPLAY_NAME,
          MediaStore.Video.Media.DATE_ADDED,
          MediaStore.Video.Media.DURATION,
          MediaStore.Video.Media.MIME_TYPE,
        )
        val sortOrder = "${MediaStore.Video.Media.DATE_ADDED} DESC"
        val list: WritableArray = Arguments.createArray()
        context.contentResolver.query(
          MediaStore.Video.Media.EXTERNAL_CONTENT_URI,
          projection,
          null,
          null,
          sortOrder,
        )?.use { cursor ->
          val idIdx = cursor.getColumnIndex(MediaStore.Video.Media._ID)
          val nameIdx = cursor.getColumnIndex(MediaStore.Video.Media.DISPLAY_NAME)
          val dateIdx = cursor.getColumnIndex(MediaStore.Video.Media.DATE_ADDED)
          val durationIdx = cursor.getColumnIndex(MediaStore.Video.Media.DURATION)
          val mimeIdx = cursor.getColumnIndex(MediaStore.Video.Media.MIME_TYPE)
          var count = 0
          while (cursor.moveToNext() && count < limit) {
            val id = cursor.getLong(idIdx)
            val contentUri = Uri.withAppendedPath(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, id.toString())
            val item: WritableMap = Arguments.createMap()
            item.putString("uri", contentUri.toString())
            item.putString("fileName", if (nameIdx >= 0) cursor.getString(nameIdx) ?: "video_$id.mp4" else "video_$id.mp4")
            item.putDouble("dateAdded", if (dateIdx >= 0) cursor.getLong(dateIdx).toDouble() else 0.0)
            item.putDouble("duration", if (durationIdx >= 0) (cursor.getLong(durationIdx) / 1000.0) else 0.0)
            item.putString("type", if (mimeIdx >= 0) cursor.getString(mimeIdx) ?: "video/mp4" else "video/mp4")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
              try {
                val thumb = context.contentResolver.loadThumbnail(contentUri, Size(256, 256), null)
                val cacheFile = File(context.cacheDir, "vid_thumb_$id.jpg")
                FileOutputStream(cacheFile).use { out -> thumb.compress(Bitmap.CompressFormat.JPEG, 85, out) }
                item.putString("thumbnailUri", Uri.fromFile(cacheFile).toString())
              } catch (_: Exception) { /* skip thumbnail */ }
            }
            list.pushMap(item)
            count++
          }
        }
        promise.resolve(list)
      } catch (e: Exception) {
        promise.reject("GET_VIDEO_LIST_ERROR", e)
      }
    }
  }

  /** Collect file paths from directory (and one level of subdirs), preferring recent by lastModified. */
  private fun collectRecentFilePaths(dir: File, out: MutableList<String>, maxFiles: Int) {
    if (out.size >= maxFiles) return
    val all = mutableListOf<File>()
    dir.listFiles()?.forEach { f ->
      if (f.isFile) all.add(f)
      else if (f.isDirectory && out.size < maxFiles) {
        f.listFiles()?.filter { it.isFile }?.let { all.addAll(it) }
      }
    }
    all.sortByDescending { it.lastModified() }
    all.take(maxFiles - out.size).mapTo(out) { it.absolutePath }
  }
}
