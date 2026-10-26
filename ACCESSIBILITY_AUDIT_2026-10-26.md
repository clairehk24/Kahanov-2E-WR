# Kahanov 2E Web Resources: Accessibility Audit

**Date:** October 26, 2026  
**Target:** [WCAG 2.2 Level AA](https://www.w3.org/TR/WCAG22/)  
**Status:** Source and package audit completed; WCAG conformance is **not established**.

## Scope and method

The local `index.html` site was reviewed across its home, case study, check sheet, video, flashcard, and chapter quiz views. The review included the quiz results download path, 84 linked DOCX files (35 check sheets, 48 case studies, and the copyright file), and 36 downloadable ZIP archives. The source book PDF and the unlinked flashcard and quiz manuscript DOCX files were outside the learner-facing download scope. The 28 Brightcove videos were inventoried, but their playback and captions could not be inspected.

The review followed the scope, explore, evaluate, and report structure of [W3C's WCAG Evaluation Methodology](https://www.w3.org/WAI/test-evaluate/conformance/wcag-em/). It combined source inspection, OOXML package checks, local link and ZIP validation, selected calculated color contrasts, and JavaScript syntax checks. A browser and assistive technology were unavailable in this session, so keyboard operation, screen reader output, responsive reflow, zoom, and live video behavior remain untested. This is a local package review, not a live hosted-site test.

## Changes made during this audit

| Area | Issue and correction | Related WCAG criteria |
| --- | --- | --- |
| Skip link | The skip link targeted the home view's `<main>` even while another route was open. It now focuses the visible view's `<main>`. | 2.4.1 Bypass Blocks; 2.4.3 Focus Order |
| Flash cards | The button's `aria-label` replaced its visible term or definition in the accessible name. The label was removed, and a status announcement now exposes each term and revealed definition. Starting a deck focuses the card. | 4.1.2 Name, Role, Value; 2.4.3 Focus Order |
| Quizzes | Choice controls now have a group named by the question. The active question receives focus when a quiz starts, and the results heading receives focus when results open. Chapter selection moves focus to Start Quiz when the picker closes. | 1.3.1 Info and Relationships; 2.4.3 Focus Order |
| Video frame | The initially hidden iframe now retains a nonempty title. The title changes to the selected video's name during playback. | 4.1.2 Name, Role, Value |
| Results download | The existing PDF is built from page images, so it has no selectable text layer or document tags. A plain-text results download containing the same report information was added as an accessible alternative; the PDF remains available. | 1.1.1 Non-text Content; 1.3.1 Info and Relationships |

## Findings that remain open

| Priority | Finding | Evidence and next check |
| --- | --- | --- |
| High | Linked DOCX files need semantic remediation and Word review. | All 84 linked files lack document title metadata and use no Heading paragraph styles. All 35 check sheets contain tables, and two case studies contain tables; none of the 37 files marks a table header row. Some tables may be for layout, so inspect their purpose before adding headers. Review headings, reading order, table relationships, and keyboard use in Word; then rebuild affected ZIPs. Related criterion: 1.3.1. |
| High | Video accessibility is unverified. | The site references 28 Brightcove videos. Confirm captions, audio description or equivalent where needed, player keyboard access, and focus behavior. Related criteria include 1.2.2 and 2.1.1. |
| Medium | The PDF results file itself remains image based. | The text report provides the same submitted report content, but the PDF lacks a text layer and tags. Replace or supplement it with a tagged PDF if an accessible PDF is required as a deliverable. |
| High | Rendered and assistive technology checks are outstanding. | Test every view with keyboard only; verify focus order, focus visibility, screen reader announcements, 200% and 400% zoom/reflow, mobile widths, target sizes, and contrast in the rendered states. An automated scanner can help find additional issues but cannot establish conformance by itself. |

## Checks completed

- Static HTML: no duplicate IDs, no `<img>` elements missing `alt`, no anchors missing `href`, and no missing local references among seven static HTML links and assets. The iframe has a nonempty title after remediation.
- Downloads: all 84 linked DOCX paths exist; all 36 ZIP archives passed ZIP integrity checks.
- DOCX packages: all 84 have language information in styles; no linked DOCX has a `word/media` image. The semantic structure concerns above remain.
- Selected CSS text/background pairs calculated at 5.13:1 or higher for normal text. This does not cover all states or non-text contrast. Examples: muted text on the pale blue panel 5.13:1; navy on white 11.94:1; red on pale blue 6.57:1.
- JavaScript: the quiz code, quiz data, flashcard data, and inline page script parsed successfully after the changes. This is a syntax check, not browser playback.

## Conclusion

The site has received targeted accessibility corrections and a source-level audit. **Do not claim WCAG 2.2 AA conformance yet.** The linked Word files, video media, and rendered keyboard and screen reader interactions need further verification and, where findings are confirmed, remediation.
