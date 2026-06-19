# Results PDF Download Notes

## Overview
The results screen includes a “Download PDF” button that generates a one-page summary matching the on-screen guidance. The PDF is built in the browser using `@react-pdf/renderer`, so users can immediately save or print the instructions without external services.

## User Flow
1. Complete the dynamic form until the tailored results appear.
2. Adjust text size if desired (the on-screen font scale does not affect the PDF output).
3. Click **Download PDF**; a blob is generated and automatically downloaded using a temporary `<a>` element.
4. If an error occurs, a friendly message prompts the user to try again.

## Implementation Details
- Trigger: `src/components/Form.js`
  - `handleDownloadPdf` lazily imports `buildResultsPdf`, manages loading/error states, and streams the resulting blob to the browser.
  - `pdfContent` memo groups sanitized summary/supporting items plus contact placeholder shared between the UI and PDF.
- Sanitization: Only cleaned HTML fragments are passed to the PDF builder (`normalizeResultMarkup`, `hasVisibleContent`). Empty or style-only spans are stripped before rendering.
- PDF Builder: `src/utils/buildResultsPdf.js`
  - Parses HTML blocks into structured paragraphs and lists (preserves links, bullets, and nested items).
  - Renders sections: Key Steps, Additional Guidance, Contact, Notes. Each block becomes a card with consistent spacing and typography.
  - Returns a `Blob` via `@react-pdf/renderer`’s `pdf(doc).toBlob()`.
- Styling: `src/styles/globals.css` mirrors card styling between screen and PDF for consistent visuals.

## Error Handling
- Button disables while `isGeneratingPdf` is true and shows “Generating PDF…” text.
- Failures display `Sorry, we couldn't create the PDF. Please try again in a moment.` and log errors to the console for debugging.

## Testing Checklist
1. Verify PDFs generate for multiple answer paths, including SSN/Citizenship supporting sections.
2. Confirm lists, links, and bold/italic text render correctly in the PDF.
3. Attempt repeated downloads to ensure state resets after each completion.
4. Simulate failure (e.g., offline mode) to confirm the error message appears and the button re-enables.

## Extensibility
- To add a new results section, extend `pdfContent` in `Form.js` and map it to a card in `buildResultsPdf.js`.
- To include organization contact info, replace the `CONTACT_PLACEHOLDER` constant in `Form.js` with formatted guidance or live data.
- Future email delivery can reuse the sanitized HTML already prepared for the PDF builder.
