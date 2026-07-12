# Guide SEO - Daniel Arsen Dashboard

## Structure des fichiers SEO

### Fichiers à la racine de `/frontend/` (à servir)
- `sitemap.xml` - Sitemap optimisé avec les URLs propres
- `robots.txt` - Directives pour les robots d'indexation

### Fichiers dans le dossier `/frontend/seo/` (configuration et templates)
- `manifest.json` - Manifest Web App pour PWA
- `browserconfig.xml` - Configuration pour Microsoft Edge/IE
- `seo-config.json` - Configuration centralisée SEO
- `seo-head-template.html` - Template HTML avec tous les meta tags SEO
- `SEO-GUIDE.md` - Ce guide

## Icônes et Favicons à générer

Vous devez créer les fichiers d'icônes suivants dans `/assets/logo/` ou `/public/` :

```
favicon-16x16.png (16x16)
favicon-32x32.png (32x32)
apple-touch-icon.png (180x180)
icon-70.png (70x70)
icon-150.png (150x150)
icon-192.png (192x192)
icon-310.png (310x310)
icon-512.png (512x512)
safari-pinned-tab.svg (SVG)
og-image.png (1200x630 pour partage social)
```

### Génération d'icônes
Utilisez un outil comme [favicon.io](https://favicon.io/) ou [RealFaviconGenerator](https://realfavicongenerator.net/) pour générer tous les formats à partir d'une image source.

## Google Search Console

### Propriété à ajouter
1. Ajoutez `https://dashboard.danielersen.fr.eu.org/` comme propriété
2. Vérifiez la propriété (via DNS ou fichier HTML)

### Sitemap à soumettre
```
https://dashboard.danielersen.fr.eu.org/sitemap.xml
```

### Code de vérification
Ajoutez le code de verification Google dans `seo-config.json` :
```json
"verification": {
  "google": "votre-code-google-here",
  "bing": "votre-code-bing-here"
}
```

## Intégration dans les pages

Ajoutez les meta tags SEO dans le `<head>` de chaque page en vous basant sur `seo/seo-head-template.html`.

## Références dans le code

Dans vos fichiers HTML, référez les fichiers comme suit :
- Sitemap : `/sitemap.xml`
- Robots : `/robots.txt`
- Manifest : `/seo/manifest.json`
- BrowserConfig : `/seo/browserconfig.xml`

## Structure d'URLs recommandée

- Accueil : `https://dashboard.danielersen.fr.eu.org/`
- Workspace : `https://dashboard.danielersen.fr.eu.org/workspace`
- AI : `https://dashboard.danielersen.fr.eu.org/ai`
- Files : `https://dashboard.danielersen.fr.eu.org/files`
- Tools : `https://dashboard.danielersen.fr.eu.org/tools`
- Settings : `https://dashboard.danielersen.fr.eu.org/settings`

## Points à vérifier

- [ ] Déployer les fichiers sitemap.xml et robots.txt
- [ ] Générer et ajouter les icônes/favicons
- [ ] Intégrer les meta tags dans toutes les pages
- [ ] Soumettre le sitemap dans Google Search Console
- [ ] Vérifier la propriété dans Search Console
- [ ] Tester les meta tags avec [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [ ] Tester avec [Twitter Card Validator](https://cards-dev.twitter.com/validator)
