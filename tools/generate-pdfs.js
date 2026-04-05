/**
 * Generate PDFs from markdown documents for the ARC landing site.
 * Usage: node tools/generate-pdfs.js
 */

const { marked } = require('marked');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const DOCS = [
  {
    input: path.join(__dirname, '..', 'docs', 'PRODUCT-MANUAL.md'),
    output: path.join(__dirname, '..', 'artifacts', 'pdf', 'ARC-XT-Product-Manual.pdf'),
    title: 'ARC XT — Product Manual',
    version: 'v0.1.13'
  },
  {
    input: path.join(__dirname, '..', 'docs', 'SECURITY-WHITEPAPER.md'),
    output: path.join(__dirname, '..', 'artifacts', 'pdf', 'ARC-XT-Security-Whitepaper.pdf'),
    title: 'ARC XT — Security White Paper',
    version: 'v0.1.13'
  }
];

const PDF_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
  
  @page {
    size: A4;
    margin: 20mm 18mm 20mm 18mm;
    @top-center {
      content: "";
      font-size: 8pt;
      color: #6b7280;
    }
    @bottom-center {
      content: "ARC XT v0.1.13 — Confidential";
      font-size: 7pt;
      color: #9ca3af;
      font-family: 'Inter', sans-serif;
    }
    @bottom-right {
      content: counter(page);
      font-size: 7pt;
      color: #9ca3af;
      font-family: 'Inter', sans-serif;
    }
  }
  
  * { box-sizing: border-box; margin: 0; padding: 0; }
  
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 10pt;
    line-height: 1.6;
    color: #1f2937;
  }
  
  h1 {
    font-size: 22pt;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 4pt;
    letter-spacing: -0.02em;
    page-break-before: avoid;
  }
  
  h1:first-of-type {
    margin-top: 0;
    padding-bottom: 16pt;
    border-bottom: 2px solid #3b82f6;
  }
  
  h2 {
    font-size: 15pt;
    font-weight: 600;
    color: #1e293b;
    margin-top: 24pt;
    margin-bottom: 8pt;
    padding-bottom: 4pt;
    border-bottom: 1px solid #e5e7eb;
    page-break-after: avoid;
  }
  
  h3 {
    font-size: 12pt;
    font-weight: 600;
    color: #334155;
    margin-top: 16pt;
    margin-bottom: 6pt;
    page-break-after: avoid;
  }
  
  p {
    margin-bottom: 8pt;
    text-align: justify;
  }
  
  blockquote {
    border-left: 3px solid #3b82f6;
    padding: 8pt 12pt;
    margin: 12pt 0;
    background: #f8fafc;
    color: #475569;
    font-style: italic;
    border-radius: 0 4px 4px 0;
  }
  
  code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 8.5pt;
    background: #f1f5f9;
    padding: 1pt 4pt;
    border-radius: 3px;
    color: #0f172a;
  }
  
  pre {
    background: #0f172a;
    color: #e2e8f0;
    padding: 12pt;
    border-radius: 6px;
    margin: 12pt 0;
    overflow: hidden;
    page-break-inside: avoid;
  }
  
  pre code {
    background: none;
    padding: 0;
    color: inherit;
    font-size: 8pt;
    line-height: 1.5;
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 12pt 0;
    font-size: 9pt;
    page-break-inside: avoid;
  }
  
  th {
    background: #f8fafc;
    font-weight: 600;
    text-align: left;
    padding: 6pt 8pt;
    border-bottom: 2px solid #e5e7eb;
    color: #1e293b;
  }
  
  td {
    padding: 6pt 8pt;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: top;
  }
  
  tr:last-child td {
    border-bottom: none;
  }
  
  ul, ol {
    margin: 8pt 0 8pt 16pt;
  }
  
  li {
    margin-bottom: 3pt;
  }
  
  strong {
    font-weight: 600;
    color: #0f172a;
  }
  
  hr {
    border: none;
    border-top: 1px solid #e5e7eb;
    margin: 16pt 0;
  }
  
  a {
    color: #2563eb;
    text-decoration: none;
  }
  
  .cover-page {
    height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    padding: 40mm 18mm;
    page-break-after: always;
  }
  
  .cover-page .logo {
    font-family: 'Inter', sans-serif;
    font-size: 36pt;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: -0.03em;
    margin-bottom: 8pt;
  }
  
  .cover-page .logo span {
    color: #3b82f6;
  }
  
  .cover-page .subtitle {
    font-size: 14pt;
    color: #64748b;
    font-weight: 400;
    margin-bottom: 32pt;
  }
  
  .cover-page .doc-title {
    font-size: 20pt;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 8pt;
  }
  
  .cover-page .meta {
    font-size: 10pt;
    color: #94a3b8;
  }
  
  .cover-page .divider {
    width: 60px;
    height: 3px;
    background: #3b82f6;
    margin: 24pt 0;
  }
  
  .cover-page .footer {
    position: absolute;
    bottom: 20mm;
    left: 18mm;
    right: 18mm;
    font-size: 8pt;
    color: #cbd5e1;
    border-top: 1px solid #e2e8f0;
    padding-top: 12pt;
  }
`;

function createCoverHtml(doc) {
  const isManual = doc.title.includes('Product');
  const description = isManual 
    ? 'User-facing guide for installing, configuring, and operating ARC XT in VS Code.'
    : 'Technical deep-dive into the security architecture, threat model, and privacy guarantees of ARC XT.';
  
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<div class="cover-page">
  <div class="logo">ARC <span>XT</span></div>
  <div class="subtitle">A governance layer for AI-assisted coding</div>
  <div class="divider"></div>
  <div class="doc-title">${doc.title}</div>
  <div class="meta">${doc.version} · Clean Baseline Release · ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
  <div class="meta" style="margin-top:8pt">${description}</div>
  <div class="footer">
    github.com/habrahgithub/arc-extension · Apache-2.0 License<br>
    This document corresponds to ARC XT v0.1.13.
  </div>
</div>
</body>
</html>`;
}

function createContentHtml(doc, htmlContent) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>${PDF_STYLES}</style>
</head>
<body>
${htmlContent}
</body>
</html>`;
}

async function generatePdf(doc) {
  console.log(`Generating: ${path.basename(doc.output)}`);
  
  const markdown = fs.readFileSync(doc.input, 'utf8');
  const htmlContent = marked.parse(markdown, { gfm: true, breaks: false });
  
  // Remove the first H1 from content (it's redundant with cover)
  const cleanedHtml = htmlContent.replace(/<h1[^>]*>.*?<\/h1>/, '');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set content with cover page
    const fullHtml = createCoverHtml(doc) + createContentHtml(doc, cleanedHtml);
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
    
    await page.pdf({
      path: doc.output,
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: true
    });
    
    const stats = fs.statSync(doc.output);
    console.log(`  ✓ Created (${(stats.size / 1024).toFixed(0)} KB)`);
  } finally {
    await browser.close();
  }
}

async function main() {
  const outputDir = path.join(__dirname, '..', 'artifacts', 'pdf');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  for (const doc of DOCS) {
    if (!fs.existsSync(doc.input)) {
      console.error(`Missing: ${doc.input}`);
      process.exit(1);
    }
    await generatePdf(doc);
  }
  
  console.log('\nDone. PDFs saved to artifacts/pdf/');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
