/**
 * Generates well-known static files for indexing readiness:
 *   /humans.txt       — credits file (humansmanifesto.org)
 *   /security.txt     — security disclosure policy (RFC 9116 / securitytxt.org)
 *   /browserconfig.xml — IE/Edge tile configuration
 */

export function generateStaticFiles(config) {
  const { baseUrl, name } = config.site;
  const buildDate = new Date().toISOString().slice(0, 10);

  // humans.txt
  const humansTxt = {
    path: '/humans.txt',
    content: `/* TEAM */
Developer: ${name} Team
Contact: security[at]dropanyconvert[dot]com
Site: ${baseUrl}

/* THANKS */
Tools: Node.js, browser-native APIs, pdf-lib, PDF.js

/* SITE */
Last update: ${buildDate}
Language: English, Spanish, French, German, Portuguese
Doctype: HTML5
IDE: VS Code
Standards: HTML5, CSS3, ES2022
Components: Web Workers, File API, Canvas API
Software: ${name} Static Site Generator
`,
  };

  // security.txt (RFC 9116 — required fields: Contact, Expires)
  const expiresDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  const securityTxt = {
    path: '/.well-known/security.txt',
    content: `Contact: mailto:security@dropanyconvert.com
Expires: ${expiresDate}
Preferred-Languages: en, es, fr, de, pt
Canonical: ${baseUrl}/.well-known/security.txt
Policy: ${baseUrl}/security-policy
Acknowledgments: ${baseUrl}/security-acknowledgments
`,
  };

  // browserconfig.xml — MS tile config (Internet Explorer 11 / Edge Legacy)
  const browserconfigXml = {
    path: '/browserconfig.xml',
    content: `<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
  <msapplication>
    <tile>
      <square150x150logo src="/assets/images/icon-192.png"/>
      <TileColor>#6366f1</TileColor>
    </tile>
  </msapplication>
</browserconfig>
`,
  };

  // site.webmanifest (canonical path browsers prefer over /assets/manifest.json)
  const siteWebmanifest = {
    path: '/site.webmanifest',
    content: JSON.stringify({
      name,
      short_name: name,
      description: config.site.tagline || 'Convert anything. Free. Private. Fast.',
      start_url: `/${config.languages.default}`,
      scope: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#6366f1',
      lang: config.languages.default,
      orientation: 'any',
      categories: ['productivity', 'utilities'],
      icons: [
        { src: '/assets/images/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: '/assets/images/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    }),
  };

  return [humansTxt, securityTxt, browserconfigXml, siteWebmanifest];
}
