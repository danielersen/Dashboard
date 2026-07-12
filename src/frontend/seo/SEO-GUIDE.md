# SEO Guide - Daniel Ersen Dashboard

## SEO Files Structure

### Files at `/frontend/` root (to be served)
- `sitemap.xml` - Optimized sitemap with clean URLs
- `robots.txt` - Directives for indexing robots

### Files in `/frontend/seo/` folder (configuration and templates)
- `manifest.json` - Web App Manifest for PWA
- `browserconfig.xml` - Configuration for Microsoft Edge/IE
- `seo-config.json` - Centralized SEO configuration
- `seo-head-template.html` - HTML template with all SEO meta tags
- `SEO-GUIDE.md` - This guide

## Icons and Assets

The project already uses the following logos in `/assets/logo/`:
- `square.png` - Square logo (512x512) - Used for favicon, PWA, and icons
- `main.png` - Rectangular logo - Used for Open Graph and social sharing

These logos are already referenced in the SEO configuration files.

## Google Search Console

### Property to add
1. Add `https://dashboard.danielersen.fr.eu.org/` as a property
2. Verify the property (via DNS or HTML file)

### Sitemap to submit
```
https://dashboard.danielersen.fr.eu.org/sitemap.xml
```

### Verification code
Add the Google verification code in `seo-config.json`:
```json
"verification": {
  "google": "your-google-code-here",
  "bing": "your-bing-code-here"
}
```

## Integration in pages

Add SEO meta tags in the `<head>` of each page based on `seo/seo-head-template.html`.

## Code references

In your HTML files, reference the files as follows:
- Sitemap: `/sitemap.xml`
- Robots: `/robots.txt`
- Manifest: `/seo/manifest.json`
- BrowserConfig: `/seo/browserconfig.xml`

## Recommended URL structure

- Home: `https://dashboard.danielersen.fr.eu.org/`
- Workspace: `https://dashboard.danielersen.fr.eu.org/workspace`
- AI: `https://dashboard.danielersen.fr.eu.org/ai`
- Websites: `https://dashboard.danielersen.fr.eu.org/websites`
- Files: `https://dashboard.danielersen.fr.eu.org/files`
- Tools: `https://dashboard.danielersen.fr.eu.org/tools`
- Settings: `https://dashboard.danielersen.fr.eu.org/settings`

## Checklist

- [ ] Deploy sitemap.xml and robots.txt files
- [ ] Integrate meta tags in all pages (based on seo-head-template.html)
- [ ] Submit sitemap in Google Search Console
- [ ] Verify property in Search Console
- [ ] Test meta tags with [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [ ] Test with [Twitter Card Validator](https://cards-dev.twitter.com/validator)
