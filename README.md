# PaperPrisions ID Tool

## How to export the application to a static folder

First, run the below command

```
npm i && npm run build
```

Then you can host everything under docs folder. Currently it's hosted as [github pages] with a permanent url([https://paperprisons.github.io/paper-prisons-id-tool/](https://paperprisons.github.io/paper-prisons-id-tool/)) without any downtime.

## How to run it in your local

First, run the development server:

```bash

npm i && npm run dev

```

Then you can check the webpage localhost:3000 in your local.

## Recent UI Updates

- Dropdown questions now behave as searchable comboboxes. Start typing to filter states (or any long list) and use the arrow keys plus Enter to confirm a selection.
- Updated styling keeps the new combobox consistent with the rest of the design system, including focus states for keyboard users.
- Implementation notes for the combobox component and styles are documented at `docs/ui-combobox-update-notes.md`.
- The results page now offers a one-page PDF download of the guidance (details in `docs/results-pdf-download.md`).
- Email delivery remains an open task until a transactional provider is configured.
