#!/usr/bin/env python3
"""Builds the EMHIP handover pack: every Markdown document in docs/handover (plus the UK GDPR
register) becomes a branded Word file (word/) and a print-ready HTML file that print_pdfs.mjs
turns into a PDF (pdf/).

The Markdown is a deliberately small subset — headings (#..####), paragraphs, bullet, numbered
and task lists (one nested level), pipe tables, fenced code, "> " notes, "![alt](path)" images
and **bold** / *italic* / `code` / [link](url) inline — so the Word and PDF copies match the
source exactly. Requires python-docx (pip install python-docx).

Usage: python3 docs/handover/_build/build_docs.py
"""
from __future__ import annotations

import html
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.opc.constants import RELATIONSHIP_TYPE as RT
from docx.shared import Cm, Pt, RGBColor

HANDOVER = Path(__file__).resolve().parent.parent
REPO = HANDOVER.parent.parent
# The sidebar logo (client/public/design-assets/97ac96f214b31ab4.png) resized to 420 px.
LOGO = Path(__file__).resolve().parent / "logo.png"

# Documents in the pack, in reading order. The GDPR register lives one level up (docs/).
SOURCES = [
    HANDOVER / "01-Handover-Overview.md",
    HANDOVER / "02-User-Guide.md",
    HANDOVER / "03-Tester-Guide.md",
    HANDOVER / "04-Administrator-Guide.md",
    HANDOVER / "05-Technical-Handover.md",
    HANDOVER / "06-Deployment-and-Operations-Runbook.md",
    HANDOVER / "07-Release-Notes-2026-09-30.md",
    HANDOVER / "07b-Release-Notes-2026-10-07.md",
    HANDOVER / "08-Known-Issues-and-Recommendations.md",
    (REPO / "docs/uk-gdpr-compliance.md", "09-UK-GDPR-Compliance"),
]

MAROON = RGBColor(0x8D, 0x1B, 0x3D)
INK = RGBColor(0x2A, 0x2A, 0x2A)
GREY = RGBColor(0x6E, 0x6E, 0x6E)
LINK = RGBColor(0x1F, 0x5F, 0xA8)
FONT = "Calibri"
MONO = "Consolas"
CONTENT_WIDTH_CM = 16.6  # A4 (21 cm) less 2.2 cm margins each side

# ---------------------------------------------------------------- parsing


@dataclass
class Block:
    kind: str  # h, p, meta, li, table, code, quote, img
    text: str = ""
    level: int = 0
    list_kind: str = ""  # ul, ol, task
    number: int = 0
    checked: bool = False
    rows: list = field(default_factory=list)
    lines: list = field(default_factory=list)


LIST_RE = re.compile(r"^(\s*)([-*+]|\d+[.)])\s+(.*)$")
TABLE_SEP_RE = re.compile(r"^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$")


def split_row(line: str) -> list[str]:
    line = line.strip()
    if line.startswith("|"):
        line = line[1:]
    if line.endswith("|"):
        line = line[:-1]
    return [c.strip() for c in line.split("|")]


def parse(markdown: str) -> list[Block]:
    lines = markdown.replace("\t", "    ").splitlines()
    blocks: list[Block] = []
    counters = [0, 0]
    i = 0

    def starts_block(s: str) -> bool:
        return bool(
            not s.strip()
            or re.match(r"^#{1,4}\s", s)
            or s.startswith("```")
            or s.startswith(">")
            or s.startswith("![")
            or LIST_RE.match(s)
            or s.lstrip().startswith("|")
        )

    while i < len(lines):
        line = lines[i]
        if not line.strip():
            i += 1
            continue
        if line.startswith("```"):
            body = []
            i += 1
            while i < len(lines) and not lines[i].startswith("```"):
                body.append(lines[i])
                i += 1
            blocks.append(Block("code", lines=body))
            i += 1
            continue
        m = re.match(r"^(#{1,4})\s+(.*)$", line)
        if m:
            blocks.append(Block("h", text=m.group(2).strip(), level=len(m.group(1))))
            i += 1
            continue
        m = re.match(r"^!\[([^\]]*)\]\(([^)]+)\)\s*$", line.strip())
        if m:
            blocks.append(Block("img", text=m.group(1), lines=[m.group(2)]))
            i += 1
            continue
        if line.lstrip().startswith("|") and i + 1 < len(lines) and TABLE_SEP_RE.match(lines[i + 1]):
            rows = [split_row(line)]
            i += 2
            while i < len(lines) and lines[i].lstrip().startswith("|"):
                rows.append(split_row(lines[i]))
                i += 1
            blocks.append(Block("table", rows=rows))
            continue
        if line.startswith(">"):
            parts = []
            while i < len(lines) and lines[i].startswith(">"):
                parts.append(lines[i][1:].strip())
                i += 1
            blocks.append(Block("quote", text=" ".join(p for p in parts if p)))
            continue
        m = LIST_RE.match(line)
        if m:
            indent, marker, text = len(m.group(1)), m.group(2), m.group(3)
            level = 0 if indent < 2 else 1
            i += 1
            # Continuation lines: indented text that does not start a new block.
            while i < len(lines) and lines[i].strip() and lines[i].startswith(" ") and not LIST_RE.match(lines[i]):
                text += " " + lines[i].strip()
                i += 1
            prev = blocks[-1] if blocks else None
            if marker[0].isdigit():
                continuing = prev is not None and prev.kind == "li"
                if level == 0:
                    counters[0] = counters[0] + 1 if continuing and any(
                        b.kind == "li" and b.list_kind == "ol" and b.level == 0 for b in _tail_list(blocks)
                    ) else 1
                    counters[1] = 0
                    number = counters[0]
                else:
                    counters[1] = counters[1] + 1 if continuing and prev.level == 1 and prev.list_kind == "ol" else 1
                    number = counters[1]
                blocks.append(Block("li", text=text, level=level, list_kind="ol", number=number))
            else:
                task = re.match(r"^\[([ xX])\]\s+(.*)$", text)
                if task:
                    blocks.append(Block("li", text=task.group(2), level=level, list_kind="task", checked=task.group(1) != " "))
                else:
                    blocks.append(Block("li", text=text, level=level, list_kind="ul"))
                if level == 0:
                    counters[0] = 0
            continue
        parts = [line.strip()]
        i += 1
        while i < len(lines) and not starts_block(lines[i]):
            parts.append(lines[i].strip())
            i += 1
        blocks.append(Block("p", text=" ".join(parts)))

    # The italic line straight after the title is the document's version/audience line.
    if len(blocks) > 1 and blocks[0].kind == "h" and blocks[0].level == 1 and blocks[1].kind == "p":
        t = blocks[1].text
        if (t.startswith("_") and t.endswith("_")) or (t.startswith("*") and t.endswith("*") and not t.startswith("**")):
            blocks[1].kind = "meta"
            blocks[1].text = t[1:-1]
    return blocks


def _tail_list(blocks: list[Block]) -> list[Block]:
    """The run of list items at the end of `blocks` (the list currently being built)."""
    out = []
    for b in reversed(blocks):
        if b.kind != "li":
            break
        out.append(b)
    return out


# Inline: returns [(text, bold, italic, code, href)]
ESC = {c: chr(0xE000 + n) for n, c in enumerate("\\`*_[]()#|!>-+.")}
UNESC = {v: k for k, v in ESC.items()}
INLINE_RE = re.compile(
    r"(`[^`]+`)"
    r"|(\*\*(?:[^*]|\*(?!\*))+?\*\*)"
    r"|(\[[^\]]+\]\([^)\s]+\))"
    r"|((?<![\w*])\*(?![\s*])(?:[^*]+?)(?<!\s)\*(?![\w*]))"
    r"|((?<![\w_])_(?![\s_])(?:[^_]+?)(?<!\s)_(?![\w_]))"
)


def _escape(text: str) -> str:
    return re.sub(r"\\(.)", lambda m: ESC.get(m.group(1), m.group(1)), text)


def _unescape(text: str) -> str:
    return "".join(UNESC.get(ch, ch) for ch in text)


def inline(text: str, bold=False, italic=False, href=None) -> list[tuple]:
    text = _escape(text) if not bold and not italic and href is None else text
    out = []
    pos = 0
    for m in INLINE_RE.finditer(text):
        if m.start() > pos:
            out.append((_unescape(text[pos:m.start()]), bold, italic, False, href))
        tok = m.group(0)
        if m.group(1):
            out.append((_unescape(tok[1:-1]), bold, italic, True, href))
        elif m.group(2):
            out.extend(inline(tok[2:-2], True, italic, href))
        elif m.group(3):
            lm = re.match(r"\[([^\]]+)\]\(([^)\s]+)\)", tok)
            out.extend(inline(lm.group(1), bold, italic, _unescape(lm.group(2))))
        else:
            out.extend(inline(tok[1:-1], bold, True, href))
        pos = m.end()
    if pos < len(text):
        out.append((_unescape(text[pos:]), bold, italic, False, href))
    return out


def plain(text: str) -> str:
    return "".join(r[0] for r in inline(text))


def column_weights(rows: list[list[str]]) -> list[float]:
    """Relative column widths: driven by the body text, with the header counting for less so a
    short "Yes" column under a long heading stays narrow. Clamped so no column vanishes."""
    ncols = max(len(r) for r in rows)
    weights = []
    for c in range(ncols):
        body = max((len(plain(r[c])) for r in rows[1:] if c < len(r)), default=0)
        head = len(plain(rows[0][c])) if c < len(rows[0]) else 0
        weights.append(min(max(body, head * 0.6, 6), 60))
    return weights


# ---------------------------------------------------------------- Word


def _shade(element, hex_fill: str) -> None:
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_fill)
    element.append(shd)


def _para_border_left(paragraph, hex_color: str, size=18) -> None:
    ppr = paragraph._p.get_or_add_pPr()
    borders = OxmlElement("w:pBdr")
    left = OxmlElement("w:left")
    left.set(qn("w:val"), "single")
    left.set(qn("w:sz"), str(size))
    left.set(qn("w:space"), "8")
    left.set(qn("w:color"), hex_color)
    borders.append(left)
    ppr.append(borders)


def _para_border_bottom(paragraph, hex_color: str, size=6) -> None:
    ppr = paragraph._p.get_or_add_pPr()
    borders = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), str(size))
    bottom.set(qn("w:space"), "4")
    bottom.set(qn("w:color"), hex_color)
    borders.append(bottom)
    ppr.append(borders)


def _para_shading(paragraph, hex_fill: str) -> None:
    _shade(paragraph._p.get_or_add_pPr(), hex_fill)


def _field(run, instr: str) -> None:
    begin = OxmlElement("w:fldChar")
    begin.set(qn("w:fldCharType"), "begin")
    text = OxmlElement("w:instrText")
    text.set(qn("xml:space"), "preserve")
    text.text = instr
    sep = OxmlElement("w:fldChar")
    sep.set(qn("w:fldCharType"), "separate")
    val = OxmlElement("w:t")
    val.text = "1"
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    for el in (begin, text, sep, val, end):
        run._r.append(el)


def _add_runs(paragraph, text: str, size=None, color=None) -> None:
    for chunk, bold, italic, code, href in inline(text):
        if href:
            _add_hyperlink(paragraph, chunk, href, bold, italic, size)
            continue
        run = paragraph.add_run(chunk)
        run.bold = bold or None
        run.italic = italic or None
        if code:
            run.font.name = MONO
            run.font.size = Pt((size or 10.5) - 1)
            run.font.color.rgb = RGBColor(0x5A, 0x12, 0x27)
        else:
            if size:
                run.font.size = Pt(size)
            if color is not None:
                run.font.color.rgb = color


def _add_hyperlink(paragraph, text: str, url: str, bold: bool, italic: bool, size=None) -> None:
    r_id = paragraph.part.relate_to(url, RT.HYPERLINK, is_external=True)
    link = OxmlElement("w:hyperlink")
    link.set(qn("r:id"), r_id)
    run = OxmlElement("w:r")
    rpr = OxmlElement("w:rPr")
    color = OxmlElement("w:color")
    color.set(qn("w:val"), "1F5FA8")
    underline = OxmlElement("w:u")
    underline.set(qn("w:val"), "single")
    rpr.append(color)
    rpr.append(underline)
    if bold:
        rpr.append(OxmlElement("w:b"))
    if italic:
        rpr.append(OxmlElement("w:i"))
    if size:
        sz = OxmlElement("w:sz")
        sz.set(qn("w:val"), str(int(size * 2)))
        rpr.append(sz)
    run.append(rpr)
    t = OxmlElement("w:t")
    t.set(qn("xml:space"), "preserve")
    t.text = text
    run.append(t)
    link.append(run)
    paragraph._p.append(link)


def _setup_styles(doc) -> None:
    normal = doc.styles["Normal"]
    normal.font.name = FONT
    normal.element.rPr.rFonts.set(qn("w:eastAsia"), FONT)
    normal.font.size = Pt(10.5)
    normal.font.color.rgb = INK
    normal.paragraph_format.space_after = Pt(6)
    normal.paragraph_format.line_spacing = 1.15
    for name, size, before, after in (
        ("Heading 1", 22, 0, 6),
        ("Heading 2", 15, 18, 6),
        ("Heading 3", 12.5, 12, 4),
        ("Heading 4", 11, 10, 3),
    ):
        st = doc.styles[name]
        st.font.name = FONT
        rfonts = st.element.rPr.find(qn("w:rFonts"))
        if rfonts is not None:
            for attr in ("w:asciiTheme", "w:hAnsiTheme", "w:eastAsiaTheme", "w:cstheme"):
                rfonts.attrib.pop(qn(attr), None)
            rfonts.set(qn("w:ascii"), FONT)
            rfonts.set(qn("w:hAnsi"), FONT)
        st.font.size = Pt(size)
        st.font.bold = True
        st.font.italic = False
        st.font.color.rgb = MAROON if name != "Heading 4" else RGBColor(0x5A, 0x12, 0x27)
        st.paragraph_format.space_before = Pt(before)
        st.paragraph_format.space_after = Pt(after)
        st.paragraph_format.keep_with_next = True
    for name in ("List Bullet", "List Bullet 2"):
        st = doc.styles[name]
        st.font.name = FONT
        st.font.size = Pt(10.5)
        st.paragraph_format.space_after = Pt(3)


def _footer(section, title: str) -> None:
    footer = section.footer
    p = footer.paragraphs[0]
    p.text = ""
    p.paragraph_format.tab_stops.add_tab_stop(Cm(CONTENT_WIDTH_CM), alignment=2)  # right
    run = p.add_run(f"EMHIP · {title}")
    run.font.size = Pt(8.5)
    run.font.color.rgb = GREY
    run = p.add_run("\tPage ")
    run.font.size = Pt(8.5)
    run.font.color.rgb = GREY
    r = p.add_run()
    r.font.size = Pt(8.5)
    r.font.color.rgb = GREY
    _field(r, "PAGE")
    run = p.add_run(" of ")
    run.font.size = Pt(8.5)
    run.font.color.rgb = GREY
    r = p.add_run()
    r.font.size = Pt(8.5)
    r.font.color.rgb = GREY
    _field(r, "NUMPAGES")


def _table(doc, rows: list[list[str]]) -> None:
    ncols = max(len(r) for r in rows)
    rows = [r + [""] * (ncols - len(r)) for r in rows]
    weights = column_weights(rows)
    total = sum(weights)
    widths = [max(CONTENT_WIDTH_CM * w / total, 1.6) for w in weights]
    scale = CONTENT_WIDTH_CM / sum(widths)
    widths = [w * scale for w in widths]

    table = doc.add_table(rows=len(rows), cols=ncols)
    table.alignment = WD_TABLE_ALIGNMENT.LEFT
    table.autofit = False
    tbl_pr = table._tbl.tblPr
    layout = OxmlElement("w:tblLayout")
    layout.set(qn("w:type"), "fixed")
    tbl_pr.append(layout)
    borders = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:val"), "single")
        el.set(qn("w:sz"), "4")
        el.set(qn("w:space"), "0")
        el.set(qn("w:color"), "D9D9D9")
        borders.append(el)
    tbl_pr.append(borders)
    margins = OxmlElement("w:tblCellMar")
    for edge, val in (("top", 50), ("bottom", 50), ("left", 90), ("right", 90)):
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:w"), str(val))
        el.set(qn("w:type"), "dxa")
        margins.append(el)
    tbl_pr.append(margins)

    for r_idx, row in enumerate(rows):
        tr = table.rows[r_idx]
        if r_idx == 0:
            tr_pr = tr._tr.get_or_add_trPr()
            header = OxmlElement("w:tblHeader")
            header.set(qn("w:val"), "true")
            tr_pr.append(header)
        cant_split = OxmlElement("w:cantSplit")
        tr._tr.get_or_add_trPr().append(cant_split)
        for c_idx, text in enumerate(row):
            cell = tr.cells[c_idx]
            cell.width = Cm(widths[c_idx])
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.05
            if r_idx == 0:
                _shade(cell._tc.get_or_add_tcPr(), "8D1B3D")
                for chunk in inline(text):
                    run = p.add_run(chunk[0])
                    run.bold = True
                    run.font.size = Pt(9.5)
                    run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
            else:
                if r_idx % 2 == 0:
                    _shade(cell._tc.get_or_add_tcPr(), "FAF6F7")
                _add_runs(p, text, size=9.5)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)


def build_docx(blocks: list[Block], title: str, out: Path, source_dir: Path) -> None:
    doc = Document()
    _setup_styles(doc)
    section = doc.sections[0]
    section.page_width, section.page_height = Cm(21), Cm(29.7)
    section.left_margin = section.right_margin = Cm(2.2)
    section.top_margin, section.bottom_margin = Cm(2.0), Cm(2.0)
    _footer(section, title)

    meta = next((b.text for b in blocks if b.kind == "meta"), "")
    # Title page
    for _ in range(4):
        doc.add_paragraph()
    if LOGO.exists():
        doc.add_picture(str(LOGO), width=Cm(4.2))
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(18)
    run = p.add_run("EMHIP — Ethnicity & Mental Health Improvement Project")
    run.font.size = Pt(11)
    run.font.color.rgb = GREY
    h = doc.add_paragraph(style="Heading 1")
    h.add_run(title)
    _para_border_bottom(h, "8D1B3D", 12)
    if meta:
        for part in [m.strip() for m in plain(meta).split("·")]:
            mp = doc.add_paragraph()
            mp.paragraph_format.space_after = Pt(2)
            r = mp.add_run(part)
            r.font.size = Pt(11)
            r.font.color.rgb = GREY
    # Contents (static list of the level-2 headings)
    sections = [b.text for b in blocks if b.kind == "h" and b.level == 2]
    if len(sections) >= 3:
        doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)
        ch = doc.add_paragraph(style="Heading 2")
        ch.add_run("Contents")
        numbered = any(re.match(r"^\d+[.)]?\s", plain(s)) for s in sections)
        for n, s in enumerate(sections, 1):
            cp = doc.add_paragraph()
            cp.paragraph_format.space_after = Pt(2)
            cp.paragraph_format.left_indent = Cm(0.2)
            r = cp.add_run(plain(s) if numbered else f"{n}.  {plain(s)}")
            r.font.size = Pt(10.5)
    doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)

    for b in blocks:
        if b.kind == "h" and b.level == 1:
            continue  # already on the title page
        if b.kind == "meta":
            continue
        if b.kind == "h":
            hp = doc.add_paragraph(style=f"Heading {b.level}")
            _add_runs(hp, b.text)
            if b.level == 2:
                _para_border_bottom(hp, "E8D5DB", 6)
        elif b.kind == "p":
            _add_runs(doc.add_paragraph(), b.text)
        elif b.kind == "li":
            if b.list_kind == "ul":
                lp = doc.add_paragraph(style="List Bullet" if b.level == 0 else "List Bullet 2")
            else:
                lp = doc.add_paragraph()
                indent = 0.75 * (b.level + 1)
                lp.paragraph_format.left_indent = Cm(indent)
                lp.paragraph_format.first_line_indent = Cm(-0.6)
                lp.paragraph_format.tab_stops.add_tab_stop(Cm(indent))
                lp.paragraph_format.space_after = Pt(3)
                marker = f"{b.number}." if b.list_kind == "ol" else ("☑" if b.checked else "☐")
                mr = lp.add_run(marker + "\t")
                if b.list_kind == "ol":
                    mr.bold = True
                    mr.font.color.rgb = MAROON
                else:
                    mr.font.size = Pt(12)
            _add_runs(lp, b.text)
        elif b.kind == "table":
            _table(doc, b.rows)
        elif b.kind == "quote":
            qp = doc.add_paragraph()
            qp.paragraph_format.left_indent = Cm(0.35)
            qp.paragraph_format.space_before = Pt(4)
            qp.paragraph_format.space_after = Pt(8)
            _para_border_left(qp, "8D1B3D")
            _para_shading(qp, "FBF1F4")
            _add_runs(qp, b.text)
        elif b.kind == "code":
            cp = doc.add_paragraph()
            cp.paragraph_format.left_indent = Cm(0.2)
            cp.paragraph_format.space_after = Pt(8)
            cp.paragraph_format.line_spacing = 1.0
            _para_shading(cp, "F3F3F3")
            for n, line in enumerate(b.lines):
                run = cp.add_run(line)
                run.font.name = MONO
                run.font.size = Pt(8.5)
                if n < len(b.lines) - 1:
                    run.add_break()
        elif b.kind == "img":
            path = (source_dir / b.lines[0]).resolve()
            if path.exists():
                doc.add_picture(str(path), width=Cm(CONTENT_WIDTH_CM))
                cap = doc.add_paragraph()
                r = cap.add_run(b.text)
                r.italic = True
                r.font.size = Pt(9)
                r.font.color.rgb = GREY
    props = doc.core_properties
    props.title = title
    props.author = "EMHIP project team"
    props.subject = plain(meta)
    doc.save(out)


# ---------------------------------------------------------------- HTML (for PDF)


def html_inline(text: str) -> str:
    out = []
    for chunk, bold, italic, code, href in inline(text):
        s = html.escape(chunk)
        if code:
            s = f"<code>{s}</code>"
        if italic:
            s = f"<em>{s}</em>"
        if bold:
            s = f"<strong>{s}</strong>"
        if href:
            s = f'<a href="{html.escape(href)}">{s}</a>'
        out.append(s)
    return "".join(out)


CSS = """
@page { size: A4; margin: 18mm 17mm 20mm 17mm; }
* { box-sizing: border-box; }
body { font-family: "Segoe UI", -apple-system, "Helvetica Neue", Arial, sans-serif; font-size: 10.2pt; line-height: 1.45; color: #2a2a2a; margin: 0; }
.cover { height: 250mm; display: flex; flex-direction: column; justify-content: center; page-break-after: always; }
.cover img { width: 40mm; margin-bottom: 10mm; }
.cover .org { color: #6e6e6e; font-size: 11pt; }
.cover h1 { font-size: 28pt; color: #8d1b3d; margin: 4mm 0 5mm; padding-bottom: 4mm; border-bottom: 2px solid #8d1b3d; line-height: 1.15; }
.cover .meta { color: #6e6e6e; font-size: 11pt; line-height: 1.6; }
.toc { page-break-after: always; }
.toc ol { padding-left: 6mm; line-height: 1.9; }
h2 { color: #8d1b3d; font-size: 15pt; margin: 20pt 0 6pt; padding-bottom: 3pt; border-bottom: 1px solid #e8d5db; break-after: avoid; }
h3 { color: #8d1b3d; font-size: 12pt; margin: 14pt 0 4pt; break-after: avoid; }
h4 { color: #5a1227; font-size: 10.8pt; margin: 10pt 0 3pt; break-after: avoid; }
p { margin: 0 0 6pt; }
ul, ol { margin: 0 0 7pt; padding-left: 6mm; }
li { margin: 0 0 2.5pt; }
li > ul, li > ol { margin-top: 2.5pt; }
ol > li::marker { color: #8d1b3d; font-weight: 600; }
ul.task { list-style: none; padding-left: 1mm; }
ul.task li::before { content: "\\2610"; font-size: 12pt; margin-right: 6px; }
table { border-collapse: collapse; width: 100%; margin: 4pt 0 10pt; font-size: 8.8pt; table-layout: fixed; }
td, th { overflow-wrap: anywhere; }
thead { display: table-header-group; }
th { background: #8d1b3d; color: #fff; text-align: left; font-weight: 600; padding: 4pt 6pt; }
td { padding: 4pt 6pt; border-bottom: 1px solid #e3e3e3; vertical-align: top; }
tr { break-inside: avoid; }
tbody tr:nth-child(even) td { background: #faf6f7; }
blockquote { margin: 5pt 0 9pt; padding: 5pt 9pt; border-left: 4px solid #8d1b3d; background: #fbf1f4; break-inside: avoid; }
code { font-family: Menlo, Consolas, monospace; font-size: 8.6pt; background: #f3eef0; color: #5a1227; padding: 0 3px; border-radius: 3px; }
pre { background: #f4f4f4; padding: 7pt 9pt; border-radius: 4px; font-size: 8.3pt; white-space: pre-wrap; word-break: break-word; break-inside: avoid; }
pre code { background: none; color: #2a2a2a; padding: 0; }
a { color: #1f5fa8; }
figure { margin: 6pt 0 10pt; break-inside: avoid; }
figure img { width: 100%; border: 1px solid #eee; }
figcaption { color: #6e6e6e; font-size: 8.8pt; font-style: italic; margin-top: 3pt; }
"""


def build_html(blocks: list[Block], title: str, out: Path, source_dir: Path) -> None:
    meta = next((b.text for b in blocks if b.kind == "meta"), "")
    parts = ["<!doctype html><html lang='en-GB'><head><meta charset='utf-8'>", f"<title>{html.escape(title)}</title>", f"<style>{CSS}</style></head><body>"]
    logo = f"<img src='{LOGO.as_uri()}' alt='EMHIP'>" if LOGO.exists() else ""
    meta_html = "<br>".join(html.escape(m.strip()) for m in plain(meta).split("·")) if meta else ""
    parts.append(f"<section class='cover'>{logo}<div class='org'>EMHIP — Ethnicity &amp; Mental Health Improvement Project</div><h1>{html.escape(title)}</h1><div class='meta'>{meta_html}</div></section>")
    sections = [b.text for b in blocks if b.kind == "h" and b.level == 2]
    if len(sections) >= 3:
        items = "".join(f"<li>{html_inline(s)}</li>" for s in sections)
        numbered = any(re.match(r"^\d+[.)]?\s", plain(s)) for s in sections)
        listing = f"<ul style='list-style:none;padding-left:0'>{items}</ul>" if numbered else f"<ol>{items}</ol>"
        parts.append(f"<section class='toc'><h2>Contents</h2>{listing}</section>")

    i = 0
    while i < len(blocks):
        b = blocks[i]
        if b.kind in ("meta",) or (b.kind == "h" and b.level == 1):
            i += 1
            continue
        if b.kind == "h":
            parts.append(f"<h{b.level}>{html_inline(b.text)}</h{b.level}>")
        elif b.kind == "p":
            parts.append(f"<p>{html_inline(b.text)}</p>")
        elif b.kind == "quote":
            parts.append(f"<blockquote>{html_inline(b.text)}</blockquote>")
        elif b.kind == "code":
            parts.append("<pre><code>" + html.escape("\n".join(b.lines)) + "</code></pre>")
        elif b.kind == "img":
            path = (source_dir / b.lines[0]).resolve()
            parts.append(f"<figure><img src='{path.as_uri()}' alt='{html.escape(b.text)}'><figcaption>{html.escape(b.text)}</figcaption></figure>")
        elif b.kind == "table":
            # Same proportional widths as the Word table, so an empty column (e.g. one left for
            # testers to fill in) keeps a usable width instead of collapsing.
            # The same 1.6 cm minimum as the Word table, so a short "#" column does not wrap "10".
            weights = column_weights(b.rows)
            total = sum(weights)
            widths = [max(CONTENT_WIDTH_CM * w / total, 1.6) for w in weights]
            percents = [100 * w / sum(widths) for w in widths]
            head = "".join(f"<th style='width:{p:.1f}%'>{html_inline(c)}</th>" for c, p in zip(b.rows[0], percents))
            body = "".join("<tr>" + "".join(f"<td>{html_inline(c)}</td>" for c in r) + "</tr>" for r in b.rows[1:])
            parts.append(f"<table><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table>")
        elif b.kind == "li":
            # Gather the whole list (consecutive li blocks) and nest level-1 items.
            j = i
            items = []
            while j < len(blocks) and blocks[j].kind == "li":
                items.append(blocks[j])
                j += 1
            parts.append(_html_list(items))
            i = j
            continue
        i += 1
    parts.append("</body></html>")
    out.write_text("".join(parts), encoding="utf-8")


def _html_list(items: list[Block]) -> str:
    def tag(kind: str) -> tuple[str, str]:
        if kind == "ol":
            return "<ol>", "</ol>"
        if kind == "task":
            return "<ul class='task'>", "</ul>"
        return "<ul>", "</ul>"

    html_out = []
    current = None
    k = 0
    while k < len(items):
        it = items[k]
        if it.level == 0:
            if current != it.list_kind:
                if current is not None:
                    html_out.append(tag(current)[1])
                html_out.append(tag(it.list_kind)[0])
                current = it.list_kind
            html_out.append(f"<li>{html_inline(it.text)}")
            k += 1
            if k < len(items) and items[k].level == 1:
                sub_kind = items[k].list_kind
                html_out.append(tag(sub_kind)[0])
                while k < len(items) and items[k].level == 1:
                    html_out.append(f"<li>{html_inline(items[k].text)}</li>")
                    k += 1
                html_out.append(tag(sub_kind)[1])
            html_out.append("</li>")
        else:
            # A nested item with no parent in this run: show it as a top-level item.
            html_out.append(f"<ul><li>{html_inline(it.text)}</li></ul>")
            k += 1
    if current is not None:
        html_out.append(tag(current)[1])
    return "".join(html_out)


# ---------------------------------------------------------------- main


def main() -> int:
    word_dir = HANDOVER / "word"
    html_dir = HANDOVER / "_build" / "html"
    word_dir.mkdir(exist_ok=True)
    html_dir.mkdir(parents=True, exist_ok=True)
    built = []
    for entry in SOURCES:
        src, stem = (entry, entry.stem) if isinstance(entry, Path) else entry
        if not src.exists():
            print(f"skip (missing): {src.relative_to(REPO)}")
            continue
        blocks = parse(src.read_text(encoding="utf-8"))
        title_block = next((b for b in blocks if b.kind == "h" and b.level == 1), None)
        title = plain(title_block.text) if title_block else stem
        name = f"EMHIP-{stem}"
        build_docx(blocks, title, word_dir / f"{name}.docx", src.parent)
        build_html(blocks, title, html_dir / f"{name}.html", src.parent)
        built.append((name, title))
        print(f"built {name}  ({len(blocks)} blocks)")
    (html_dir / "manifest.txt").write_text("\n".join(f"{n}\t{t}" for n, t in built), encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
