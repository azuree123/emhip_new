# EMHIP handover pack

The complete handover documentation for EMHIP, issued 30 September 2026 and updated 7 October 2026 for the round 2 feedback and 8 October 2026 for round 3. Start with the Handover Overview. Each document is kept here as Markdown (the source, easy to update and review in pull requests), with Word copies in [word/](word/) and PDF copies in [pdf/](pdf/) to send or print.

| # | Document | For | Word | PDF |
| --- | --- | --- | --- | --- |
| 01 | [Handover Overview](01-Handover-Overview.md) | Project team, service leads | [docx](word/EMHIP-01-Handover-Overview.docx) | [pdf](pdf/EMHIP-01-Handover-Overview.pdf) |
| 02 | [User Guide](02-User-Guide.md) | CMHWs, CPNs, Hub Managers | [docx](word/EMHIP-02-User-Guide.docx) | [pdf](pdf/EMHIP-02-User-Guide.pdf) |
| 03 | [Tester Guide](03-Tester-Guide.md) | Testing team | [docx](word/EMHIP-03-Tester-Guide.docx) | [pdf](pdf/EMHIP-03-Tester-Guide.pdf) |
| 04 | [Administrator Guide](04-Administrator-Guide.md) | System administrators, Hub Managers | [docx](word/EMHIP-04-Administrator-Guide.docx) | [pdf](pdf/EMHIP-04-Administrator-Guide.pdf) |
| 05 | [Technical Handover](05-Technical-Handover.md) | Developers, IT | [docx](word/EMHIP-05-Technical-Handover.docx) | [pdf](pdf/EMHIP-05-Technical-Handover.pdf) |
| 06 | [Deployment and Operations Runbook](06-Deployment-and-Operations-Runbook.md) | Whoever runs the server | [docx](word/EMHIP-06-Deployment-and-Operations-Runbook.docx) | [pdf](pdf/EMHIP-06-Deployment-and-Operations-Runbook.pdf) |
| 07 | [Release Notes, 30 September 2026](07-Release-Notes-2026-09-30.md) | Project team, administrators | [docx](word/EMHIP-07-Release-Notes-2026-09-30.docx) | [pdf](pdf/EMHIP-07-Release-Notes-2026-09-30.pdf) |
| 07b | [Release Notes, 7 October 2026](07b-Release-Notes-2026-10-07.md) | Project team, administrators, testers | [docx](word/EMHIP-07b-Release-Notes-2026-10-07.docx) | [pdf](pdf/EMHIP-07b-Release-Notes-2026-10-07.pdf) |
| 07c | [Release Notes, 8 October 2026](07c-Release-Notes-2026-10-08.md) | Project team, administrators, testers | [docx](word/EMHIP-07c-Release-Notes-2026-10-08.docx) | [pdf](pdf/EMHIP-07c-Release-Notes-2026-10-08.pdf) |
| 08 | [Known Issues and Recommendations](08-Known-Issues-and-Recommendations.md) | Project team, developers | [docx](word/EMHIP-08-Known-Issues-and-Recommendations.docx) | [pdf](pdf/EMHIP-08-Known-Issues-and-Recommendations.pdf) |
| 09 | [UK GDPR Compliance Register](../uk-gdpr-compliance.md) | Data protection lead | [docx](word/EMHIP-09-UK-GDPR-Compliance.docx) | [pdf](pdf/EMHIP-09-UK-GDPR-Compliance.pdf) |

Related files:

- [EMHIP_EPR_Testing_Feedback_Responses.xlsx](../EMHIP_EPR_Testing_Feedback_Responses.xlsx): the customer's round 1 feedback sheet with a resolution and retest steps for each item. The original sheet is [EMHIP_EPR_Testing_Feedback.xlsx](../EMHIP_EPR_Testing_Feedback.xlsx).
- [Live Tester Guide](https://claude.ai/code/artifact/dc8ab0bb-d1c8-4f5a-b4fb-aeba84042e4a): a commentable online copy of document 03.

## Updating the pack

Edit the Markdown, then regenerate the Word and PDF copies from the repository root:

```bash
python3 docs/handover/_build/build_docs.py
node docs/handover/_build/print_pdfs.mjs
```

The first command needs Python 3 with `python-docx`; the second needs Node 22 or later and Google Chrome. The Markdown uses a small subset (headings, paragraphs, lists, tables, notes starting with `>`, code blocks and images) so that all three formats match; `_build/build_docs.py` describes it. Keep document dates and version lines up to date when you change a document.
