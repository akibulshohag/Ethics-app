# Facebook & Google login on Android (APK / release)

Errors on a **physical phone with a built APK** almost always mean the **signing certificate** of that APK is not registered in Meta / Google.

| Error | Cause |
|--------|--------|
| `This app has no Android key hashes configured` | Facebook key hash missing in Meta |
| `DEVELOPER_ERROR` (Google) | SHA-1 of the APK signer missing in Google Cloud / Firebase |

## App identifiers (already in the project)

| Setting | Value |
|---------|--------|
| Package name | `com.eatix.app` |
| Facebook App ID | `1714809253015158` |
| Google Web Client ID (`config.js` → `googleClientId`) | `366684605140-q98fauu8rmqjkdhs0turqgljtpsccve3.apps.googleusercontent.com` |
| Google Android Client ID (Console only — **never** in `googleClientId`) | `366684605140-q4gvcqm95d4i4474gkcbluur1m8nhori.apps.googleusercontent.com` |

---

## Step 1 — Get key hashes from your machine

```bash
cd Ethics-app
chmod +x scripts/print-android-signing-keys.sh
./scripts/print-android-signing-keys.sh
```

**Debug keystore** (default when release upload password is empty in `gradle.properties`):

| Type | Value |
|------|--------|
| SHA-1 | `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` |
| Facebook key hash | `Xo8WBi6jzSxKDVR4drqm84yr9iU=` |

**Release keystore** (`my-upload-key.keystore` — signed APK on phone):

| Type | Value |
|------|--------|
| SHA-1 | `B8:C2:D3:45:EF:A9:E4:10:86:6E:E5:BD:46:D2:C9:59:5F:F0:3F:82` |
| Facebook key hash | `uMLTRe+p5BCGbuW9RtLJWV/wP4I=` |

Add **both** debug and release hashes in Meta. Add **both** SHA-1 values in Google Cloud (or the release SHA-1 if you only ship release APKs).

If you sign release APKs with `my-upload-key.keystore`, set passwords and run the script again — **you must add that hash too**.

---

## Step 2 — Get hash from the APK on the phone (recommended)

After installing the APK:

```bash
adb logcat -s EatixSigningKeys
```

Copy **Facebook Key hash** and **Google SHA-1** from the log and add them to the consoles below.

---

## Step 3 — Facebook (Meta Developer Console)

1. Open [Meta app 1714809253015158](https://developers.facebook.com/apps/1714809253015158/settings/basic/)
2. **Settings → Basic → Add platform → Android** (if missing)
3. **Google Play Package Name:** `com.eatix.app`
4. **Class Name:** `com.eatix.app.MainActivity` (optional)
5. **Key hashes:** add **all** hashes (debug + release + logcat from device), one per line, e.g.:
   - `Xo8WBi6jzSxKDVR4drqm84yr9iU=`
6. **Facebook Login → Settings:** enable Facebook Login
7. Save changes (can take a few minutes to propagate)

---

## Step 4 — Google Sign-In

1. Open [Google Cloud Credentials](https://console.cloud.google.com/apis/credentials?project=366684605140) (project number `366684605140`)
2. **Create credentials → OAuth client ID → Android**
   - Package name: `com.eatix.app`
   - Add **both** SHA-1 fingerprints on the same Android client (Edit client → add fingerprint):
     - **Debug** (`npm run android`): `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
     - **Release APK** (`my-upload-key.keystore`): `B8:C2:D3:45:EF:A9:E4:10:86:6E:E5:BD:46:D2:C9:59:5F:F0:3F:82`
   - **SHA-256 (release):** `16:65:B5:E8:40:6D:31:41:5B:A7:93:52:C6:72:8F:32:51:C0:4C:E7:5E:36:8E:59:F9:9B:E6:2A:DA:07:DE:38`
3. Confirm **Web application** client exists — Client ID must match `googleClientId` in `Ethics-app/config.js` (ends with `...q98fauu8...`). **Never** put the Android client ID in `config.js`.
4. **Firebase (recommended):** [Firebase Console](https://console.firebase.google.com) → same Google project → add Android app `com.eatix.app` → add both SHA-1 fingerprints → download **`google-services.json`** → replace `Ethics-app/android/app/google-services.json` → rebuild.
5. **OAuth consent screen** → if status is **Testing**, add your Gmail under **Test users**.
6. **Verify the APK on the phone** matches release SHA-1:

```bash
chmod +x Ethics-app/scripts/verify-apk-sha1.sh
./Ethics-app/scripts/verify-apk-sha1.sh path/to/your-release.apk
```

If the printed SHA-1 is **not** `B8:C2:D3:...`, you registered the wrong key (e.g. APK signed with debug keystore, or **Google Play re-signed** the app — use Play Console → App integrity → **App signing key** SHA-1 instead).

---

## Step 5 — Release signing in `gradle.properties`

For Play Store / production APKs, set real passwords (do not commit secrets to git):

```properties
MYAPP_UPLOAD_STORE_FILE=my-upload-key.keystore
MYAPP_UPLOAD_KEY_ALIAS=my-key-alias
MYAPP_UPLOAD_STORE_PASSWORD=your_store_password
MYAPP_UPLOAD_KEY_PASSWORD=your_key_password
```

Then run `./scripts/print-android-signing-keys.sh` with those passwords and register the **release** hashes in Meta + Google.

---

## Step 6 — Rebuild and test

```bash
cd Ethics-app/android
./gradlew clean assembleRelease
# install APK on device, then test Facebook + Google login
```

---

## Checklist

- [ ] Facebook Android platform added with package `com.eatix.app`
- [ ] All APK key hashes added (debug + release + device logcat)
- [ ] Google Android OAuth client with matching SHA-1
- [ ] `googleClientId` in `config.js` is the **Web** client ID (not Android client ID)
- [ ] Rebuilt APK after console changes (wait ~5 min for Meta/Google propagation)
