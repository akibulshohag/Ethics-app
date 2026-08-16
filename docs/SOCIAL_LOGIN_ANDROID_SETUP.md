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
| Firebase project | `eatix-17d2a` (number `236298500212`) |
| Facebook Login App ID | `1020637567080925` |
| Google Web Client ID (`config.js` → `googleClientId`) | `236298500212-810ubvv2taqs55m35pgvg0h795so6u68.apps.googleusercontent.com` |
| Google Android Client ID (Console only — **never** in `googleClientId`) | created per SHA-1 in Firebase |

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

**Release keystore** (`eatwaze-upload.keystore` — signed APK / AAB upload key):

| Type | Value |
|------|--------|
| SHA-1 | `B8:C2:D3:45:EF:A9:E4:10:86:6E:E5:BD:46:D2:C9:59:5F:F0:3F:82` |
| Facebook key hash | `uMLTRe+p5BCGbuW9RtLJWV/wP4I=` |

Add **both** debug and release hashes in Meta. Add **both** SHA-1 values in **Firebase eatix-17d2a** (not an old Google Cloud project). Play Store installs also need the **App signing key** SHA-1 from Play Console.

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

1. Open [Firebase project eatix-17d2a](https://console.firebase.google.com/project/eatix-17d2a/settings/general) → Android app `com.eatix.app` → **Add fingerprint**
2. Paste these SHA-1 values (one at a time):
   - **Debug** (`npm run android`): `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
   - **Release / upload key** (`eatwaze-upload.keystore`): `B8:C2:D3:45:EF:A9:E4:10:86:6E:E5:BD:46:D2:C9:59:5F:F0:3F:82`
   - **Play Store app signing key** from Play Console → App integrity → App signing → **App signing key certificate** SHA-1
3. Confirm **Web application** client exists — Client ID must match `googleClientId` (ends with `...810ubvv2...`). **Never** put an Android client ID in `config.js`.
4. Re-download **`google-services.json`** → replace `Ethics-app/android/app/google-services.json` → rebuild for Play. After adding SHA-1, an already-installed APK often starts working in 5–10 minutes without a rebuild.
5. **OAuth consent screen** → if status is **Testing**, add your Gmail under **Test users**.
6. **Verify the APK on the phone** matches release SHA-1:

```bash
chmod +x Ethics-app/scripts/verify-apk-sha1.sh
./Ethics-app/scripts/verify-apk-sha1.sh path/to/your-release.apk
```

If the printed SHA-1 is **not** `B8:C2:D3:...`, you registered the wrong key (e.g. APK signed with debug keystore, or **Google Play re-signed** the app — use Play Console → App integrity → **App signing key** SHA-1 instead). That Play signing SHA-1 must also be added in Firebase eatix-17d2a.

---

## Step 5 — Release signing in `gradle.properties`

For Play Store / production APKs, set real passwords (do not commit secrets to git):

```properties
MYAPP_UPLOAD_STORE_FILE=eatwaze-upload.keystore
MYAPP_UPLOAD_KEY_ALIAS=eatwaze-upload
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
