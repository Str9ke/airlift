# Première mise en ligne d'AirLift (à lancer une seule fois, depuis le dossier "Training app") :
#   powershell -ExecutionPolicy Bypass -File scripts\premiere_publication.ps1
# Crée le dépôt public Str9ke/airlift (code uniquement, AUCUNE donnée perso — voir .gitignore),
# active GitHub Pages sur /docs (source des mises à jour automatiques) et publie l'APK public.
gh repo create airlift --public --source . --push --description "AirLift - carnet de muscu & board-off"
gh api -X POST repos/Str9ke/airlift/pages -f "source[branch]=main" -f "source[path]=/docs"
gh release create v1.1.0 dist/airlift.apk --title "AirLift 1.1.0" --notes "Premiere version publique"
# Depot PRIVE pour la sauvegarde en ligne de tes donnees (lisible uniquement par toi)
gh repo create airlift-data --private --add-readme --description "AirLift - sauvegarde privee"
Write-Host "OK. L'app sera en ligne sur https://str9ke.github.io/airlift/ d'ici 1-2 minutes."
Write-Host "Installe ensuite dist\AirLift-1.1.0-perso.apk sur ton telephone (il contient ton historique)."
Write-Host "Cree ensuite la cle d'acces : https://github.com/settings/personal-access-tokens/new (depot airlift-data, Contents: Read and write) et colle-la dans AirLift > Reglages > Sauvegarde en ligne."
