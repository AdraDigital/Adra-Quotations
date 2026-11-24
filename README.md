# ADRA Quotation System

Sistema de cotizaciones de **ADRA Digital** en HTML5, CSS3 y JavaScript vanilla.

Funciona directamente en el navegador (GitHub Pages / Cloudflare Pages). Los datos se guardan en `localStorage`.

## Estructura

```
adra-quotation-system/
├── index.html
├── css/styles.css
├── js/
│   ├── app.js
│   ├── navigation.js
│   ├── quotations.js
│   ├── calculations.js
│   ├── catalog.js
│   ├── storage.js
│   ├── pdf.js
│   └── settings.js
└── assets/
    ├── logo/
    ├── favicon/
    └── icons/
```

## Favicon

Reemplaza los archivos en `assets/favicon/` (`favicon.svg`, `favicon.ico`) sin modificar JavaScript.

También puedes ajustar las rutas desde **Configuración**.

## Uso local

Abre `index.html` en el navegador o sirve la carpeta:

```bash
python3 -m http.server 8080
```

## Catálogo

SEGNO, LEGAME y STABILE se incluyen sin precios. El precio se introduce manualmente en cada cotización.

## PDF

La exportación usa jsPDF desde CDN (sin npm ni build).
