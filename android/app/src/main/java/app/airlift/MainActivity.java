package app.airlift;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;

/**
 * Coquille Android d'AirLift : l'interface est servie depuis GitHub Pages et mise en cache
 * (service worker) → chaque nouvelle version web est installée automatiquement au lancement.
 * L'APK lui-même vérifie android.json et propose sa mise à jour.
 */
public class MainActivity extends Activity {
    private static final int FILE_REQ = 42;
    private WebView web;
    private ValueCallback<Uri[]> fileCallback;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        web.setBackgroundColor(0xFF0B1220);
        setContentView(web);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setTextZoom(100);
        web.addJavascriptInterface(new Bridge(), "AirLiftNative");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (u.toString().startsWith(BuildConfig.WEB_URL)) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) { }
                return true;
            }

            @Override
            public void onReceivedError(WebView v, WebResourceRequest req, WebResourceError err) {
                if (req.isForMainFrame()) {
                    v.loadDataWithBaseURL(null, "<html><body style='background:#0b1220;color:#eef3fb;font-family:sans-serif;padding:40px;text-align:center'>"
                            + "<h2>AirLift</h2><p>Connexion nécessaire pour le tout premier lancement.<br>Ensuite l'application fonctionne hors ligne.</p>"
                            + "<button style='padding:12px 20px;border-radius:12px;border:0;background:#4fd1c5;font-weight:700' onclick=\"location.href='" + BuildConfig.WEB_URL + "'\">Réessayer</button></body></html>",
                            "text/html", "utf-8", null);
                }
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                fileCallback = cb;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                try { startActivityForResult(i, FILE_REQ); } catch (Exception e) { fileCallback = null; return false; }
                return true;
            }
        });
        if (state != null) web.restoreState(state); else web.loadUrl(BuildConfig.WEB_URL);
        checkApkUpdate(false);
    }

    @Override
    protected void onSaveInstanceState(Bundle out) { super.onSaveInstanceState(out); web.saveState(out); }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        if (req == FILE_REQ && fileCallback != null) {
            Uri[] r = (res == RESULT_OK && data != null && data.getData() != null) ? new Uri[]{data.getData()} : null;
            fileCallback.onReceiveValue(r);
            fileCallback = null;
        }
        super.onActivityResult(req, res, data);
    }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript("window.airliftBack ? window.airliftBack() : false", v -> {
            if (!"true".equals(v)) {
                if (web.canGoBack()) web.goBack(); else finish();
            }
        });
    }

    // ------------------------------------------------------------------ pont JS
    private File backupFile() { return new File(getFilesDir(), "airlift-backup.json"); }

    private class Bridge {
        @JavascriptInterface
        public String getSeed() {
            try (InputStream in = getAssets().open("seed.json")) { return readAll(in); } catch (Exception e) { return null; }
        }

        @JavascriptInterface
        public void saveBackup(String json) {
            try {
                File tmp = new File(getFilesDir(), "airlift-backup.tmp");
                try (OutputStream o = new FileOutputStream(tmp)) { o.write(json.getBytes(StandardCharsets.UTF_8)); }
                File dst = backupFile();
                if (dst.exists()) {
                    File prev = new File(getFilesDir(), "airlift-backup.prev.json");
                    prev.delete();
                    dst.renameTo(prev);
                }
                tmp.renameTo(dst);
            } catch (Exception ignored) { }
        }

        @JavascriptInterface
        public String loadBackup() {
            try { return new String(Files.readAllBytes(backupFile().toPath()), StandardCharsets.UTF_8); } catch (Exception e) { return null; }
        }

        @JavascriptInterface
        public boolean exportFile(String name, String content) {
            try {
                byte[] b = content.getBytes(StandardCharsets.UTF_8);
                if (Build.VERSION.SDK_INT >= 29) {
                    ContentValues cv = new ContentValues();
                    cv.put(MediaStore.Downloads.DISPLAY_NAME, name);
                    cv.put(MediaStore.Downloads.MIME_TYPE, "application/json");
                    cv.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/AirLift");
                    Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                    try (OutputStream o = getContentResolver().openOutputStream(uri)) { o.write(b); }
                } else {
                    File dir = new File(getExternalFilesDir(null), "sauvegardes");
                    dir.mkdirs();
                    try (OutputStream o = new FileOutputStream(new File(dir, name))) { o.write(b); }
                }
                return true;
            } catch (Exception e) { return false; }
        }

        @JavascriptInterface
        public String appVersion() { return BuildConfig.VERSION_NAME; }

        @JavascriptInterface
        public void checkApkUpdate() { MainActivity.this.checkApkUpdate(true); }
    }

    private static String readAll(InputStream in) throws Exception {
        ByteArrayOutputStream bo = new ByteArrayOutputStream();
        byte[] buf = new byte[16384];
        int n;
        while ((n = in.read(buf)) > 0) bo.write(buf, 0, n);
        return bo.toString("UTF-8");
    }

    // ------------------------------------------------------------------ mise à jour de l'APK
    private void checkApkUpdate(boolean manual) {
        new Thread(() -> {
            try {
                HttpURLConnection c = (HttpURLConnection) new URL(BuildConfig.WEB_URL + "android.json?t=" + System.currentTimeMillis()).openConnection();
                c.setConnectTimeout(8000);
                c.setReadTimeout(8000);
                JSONObject j = new JSONObject(readAll(c.getInputStream()));
                int code = j.getInt("versionCode");
                String name = j.optString("versionName", "");
                String apk = j.getString("apk");
                if (code > BuildConfig.VERSION_CODE) {
                    runOnUiThread(() -> new AlertDialog.Builder(this)
                            .setTitle("Mise à jour AirLift " + name)
                            .setMessage(j.optString("notes", "Une nouvelle version de l'application est disponible."))
                            .setPositiveButton("Installer", (d, w) -> downloadAndInstall(apk))
                            .setNegativeButton("Plus tard", null).show());
                } else if (manual) {
                    runOnUiThread(() -> Toast.makeText(this, "Application Android à jour (" + BuildConfig.VERSION_NAME + ")", Toast.LENGTH_SHORT).show());
                }
            } catch (Exception e) {
                if (manual) runOnUiThread(() -> Toast.makeText(this, "Vérification impossible (hors ligne ?)", Toast.LENGTH_SHORT).show());
            }
        }).start();
    }

    private void downloadAndInstall(String apkUrl) {
        if (Build.VERSION.SDK_INT >= 26 && !getPackageManager().canRequestPackageInstalls()) {
            Toast.makeText(this, "Autorise AirLift à installer des mises à jour, puis relance la mise à jour.", Toast.LENGTH_LONG).show();
            startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getPackageName())));
            return;
        }
        Toast.makeText(this, "Téléchargement de la mise à jour…", Toast.LENGTH_SHORT).show();
        new Thread(() -> {
            try {
                File dir = new File(getExternalFilesDir(null), "updates");
                dir.mkdirs();
                File f = new File(dir, "airlift-update.apk");
                HttpURLConnection c = (HttpURLConnection) new URL(apkUrl).openConnection();
                c.setInstanceFollowRedirects(true);
                try (InputStream in = c.getInputStream(); OutputStream o = new FileOutputStream(f)) {
                    byte[] buf = new byte[65536];
                    int n;
                    while ((n = in.read(buf)) > 0) o.write(buf, 0, n);
                }
                Uri uri = androidx.core.content.FileProvider.getUriForFile(this, "app.airlift.files", f);
                Intent i = new Intent(Intent.ACTION_VIEW);
                i.setDataAndType(uri, "application/vnd.android.package-archive");
                i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                runOnUiThread(() -> startActivity(i));
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(this, "Échec du téléchargement : " + e.getMessage(), Toast.LENGTH_LONG).show());
            }
        }).start();
    }
}
