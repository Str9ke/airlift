# AirLift

Carnet de musculation orienté kitesurf / board-off : programme réordonnable par glisser-déposer, double progression avec incréments réels (barre, 1 ou 2 haltères), 1RM estimé, points adaptatifs, mesures corporelles et pauses.

- `docs/` : application web (GitHub Pages, hors ligne via service worker, mise à jour automatique).
- `android/` : coquille Android (WebView) qui charge l'app et propose les nouveaux APK.
- `scripts/release.py` : publier une version (`python scripts/release.py 1.1.0 "notes" [--apk]`).

Aucune donnée personnelle n'est versionnée : l'historique est importé localement sur le téléphone.
