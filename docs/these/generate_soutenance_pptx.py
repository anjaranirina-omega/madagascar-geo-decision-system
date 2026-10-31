#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Génère le support de soutenance RISKCLIM-MG (PowerPoint 16:9).

Usage :
    python3 generate_soutenance_pptx.py

Sortie :
    Soutenance_RISKCLIM-MG.pptx  (dans le même dossier)

Dépendance : python-pptx
"""

from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Emu, Inches, Pt

# --------------------------------------------------------------------------
# Palette et constantes de mise en page
# --------------------------------------------------------------------------

NAVY = RGBColor(0x13, 0x00, 0x5B)
NAVY_2 = RGBColor(0x1D, 0x0A, 0x6E)
CYAN = RGBColor(0x11, 0xCF, 0xE7)
CYAN_DARK = RGBColor(0x12, 0x43, 0x88)
YELLOW = RGBColor(0xFF, 0xC3, 0x00)
MAGENTA = RGBColor(0xC0, 0x26, 0xD3)
GREEN = RGBColor(0x34, 0xD3, 0x99)
ORANGE = RGBColor(0xF5, 0x9E, 0x0B)
RED = RGBColor(0xF8, 0x71, 0x71)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
SOFT = RGBColor(0xDD, 0xE4, 0xFF)
MUTED = RGBColor(0x9A, 0x9C, 0xC8)

FONT = "Calibri"
SW = Inches(13.333)
SH = Inches(7.5)

ASSETS = Path(__file__).parent / "assets"


# --------------------------------------------------------------------------
# Helpers de dessin
# --------------------------------------------------------------------------


def new_deck() -> Presentation:
    prs = Presentation()
    prs.slide_width = SW
    prs.slide_height = SH
    return prs


def blank(prs: Presentation):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, SW, SH)
    bg.fill.solid()
    bg.fill.fore_color.rgb = NAVY
    bg.line.fill.background()
    bg.shadow.inherit = False
    return slide


def circuit(slide, accent=CYAN):
    """Décor discret : segments et pastilles dans les angles."""
    specs = [
        # (x1, y1, x2, y2)
        (Inches(0.0), Inches(0.55), Inches(1.45), Inches(0.55)),
        (Inches(0.0), Inches(2.05), Inches(0.75), Inches(2.05)),
        (Inches(11.9), Inches(0.55), Inches(13.333), Inches(0.55)),
        (Inches(12.55), Inches(6.95), Inches(13.333), Inches(6.95)),
        (Inches(0.0), Inches(6.95), Inches(0.9), Inches(6.95)),
    ]
    for x1, y1, x2, y2 in specs:
        ln = slide.shapes.add_connector(1, x1, y1, x2, y2)
        ln.line.color.rgb = RGBColor(0x2A, 0x1F, 0x8A)
        ln.line.width = Pt(1.4)
    dots = [
        (Inches(1.45), Inches(0.55)),
        (Inches(0.75), Inches(2.05)),
        (Inches(11.9), Inches(0.55)),
        (Inches(12.55), Inches(6.95)),
        (Inches(0.9), Inches(6.95)),
    ]
    for x, y in dots:
        d = slide.shapes.add_shape(
            MSO_SHAPE.OVAL, x - Inches(0.075), y - Inches(0.075), Inches(0.15), Inches(0.15)
        )
        d.fill.solid()
        d.fill.fore_color.rgb = accent
        d.line.fill.background()
        d.shadow.inherit = False


def ribbon(slide, text, width=Inches(10.9), top=Inches(0.45), size=26):
    box = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, Inches(0.55), top, width, Inches(0.78)
    )
    box.fill.gradient()
    box.fill.gradient_angle = 0
    stops = box.fill.gradient_stops
    stops[0].color.rgb = CYAN_DARK
    stops[0].position = 0.0
    stops[1].color.rgb = CYAN
    stops[1].position = 1.0
    box.line.fill.background()
    box.shadow.inherit = False
    tf = box.text_frame
    tf.margin_left = Inches(0.22)
    tf.margin_right = Inches(0.15)
    tf.margin_top = 0
    tf.margin_bottom = 0
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.LEFT
    r = p.add_run()
    r.text = text
    r.font.size = Pt(size)
    r.font.bold = True
    r.font.name = FONT
    r.font.color.rgb = NAVY
    return box


def textbox(slide, left, top, width, height):
    tb = slide.shapes.add_textbox(left, top, width, height)
    tf = tb.text_frame
    tf.word_wrap = True
    return tf


def para(tf, text, size=16, bold=False, color=WHITE, space_before=6, first=False, align=PP_ALIGN.LEFT, italic=False):
    p = tf.paragraphs[0] if first else tf.add_paragraph()
    p.alignment = align
    p.space_before = Pt(space_before)
    r = p.add_run()
    r.text = text
    r.font.size = Pt(size)
    r.font.bold = bold
    r.font.italic = italic
    r.font.name = FONT
    r.font.color.rgb = color
    return p


def bullets(slide, items, left, top, width, height, size=15, color=WHITE, bullet_color=CYAN, gap=8):
    tf = textbox(slide, left, top, width, height)
    first = True
    for item in items:
        if isinstance(item, tuple):
            main, detail = item
        else:
            main, detail = item, None
        p = tf.paragraphs[0] if first else tf.add_paragraph()
        first = False
        p.space_before = Pt(gap)
        r0 = p.add_run()
        r0.text = "▸  "
        r0.font.size = Pt(size)
        r0.font.name = FONT
        r0.font.bold = True
        r0.font.color.rgb = bullet_color
        r1 = p.add_run()
        r1.text = main
        r1.font.size = Pt(size)
        r1.font.name = FONT
        r1.font.bold = True
        r1.font.color.rgb = color
        if detail:
            p2 = tf.add_paragraph()
            p2.space_before = Pt(1)
            r2 = p2.add_run()
            r2.text = "      " + detail
            r2.font.size = Pt(size - 2.5)
            r2.font.name = FONT
            r2.font.color.rgb = MUTED
    return tf


def card(slide, left, top, width, height, title, value=None, caption=None, accent=CYAN, fill=NAVY_2):
    box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    box.fill.solid()
    box.fill.fore_color.rgb = fill
    box.line.color.rgb = RGBColor(0x33, 0x28, 0x8F)
    box.line.width = Pt(1)
    box.shadow.inherit = False
    bar = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, left, top, width, Inches(0.055)
    )
    bar.fill.solid()
    bar.fill.fore_color.rgb = accent
    bar.line.fill.background()
    bar.shadow.inherit = False

    tf = box.text_frame
    tf.word_wrap = True
    tf.margin_left = Inches(0.16)
    tf.margin_right = Inches(0.12)
    tf.margin_top = Inches(0.14)
    tf.margin_bottom = Inches(0.08)
    tf.vertical_anchor = MSO_ANCHOR.TOP

    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    r.text = title
    r.font.size = Pt(11.5)
    r.font.name = FONT
    r.font.bold = True
    r.font.color.rgb = SOFT

    if value:
        p2 = tf.add_paragraph()
        p2.alignment = PP_ALIGN.CENTER
        p2.space_before = Pt(4)
        r2 = p2.add_run()
        r2.text = value
        r2.font.size = Pt(26)
        r2.font.name = FONT
        r2.font.bold = True
        r2.font.color.rgb = WHITE

    if caption:
        p3 = tf.add_paragraph()
        p3.alignment = PP_ALIGN.CENTER
        p3.space_before = Pt(2)
        r3 = p3.add_run()
        r3.text = caption
        r3.font.size = Pt(9.5)
        r3.font.name = FONT
        r3.font.color.rgb = MUTED
    return box


def circle_num(slide, left, top, num, color=YELLOW, size=Inches(0.42)):
    c = slide.shapes.add_shape(MSO_SHAPE.OVAL, left, top, size, size)
    c.fill.solid()
    c.fill.fore_color.rgb = color
    c.line.fill.background()
    c.shadow.inherit = False
    tf = c.text_frame
    tf.margin_left = 0
    tf.margin_right = 0
    tf.margin_top = 0
    tf.margin_bottom = 0
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    r.text = str(num)
    r.font.size = Pt(15)
    r.font.bold = True
    r.font.name = FONT
    r.font.color.rgb = NAVY
    return c


def footer(slide, page):
    tf = textbox(slide, Inches(0.55), Inches(7.02), Inches(9.0), Inches(0.35))
    para(
        tf,
        "RISKCLIM-MG  ·  ANJAR Omega  ·  ENI Fianarantsoa  ·  2025-2026",
        size=9,
        color=MUTED,
        first=True,
    )
    tf2 = textbox(slide, Inches(12.2), Inches(7.02), Inches(0.9), Inches(0.35))
    para(tf2, str(page), size=9, color=MUTED, first=True, align=PP_ALIGN.RIGHT)


def picture(slide, name, left, top, width, height=None, frame=True):
    path = ASSETS / name
    if not path.exists():
        return None
    if height is None:
        pic = slide.shapes.add_picture(str(path), left, top, width=width)
    else:
        pic = slide.shapes.add_picture(str(path), left, top, width=width, height=height)
    if frame:
        pic.line.color.rgb = RGBColor(0x3A, 0x2E, 0x9B)
        pic.line.width = Pt(1.25)
    return pic


def notes(slide, text):
    slide.notes_slide.notes_text_frame.text = text


def divider(prs, number, title, subtitle, page):
    s = blank(prs)
    circuit(s, accent=MAGENTA)
    # grand numéro en filigrane
    tf = textbox(s, Inches(0.62), Inches(1.85), Inches(4.4), Inches(2.4))
    para(tf, f"0{number}", size=110, bold=True, color=RGBColor(0x2A, 0x1F, 0x8A), first=True)
    tf2 = textbox(s, Inches(3.35), Inches(2.62), Inches(9.0), Inches(2.0))
    para(tf2, title, size=44, bold=True, color=WHITE, first=True)
    para(tf2, subtitle, size=17, color=CYAN, space_before=10)
    line = s.shapes.add_connector(1, Inches(3.4), Inches(4.5), Inches(8.4), Inches(4.5))
    line.line.color.rgb = YELLOW
    line.line.width = Pt(2.5)
    footer(s, page)
    return s


# --------------------------------------------------------------------------
# Construction du support
# --------------------------------------------------------------------------


def build(out_path: Path):
    prs = new_deck()
    page = 0

    # ---------------------------------------------------------------- 1
    s = blank(prs)
    circuit(s, accent=YELLOW)
    tf = textbox(s, Inches(1.6), Inches(2.75), Inches(10.1), Inches(2.0))
    para(tf, "Veuillez garder le silence", size=40, bold=True, color=WHITE, first=True, align=PP_ALIGN.CENTER)
    para(tf, "et éteindre votre téléphone", size=40, bold=True, color=YELLOW, space_before=12, align=PP_ALIGN.CENTER)
    notes(s, "[0:00] Attendre le silence dans la salle. Ne rien dire pendant 5 secondes. Poser la question : « Puis-je commencer ? »")
    page += 1

    # ---------------------------------------------------------------- 2 — Titre
    s = blank(prs)
    circuit(s)
    picture(s, "logo_uf.jpeg", Inches(0.75), Inches(0.45), Inches(0.95), frame=False)
    picture(s, "logo_eni.jpeg", Inches(1.95), Inches(0.45), Inches(0.95), frame=False)

    tf = textbox(s, Inches(1.1), Inches(1.95), Inches(11.2), Inches(1.0))
    para(
        tf,
        "MÉMOIRE DE FIN D'ÉTUDES POUR L'OBTENTION DU DIPLÔME DE MASTER PROFESSIONNEL",
        size=14,
        bold=True,
        color=SOFT,
        first=True,
        align=PP_ALIGN.CENTER,
    )
    para(
        tf,
        "Mention Informatique  ·  Parcours Informatique Générale",
        size=12,
        color=MUTED,
        space_before=4,
        align=PP_ALIGN.CENTER,
    )

    tf = textbox(s, Inches(0.9), Inches(3.05), Inches(11.6), Inches(1.7))
    para(
        tf,
        "CONCEPTION ET RÉALISATION D'UN SYSTÈME",
        size=27,
        bold=True,
        color=YELLOW,
        first=True,
        align=PP_ALIGN.CENTER,
    )
    para(
        tf,
        "GÉODÉCISIONNEL MULTI-RISQUES POUR LA VEILLE CLIMATIQUE",
        size=27,
        bold=True,
        color=YELLOW,
        space_before=2,
        align=PP_ALIGN.CENTER,
    )
    para(tf, "À MADAGASCAR", size=27, bold=True, color=YELLOW, space_before=2, align=PP_ALIGN.CENTER)

    tf = textbox(s, Inches(1.0), Inches(5.35), Inches(11.4), Inches(1.2))
    para(tf, "Présenté par", size=11, color=MUTED, first=True, align=PP_ALIGN.CENTER)
    para(tf, "Monsieur ANJAR Omega", size=19, bold=True, color=WHITE, space_before=2, align=PP_ALIGN.CENTER)
    para(tf, "Année universitaire 2025 – 2026", size=11, color=MUTED, space_before=6, align=PP_ALIGN.CENTER)
    notes(
        s,
        "[0:20] « Monsieur le Président, Madame et Messieurs les membres du jury, bonjour. "
        "Je suis Omega ANJAR, étudiant en Master II Informatique à l'École Nationale d'Informatique de Fianarantsoa. "
        "Je vais vous présenter mon projet de fin d'études : la conception et la réalisation d'un système "
        "géodécisionnel multi-risques pour la veille climatique à Madagascar. »",
    )
    page += 1

    # ---------------------------------------------------------------- 3 — Remerciements
    s = blank(prs)
    circuit(s, accent=MAGENTA)
    ribbon(s, "Remerciements")
    tf = textbox(s, Inches(1.35), Inches(1.75), Inches(10.7), Inches(4.4))
    para(tf, "Mes sincères remerciements à :", size=15, color=CYAN, first=True, bold=True)
    for item in [
        "Monsieur le Président de l'Université de Fianarantsoa",
        "Monsieur le Directeur de l'École Nationale d'Informatique",
        "Madame et Messieurs les membres du jury",
        "Mes enseignants et l'ensemble du personnel de l'ENI",
        "Ma famille et mes amis",
    ]:
        para(tf, "▸   " + item, size=17, color=WHITE, space_before=13)
    notes(s, "[0:45] Lire la liste sans s'attarder, 25 secondes maximum. Terminer par : « Je vous remercie de votre attention. »")
    footer(s, page)
    page += 1

    # ---------------------------------------------------------------- 4 — Sommaire
    s = blank(prs)
    circuit(s)
    ribbon(s, "Sommaire")
    items = [
        ("Présentation", "Contexte et objectifs", CYAN),
        ("Analyse et conception", "Existant, solutions, modèles", YELLOW),
        ("Réalisation", "Architecture et technologies", GREEN),
        ("Démonstration", "Résultats et perspectives", MAGENTA),
    ]
    x = Inches(0.85)
    for i, (title, sub, col) in enumerate(items, start=1):
        box = s.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE, x, Inches(2.35), Inches(2.85), Inches(3.1)
        )
        box.fill.solid()
        box.fill.fore_color.rgb = NAVY_2
        box.line.color.rgb = RGBColor(0x3A, 0x2E, 0x9B)
        box.shadow.inherit = False
        circle_num(s, x + Inches(0.25), Inches(2.6), i, color=col)
        tf = box.text_frame
        tf.word_wrap = True
        tf.margin_left = Inches(0.22)
        tf.margin_right = Inches(0.18)
        tf.margin_top = Inches(1.15)
        para(tf, title, size=17, bold=True, color=WHITE, first=True)
        para(tf, sub, size=11.5, color=MUTED, space_before=8)
        x += Inches(3.05)
    notes(
        s,
        "[1:10] « Ma présentation s'articule en quatre parties : d'abord le contexte et les objectifs, "
        "puis l'analyse et la conception, ensuite la réalisation, et enfin la démonstration avec les résultats. »",
    )
    footer(s, page)
    page += 1

    # ---------------------------------------------------------------- 5 — Divider 1
    divider(prs, 1, "Présentation", "Contexte, problématique et objectifs", page)
    notes(prs.slides[-1], "[1:30] Transition courte, 5 secondes.")
    page += 1

    # ---------------------------------------------------------------- 6 — ENI
    s = blank(prs)
    circuit(s)
    ribbon(s, "Présentation de l'ENI")
    picture(s, "logo_eni.jpeg", Inches(0.65), Inches(1.65), Inches(1.5), frame=False)

    tf = textbox(s, Inches(0.65), Inches(3.3), Inches(2.5), Inches(1.1))
    para(tf, "École Nationale\nd'Informatique", size=13, bold=True, color=WHITE, first=True, align=PP_ALIGN.CENTER)
    para(tf, "Université de Fianarantsoa", size=9.5, color=CYAN, space_before=3, align=PP_ALIGN.CENTER)

    tf = textbox(s, Inches(3.3), Inches(1.55), Inches(9.3), Inches(0.5))
    para(tf, "Historique", size=16, bold=True, color=YELLOW, first=True)

    line = s.shapes.add_connector(1, Inches(3.75), Inches(2.52), Inches(12.35), Inches(2.52))
    line.line.color.rgb = RGBColor(0x3A, 0x2E, 0x9B)
    line.line.width = Pt(2)

    steps = [
        ("1983", "Création", "Décret n° 83-185"),
        ("1986", "École\nd'ingénieur", "Formation d'ingénieur"),
        ("2007", "Système LMD", "Parcours ASR et GB"),
        ("2023", "Intelligence\nartificielle", "Adaptation aux nouvelles technologies"),
    ]
    x = Inches(3.6)
    for year, title, detail in steps:
        c = s.shapes.add_shape(MSO_SHAPE.OVAL, x, Inches(2.19), Inches(0.66), Inches(0.66))
        c.fill.solid()
        c.fill.fore_color.rgb = NAVY
        c.line.color.rgb = CYAN
        c.line.width = Pt(2)
        c.shadow.inherit = False
        ctf = c.text_frame
        ctf.margin_left = 0
        ctf.margin_right = 0
        ctf.margin_top = 0
        ctf.margin_bottom = 0
        ctf.vertical_anchor = MSO_ANCHOR.MIDDLE
        cp = ctf.paragraphs[0]
        cp.alignment = PP_ALIGN.CENTER
        cr = cp.add_run()
        cr.text = year
        cr.font.size = Pt(10)
        cr.font.bold = True
        cr.font.name = FONT
        cr.font.color.rgb = YELLOW

        tf = textbox(s, x - Inches(0.22), Inches(3.0), Inches(1.95), Inches(1.5))
        para(tf, title, size=12, bold=True, color=WHITE, first=True)
        para(tf, detail, size=9.5, color=MUTED, space_before=2)
        x += Inches(2.28)

    tf = textbox(s, Inches(3.3), Inches(4.55), Inches(5.4), Inches(2.0))
    para(tf, "Mention Informatique", size=14, bold=True, color=CYAN, first=True)
    for item in ["Administration Système et Réseaux (ASR)", "Génie Logiciel et Base de Données (GB)", "Informatique Générale (IG)"]:
        para(tf, "▸  " + item, size=11.5, color=WHITE, space_before=6)

    tf = textbox(s, Inches(8.4), Inches(4.55), Inches(4.4), Inches(2.0))
    para(tf, "Mention Intelligence Artificielle", size=14, bold=True, color=CYAN, first=True)
    for item in ["Gouvernance et Ingénierie de Données (GID)", "Objets connectés et Cybersécurité (OCC)"]:
        para(tf, "▸  " + item, size=11.5, color=WHITE, space_before=6)
    notes(s, "[1:40] « L'ENI, créée en 1983 par décret, est devenue école d'ingénieur en 1986, "
              "puis a adopté le système LMD en 2007 et ouvert la filière intelligence artificielle en 2023. "
              "Je suis le parcours Informatique Générale. »")
    footer(s, page)
    page += 1

    # ---------------------------------------------------------------- 7 — Contexte
    s = blank(prs)
    circuit(s, accent=ORANGE)
    ribbon(s, "Contexte et problématique")
    cards = [
        ("ALÉAS", "5", "types de risques suivis", ORANGE),
        ("TERRITOIRE", "22", "régions à couvrir", CYAN),
        ("DONNÉES", "8", "sources hétérogènes", GREEN),
        ("PROFILS D'USAGE", "3", "décideur, analyste, administrateur", MAGENTA),
    ]
    x = Inches(0.7)
    for title, value, cap, col in cards:
        card(s, x, Inches(1.6), Inches(2.85), Inches(1.75), title, value, cap, accent=col)
        x += Inches(3.05)

    bullets(
        s,
        [
            ("Un territoire exposé à des aléas multiples", "inondation, sécheresse, cyclone, glissement de terrain"),
            ("Une donnée disponible, mais dispersée", "satellites, recensements, relevés météo, archives cycloniques"),
            ("Des décisions prises sans vision consolidée", "pas d'indicateur commun, pas de suivi temporel, pas d'alerte"),
        ],
        Inches(0.75),
        Inches(3.75),
        Inches(11.9),
        Inches(2.6),
        size=16,
    )
    notes(
        s,
        "[2:10] « Madagascar est frappée chaque année par plusieurs aléas climatiques simultanés. "
        "Les données existent : les satellites mesurent la pluie, les recensements localisent la population. "
        "Mais elles restent dispersées, dans des formats incompatibles, et les décisions se prennent sans vision consolidée. "
        "C'est ce constat qui fonde le projet. »",
    )
    footer(s, page)
    page += 1

    # ---------------------------------------------------------------- 8 — Objectifs
    s = blank(prs)
    circuit(s)
    ribbon(s, "Objectifs et périmètre")

    box = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.7), Inches(1.55), Inches(11.95), Inches(1.35))
    box.fill.solid()
    box.fill.fore_color.rgb = NAVY_2
    box.line.color.rgb = YELLOW
    box.line.width = Pt(1.5)
    box.shadow.inherit = False
    tf = box.text_frame
    tf.word_wrap = True
    tf.margin_left = Inches(0.3)
    tf.margin_top = Inches(0.15)
    para(tf, "OBJECTIF GÉNÉRAL", size=11, bold=True, color=YELLOW, first=True)
    para(
        tf,
        "Concevoir et réaliser un système géodécisionnel capable de transformer des données "
        "climatiques et territoriales hétérogènes en indicateurs de risque, alertes et rapports d'aide à la décision.",
        size=14.5,
        color=WHITE,
        space_before=6,
    )

    tf = textbox(s, Inches(0.75), Inches(3.2), Inches(6.0), Inches(3.2))
    para(tf, "Objectifs spécifiques", size=15, bold=True, color=CYAN, first=True)
    for i, item in enumerate(
        [
            "Collecter et homogénéiser 8 sources de données",
            "Calculer 5 indices de risque sur 1 565 zones",
            "Structurer un entrepôt de données spatial",
            "Pondérer les critères par la méthode AHP",
            "Générer des alertes et des rapports automatiques",
        ],
        start=1,
    ):
        para(tf, f"{i}.  {item}", size=13, color=WHITE, space_before=9)

    tf = textbox(s, Inches(7.1), Inches(3.2), Inches(5.4), Inches(3.2))
    para(tf, "Périmètre fonctionnel", size=15, bold=True, color=CYAN, first=True)
    for item in [
        "Cartographie interactive multi-couches",
        "Analyse multicritère et exploration SOLAP",
        "Supervision des alertes climatiques",
        "Rapports décisionnels PDF, Excel, CSV",
        "Trois profils : administrateur, analyste, décideur",
    ]:
        para(tf, "▸  " + item, size=13, color=WHITE, space_before=9)
    notes(
        s,
        "[2:45] « L'objectif général est de transformer une donnée hétérogène en décision. "
        "Cinq objectifs spécifiques en découlent, et le périmètre couvre cinq fonctions : cartographie, analyse multicritère, "
        "alertes, rapports et gestion des accès. »",
    )
    footer(s, page)
    page += 1

    # ---------------------------------------------------------------- 9 — Divider 2
    divider(prs, 2, "Analyse et conception", "Existant, solutions, modèles et architecture", page)
    notes(prs.slides[-1], "[3:00] Transition, 5 secondes.")
    page += 1

    # ---------------------------------------------------------------- 10 — Méthodologie
    s = blank(prs)
    circuit(s)
    ribbon(s, "Méthodologie et outils de conception")

    tf = textbox(s, Inches(0.75), Inches(1.55), Inches(11.9), Inches(0.6))
    para(
        tf,
        "Une démarche en cinq temps, du constat à la validation :",
        size=14,
        color=CYAN,
        first=True,
    )

    steps = [
        ("Analyse\npréalable", "étude de l'existant\net des besoins", CYAN),
        ("Modélisation", "UML : cas d'usage,\nclasses, séquences", YELLOW),
        ("Conception\nde l'entrepôt", "modèle en étoile,\nfaits et dimensions", GREEN),
        ("Implémentation", "pipeline ETL,\nAPI, interface web", ORANGE),
        ("Validation", "recette fonctionnelle\net cohérence des calculs", MAGENTA),
    ]
    x = Inches(0.62)
    for i, (title, sub, col) in enumerate(steps, start=1):
        box = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, Inches(2.35), Inches(2.28), Inches(2.05))
        box.fill.solid()
        box.fill.fore_color.rgb = NAVY_2
        box.line.color.rgb = RGBColor(0x3A, 0x2E, 0x9B)
        box.shadow.inherit = False
        bar = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, Inches(2.35), Inches(2.28), Inches(0.06))
        bar.fill.solid()
        bar.fill.fore_color.rgb = col
        bar.line.fill.background()
        circle_num(s, x + Inches(0.14), Inches(2.52), i, color=col, size=Inches(0.36))
        tf = box.text_frame
        tf.word_wrap = True
        tf.margin_left = Inches(0.15)
        tf.margin_right = Inches(0.12)
        tf.margin_top = Inches(1.0)
        para(tf, title, size=12.5, bold=True, color=WHITE, first=True, align=PP_ALIGN.CENTER)
        para(tf, sub, size=9.5, color=MUTED, space_before=5, align=PP_ALIGN.CENTER)
        x += Inches(2.5)

    tf = textbox(s, Inches(0.75), Inches(4.75), Inches(11.9), Inches(1.6))
    para(tf, "Outils", size=15, bold=True, color=YELLOW, first=True)
    para(
        tf,
        "Visual Paradigm pour la modélisation UML  ·  PostgreSQL / PostGIS pour le stockage spatial  ·  "
        "Python et GDAL pour le traitement raster  ·  NestJS et React pour l'application  ·  Git pour le versionnement",
        size=13,
        color=WHITE,
        space_before=8,
    )
    notes(
        s,
        "[3:15] « La conduite du projet s'est appuyée sur une démarche en cinq temps : analyse préalable, modélisation UML, "
        "conception de l'entrepôt, implémentation, puis validation. Les outils sont Visual Paradigm pour l'UML, "
        "PostgreSQL et PostGIS pour le stockage spatial, Python et GDAL pour le traitement des rasters, "
        "et NestJS avec React pour l'application. »\n\n"
        "RÉSERVE : si le mémoire nomme explicitement 2TUP ou Scrum, remplacer cette phrase par le nom du processus retenu.",
    )
    footer(s, page)
    page += 1

    # ---------------------------------------------------------------- 11 — Existant
    s = blank(prs)
    circuit(s, accent=RED)
    ribbon(s, "Analyse de l'existant")

    tf = textbox(s, Inches(0.75), Inches(1.55), Inches(11.9), Inches(0.55))
    para(tf, "Un traitement manuel, séquentiel et non reproductible :", size=14, color=CYAN, first=True)

    chain = [
        ("Collecte\nmanuelle", "téléchargement\nsource par source"),
        ("Retraitement\nsous tableur", "copier-coller,\nformats hétérogènes"),
        ("Calcul\nnon tracé", "formules locales,\naucune version"),
        ("Cartographie\nponctuelle", "un seul aléa\nà la fois"),
        ("Rapport\nfigé", "non actualisable"),
    ]
    x = Inches(0.7)
    for i, (title, sub) in enumerate(chain, start=1):
        box = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, Inches(2.2), Inches(2.15), Inches(1.9))
        box.fill.solid()
        box.fill.fore_color.rgb = NAVY_2
        box.line.color.rgb = RGBColor(0x5A, 0x2E, 0x6B)
        box.shadow.inherit = False
        tf = box.text_frame
        tf.word_wrap = True
        tf.margin_left = Inches(0.12)
        tf.margin_right = Inches(0.1)
        tf.margin_top = Inches(0.2)
        para(tf, title, size=13, bold=True, color=WHITE, first=True, align=PP_ALIGN.CENTER)
        para(tf, sub, size=10, color=MUTED, space_before=6, align=PP_ALIGN.CENTER)
        if i < len(chain):
            ar = s.shapes.add_shape(MSO_SHAPE.RIGHT_ARROW, x + Inches(2.2), Inches(3.0), Inches(0.3), Inches(0.25))
            ar.fill.solid()
            ar.fill.fore_color.rgb = RED
            ar.line.fill.background()
        x += Inches(2.5)

    tf = textbox(s, Inches(0.75), Inches(4.35), Inches(11.9), Inches(2.0))
    para(tf, "Limites constatées", size=15, bold=True, color=RED, first=True)
    for item in [
        "Aucune consolidation entre les aléas : chaque risque est traité isolément",
        "Aucune traçabilité : impossible de rejouer un calcul ni de vérifier un résultat",
        "Aucune réactivité : le délai entre l'observation et la décision se compte en jours",
    ]:
        para(tf, "▸  " + item, size=13.5, color=WHITE, space_before=8)
    notes(
        s,
        "[3:50] « Aujourd'hui, la chaîne est manuelle : on télécharge les sources une par une, on retraite sous tableur, "
        "on calcule sans trace, on cartographie un seul aléa à la fois, et le rapport produit est figé. "
        "Trois limites en découlent : pas de consolidation, pas de traçabilité, pas de réactivité. »",
    )
    footer(s, page)
    page += 1

    # ---------------------------------------------------------------- 12 — Solutions
    s = blank(prs)
    circuit(s)
    ribbon(s, "Proposition de solutions")

    solutions = [
        ("Solution 1", "Poursuivre avec le tableur", ["Coût nul", "Maîtrise immédiate"], ["Non consolidée", "Non traçable", "Non automatisable"], False),
        ("Solution 2", "Acquérir une solution commerciale", ["Fonctions complètes", "Support éditeur"], ["Coût élevé", "Non adaptée au contexte local", "Données non maîtrisées"], False),
        ("Solution 3", "Développer un système sur mesure", ["Adapté au territoire", "Sources ouvertes", "Traçabilité complète", "Extensible"], ["Effort de développement"], True),
    ]
    x = Inches(0.7)
    for title, name, pros, cons, chosen in solutions:
        border = GREEN if chosen else RGBColor(0x3A, 0x2E, 0x9B)
        box = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, Inches(1.55), Inches(3.75), Inches(4.35))
        box.fill.solid()
        box.fill.fore_color.rgb = NAVY_2 if not chosen else RGBColor(0x0F, 0x3F, 0x3B)
        box.line.color.rgb = border
        box.line.width = Pt(2.5 if chosen else 1)
        box.shadow.inherit = False

        tf = box.text_frame
        tf.word_wrap = True
        tf.margin_left = Inches(0.22)
        tf.margin_right = Inches(0.18)
        tf.margin_top = Inches(0.2)
        para(tf, title, size=11, bold=True, color=GREEN if chosen else MUTED, first=True, align=PP_ALIGN.CENTER)
        para(tf, name, size=14.5, bold=True, color=WHITE, space_before=4, align=PP_ALIGN.CENTER)

        para(tf, "Atouts", size=11, bold=True, color=GREEN, space_before=14)
        for pr in pros:
            para(tf, "▸  " + pr, size=11.5, color=WHITE, space_before=3)
        para(tf, "Limites", size=11, bold=True, color=RED, space_before=12)
        for co in cons:
            para(tf, "▸  " + co, size=11.5, color=MUTED, space_before=3)

        if chosen:
            badge = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x + Inches(0.98), Inches(6.08), Inches(1.8), Inches(0.42))
            badge.fill.solid()
            badge.fill.fore_color.rgb = GREEN
            badge.line.fill.background()
            tf = badge.text_frame
            tf.margin_top = 0
            tf.margin_bottom = 0
            tf.vertical_anchor = MSO_ANCHOR.MIDDLE
            p = tf.paragraphs[0]
            p.alignment = PP_ALIGN.CENTER
            r = p.add_run()
            r.text = "RETENUE"
            r.font.size = Pt(12)
            r.font.bold = True
            r.font.name = FONT
            r.font.color.rgb = NAVY
        x += Inches(4.0)
    notes(
        s,
        "[4:35] « Trois options ont été comparées. Poursuivre avec le tableur : coût nul, mais aucune consolidation ni traçabilité. "
        "Acquérir une solution commerciale : complète, mais coûteuse et inadaptée au découpage administratif malgache. "
        "Développer un système sur mesure : c'est la solution retenue, parce qu'elle s'adapte au territoire, "
        "s'appuie sur des sources ouvertes et garantit la traçabilité des calculs. »",
    )
    footer(s, page)
    page += 1

    # ---------------------------------------------------------------- 13 — Chaîne
    s = blank(prs)
    circuit(s, accent=GREEN)
    ribbon(s, "Architecture fonctionnelle")
    tf = textbox(s, Inches(0.75), Inches(1.5), Inches(11.9), Inches(0.5))
    para(tf, "Une chaîne en cinq maillons, de la donnée brute à la décision :", size=14, color=CYAN, first=True)

    stages = [
        ("1. DONNÉES", "8 sources\nsatellitaires, climatiques\net territoriales", CYAN),
        ("2. ETL", "téléchargement, nettoyage\nalignement sur Madagascar\nchargement en base", YELLOW),
        ("3. ANALYSE", "calcul multicritère\nstatistiques zonales\nentrepôt en étoile", GREEN),
        ("4. RÉSULTATS", "cartes, indicateurs\nalertes, séries\ntemporelles", ORANGE),
        ("5. DÉCISION", "zones prioritaires\nrapports\nappui à l'action", MAGENTA),
    ]
    x = Inches(0.62)
    for i, (title, sub, col) in enumerate(stages):
        box = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, Inches(2.15), Inches(2.3), Inches(2.3))
        box.fill.solid()
        box.fill.fore_color.rgb = NAVY_2
        box.line.color.rgb = col
        box.line.width = Pt(1.5)
        box.shadow.inherit = False
        tf = box.text_frame
        tf.word_wrap = True
        tf.margin_left = Inches(0.14)
        tf.margin_right = Inches(0.12)
        tf.margin_top = Inches(0.18)
        para(tf, title, size=14, bold=True, color=col, first=True, align=PP_ALIGN.CENTER)
        para(tf, sub, size=10.5, color=WHITE, space_before=8, align=PP_ALIGN.CENTER)
        if i < len(stages) - 1:
            ar = s.shapes.add_shape(MSO_SHAPE.RIGHT_ARROW, x + Inches(2.34), Inches(3.15), Inches(0.26), Inches(0.3))
            ar.fill.solid()
            ar.fill.fore_color.rgb = CYAN
            ar.line.fill.background()
        x += Inches(2.52)

    tf = textbox(s, Inches(0.75), Inches(4.8), Inches(11.9), Inches(1.5))
    para(
        tf,
        "Chaque maillon est déclenché et traçable : les sources sont horodatées, les calculs conservés, "
        "les résultats versionnés dans l'entrepôt. Aucune étape n'est manuelle dans la production des indicateurs.",
        size=14,
        color=WHITE,
        first=True,
    )
    notes(
        s,
        "[5:20] « La réponse est une chaîne en cinq maillons. Les données sont collectées, transformées, analysées, restituées, "
        "puis transformées en décision. Ce qui change par rapport à l'existant, c'est que chaque maillon est traçable "
        "et qu'aucune étape n'est manuelle. »",
    )
    footer(s, page)
    page += 1

    # ---------------------------------------------------------------- 14 — Schéma en étoile
    s = blank(prs)
    circuit(s)
    ribbon(s, "Modèle de données : schéma en étoile")

    tf = textbox(s, Inches(0.75), Inches(1.5), Inches(11.9), Inches(0.5))
    para(tf, "Un fait central, cinq dimensions, deux faits complémentaires :", size=14, color=CYAN, first=True)

    # centre
    center = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(5.05), Inches(3.0), Inches(3.2), Inches(1.5))
    center.fill.solid()
    center.fill.fore_color.rgb = YELLOW
    center.line.fill.background()
    center.shadow.inherit = False
    tf = center.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    para(tf, "FAIT CENTRAL : INDICATEURS DE RISQUE", size=11, bold=True, color=NAVY, first=True, align=PP_ALIGN.CENTER)
    para(tf, "7 825 lignes", size=17, bold=True, color=NAVY, space_before=4, align=PP_ALIGN.CENTER)
    para(tf, "1 565 zones × 5 aléas", size=9.5, color=NAVY, space_before=2, align=PP_ALIGN.CENTER)

    dims = [
        ("DIM_ZONE", "1 565 zones", Inches(1.15), Inches(1.95), CYAN),
        ("DIM_RISK_TYPE", "5 aléas", Inches(9.35), Inches(1.95), ORANGE),
        ("DIM_TIME", "46 périodes", Inches(1.15), Inches(5.15), GREEN),
        ("DIM_DATA_SOURCE", "8 sources", Inches(9.35), Inches(5.15), MAGENTA),
    ]
    for name, detail, left, top, col in dims:
        box = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, Inches(2.85), Inches(0.95))
        box.fill.solid()
        box.fill.fore_color.rgb = NAVY_2
        box.line.color.rgb = col
        box.line.width = Pt(2)
        box.shadow.inherit = False
        tf = box.text_frame
        tf.word_wrap = True
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE
        para(tf, name, size=12.5, bold=True, color=col, first=True, align=PP_ALIGN.CENTER)
        para(tf, detail, size=10.5, color=WHITE, space_before=2, align=PP_ALIGN.CENTER)

    lines = [
        (Inches(4.0), Inches(2.45), Inches(5.15), Inches(3.3)),
        (Inches(9.35), Inches(2.45), Inches(8.15), Inches(3.3)),
        (Inches(4.0), Inches(5.6), Inches(5.15), Inches(4.2)),
        (Inches(9.35), Inches(5.6), Inches(8.15), Inches(4.2)),
    ]
    for x1, y1, x2, y2 in lines:
        ln = s.shapes.add_connector(1, x1, y1, x2, y2)
        ln.line.color.rgb = RGBColor(0x4A, 0x3E, 0xAB)
        ln.line.width = Pt(1.75)

    tf = textbox(s, Inches(4.4), Inches(4.75), Inches(4.5), Inches(0.9))
    para(tf, "FACT_CLIMATE_OBSERVATION  ·  616", size=10.5, color=MUTED, first=True, align=PP_ALIGN.CENTER)
    para(tf, "FACT_RASTER_PROCESSING  ·  19", size=10.5, color=MUTED, space_before=2, align=PP_ALIGN.CENTER)
    notes(
        s,
        "[5:55] « Les résultats sont structurés dans un entrepôt en étoile. Au centre, la table de faits des indicateurs de risque, "
        "7 825 lignes, soit 1 565 zones multipliées par 5 aléas. Autour, quatre dimensions : la zone administrative, le type de risque, "
        "le temps et la source de données. Deux tables de faits complètent le dispositif : les observations climatiques et les traitements raster. »",
    )
    footer(s, page)
    page += 1

    # ---------------------------------------------------------------- 15 — AHP
    s = blank(prs)
    circuit(s, accent=YELLOW)
    ribbon(s, "Pondération des critères : méthode AHP")

    tf = textbox(s, Inches(0.75), Inches(1.5), Inches(5.6), Inches(0.5))
    para(tf, "Principe", size=15, bold=True, color=YELLOW, first=True)
    bullets(
        s,
        [
            "Comparaison des critères deux à deux sur l'échelle de Saaty (1 à 9 et inverses)",
            "Extraction du vecteur propre : les poids normalisés",
            "Contrôle de cohérence par le ratio CR, seuil de 0,10",
        ],
        Inches(0.75),
        Inches(2.0),
        Inches(5.7),
        Inches(2.2),
        size=12.5,
    )

    tf = textbox(s, Inches(0.75), Inches(4.15), Inches(5.6), Inches(0.5))
    para(tf, "Séparation aléa / risque", size=15, bold=True, color=YELLOW, first=True)
    para(
        tf,
        "L'aléa mesure le phénomène physique ; le risque intègre la vulnérabilité du sol et l'exposition de la population. "
        "Les deux familles sont pondérées séparément, puis combinées.",
        size=12,
        color=WHITE,
        space_before=6,
    )

    card(s, Inches(6.65), Inches(1.6), Inches(2.85), Inches(1.6), "RATIO DE COHÉRENCE", "0,00 %", "seuil admissible : 10 %", accent=GREEN)
    card(s, Inches(9.65), Inches(1.6), Inches(2.85), Inches(1.6), "VALEUR PROPRE MAX.", "λmax = 3", "matrice 3 × 3 cohérente", accent=CYAN)

    picture(s, "c_ahp.png", Inches(6.65), Inches(3.45), Inches(5.85), Inches(3.05))

    notes(
        s,
        "[6:35] « La pondération des critères repose sur la méthode AHP de Saaty. Les critères sont comparés deux à deux, "
        "ce qui produit une matrice, dont on extrait le vecteur propre : les poids. Le système vérifie ensuite la cohérence "
        "du jugement par le ratio CR. Ici, CR vaut zéro pour cent : la matrice est parfaitement cohérente. "
        "Point important : l'aléa et le risque sont pondérés séparément, parce que l'aléa est le phénomène physique "
        "et que le risque intègre la vulnérabilité et l'exposition. »",
    )
    footer(s, page)
    page += 1

    # ---------------------------------------------------------------- 16 — Divider 3
    divider(prs, 3, "Réalisation", "Architecture technique et livrables", page)
    notes(prs.slides[-1], "[7:10] Transition, 5 secondes.")
    page += 1

    # ---------------------------------------------------------------- 17 — Architecture technique
    s = blank(prs)
    circuit(s, accent=GREEN)
    ribbon(s, "Architecture technique")

    tiers = [
        ("PRÉSENTATION", "React · TypeScript · Tailwind\nLeaflet · Recharts", CYAN),
        ("MÉTIER", "NestJS · API REST · JWT\nWebSocket · moteur AHP", YELLOW),
        ("TRAITEMENT", "Python · GDAL · rasterio\npipeline ETL", ORANGE),
        ("DONNÉES", "PostgreSQL · PostGIS\nentrepôt en étoile · MinIO", GREEN),
    ]
    y = Inches(1.6)
    for name, detail, col in tiers:
        box = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.7), y, Inches(6.4), Inches(1.1))
        box.fill.solid()
        box.fill.fore_color.rgb = NAVY_2
        box.line.color.rgb = col
        box.line.width = Pt(1.5)
        box.shadow.inherit = False
        tf = box.text_frame
        tf.word_wrap = True
        tf.margin_left = Inches(0.22)
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE
        para(tf, name, size=13, bold=True, color=col, first=True)
        para(tf, detail, size=11, color=WHITE, space_before=2)
        y += Inches(1.25)

    card(s, Inches(7.55), Inches(1.6), Inches(2.4), Inches(1.55), "TABLES", "19", "modèle applicatif", accent=CYAN)
    card(s, Inches(10.15), Inches(1.6), Inches(2.4), Inches(1.55), "COUCHES RASTER", "19", "actives en base", accent=GREEN)
    card(s, Inches(7.55), Inches(3.35), Inches(2.4), Inches(1.55), "SCRIPTS ETL", "11", "étapes de pipeline", accent=ORANGE)
    card(s, Inches(10.15), Inches(3.35), Inches(2.4), Inches(1.55), "SOURCES", "8", "dont 7 connectées", accent=MAGENTA)

    tf = textbox(s, Inches(7.55), Inches(5.15), Inches(5.0), Inches(1.5))
    para(
        tf,
        "Quatre couches découplées : l'interface ne parle jamais directement à la base, "
        "et le traitement lourd s'exécute hors du chemin de la requête utilisateur.",
        size=12,
        color=WHITE,
        first=True,
    )
    notes(
        s,
        "[7:20] « L'architecture est organisée en quatre couches. La présentation en React avec Leaflet pour la carte. "
        "La couche métier en NestJS, avec une API REST sécurisée par jeton. La couche de traitement en Python, "
        "qui exécute le pipeline ETL et les calculs raster. Et la couche de données : PostgreSQL avec l'extension PostGIS, "
        "l'entrepôt en étoile, et un stockage objet pour les rapports. »",
    )
    footer(s, page)
    page += 1

    # ---------------------------------------------------------------- 18 — Livrables
    s = blank(prs)
    circuit(s)
    ribbon(s, "Livrables et volumétrie")

    data = [
        ("ZONES COUVERTES", "1 565", "22 régions · 110 districts · 1 433 communes", CYAN),
        ("INDICATEURS DE RISQUE", "7 825", "5 aléas × 1 565 zones", ORANGE),
        ("OBSERVATIONS CLIMATIQUES", "616", "22 régions × 28 jours", GREEN),
        ("POPULATION EXPOSÉE", "27,6 M", "hab. croisement WorldPop × aléas", MAGENTA),
    ]
    x = Inches(0.7)
    for title, value, cap, col in data:
        card(s, x, Inches(1.55), Inches(2.85), Inches(1.85), title, value, cap, accent=col)
        x += Inches(3.05)

    picture(s, "c_dash.png", Inches(0.7), Inches(3.65), Inches(5.6), Inches(2.95))

    tf = textbox(s, Inches(6.65), Inches(3.65), Inches(5.9), Inches(3.0))
    para(tf, "Ce que produit le système", size=15, bold=True, color=YELLOW, first=True)
    for item in [
        ("5 indices de risque", "normalisés sur 100, par zone et par aléa"),
        ("Une classification en 4 classes", "faible, moyen, élevé, critique"),
        ("Des signaux opérationnels", "risque de fond pondéré par la météo du jour"),
        ("Des alertes hiérarchisées", "seuils et statuts de traitement"),
        ("Des rapports décisionnels", "PDF, Excel et CSV"),
    ]:
        main, detail = item
        para(tf, "▸  " + main, size=12.5, bold=True, color=WHITE, space_before=7)
        para(tf, "      " + detail, size=10.5, color=MUTED, space_before=1)
    notes(
        s,
        "[8:05] « En chiffres : 1 565 zones couvertes, 7 825 indicateurs de risque, 616 observations climatiques, "
        "et une population exposée de 27,6 millions d'habitants. Le système produit cinq indices normalisés sur 100, "
        "une classification en quatre classes, des signaux météo, des alertes et des rapports. »",
    )
    footer(s, page)
    page += 1

    # ---------------------------------------------------------------- 19 — Divider 4
    divider(prs, 4, "Démonstration", "Le système en fonctionnement", page)
    notes(prs.slides[-1], "[8:45] « Je passe maintenant à la démonstration. » — Lancer l'application AVANT de prononcer cette phrase si possible.")
    page += 1

    # ---------------------------------------------------------------- 20 — Parcours de démo
    s = blank(prs)
    circuit(s, accent=MAGENTA)
    ribbon(s, "Parcours de démonstration")

    tf = textbox(s, Inches(0.75), Inches(1.5), Inches(11.9), Inches(0.5))
    para(tf, "Cinq écrans, un fil conducteur : de la donnée à la décision.", size=14, color=CYAN, first=True)

    shots = [
        ("c_dash.png", "1. Tableau de bord", "indicateurs consolidés"),
        ("c_map.png", "2. Carte des risques", "lecture territoriale"),
        ("c_alerts.png", "3. Alertes", "supervision et traitement"),
        ("c_rapports.png", "4. Rapports", "restitution institutionnelle"),
    ]
    x = Inches(0.7)
    for name, title, sub in shots:
        box = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, Inches(2.25), Inches(2.95), Inches(3.05))
        box.fill.solid()
        box.fill.fore_color.rgb = NAVY_2
        box.line.color.rgb = RGBColor(0x3A, 0x2E, 0x9B)
        box.shadow.inherit = False
        picture(s, name, x + Inches(0.13), Inches(2.39), Inches(2.69), Inches(1.42))
        tf = textbox(s, x + Inches(0.16), Inches(3.95), Inches(2.72), Inches(1.1))
        para(tf, title, size=13, bold=True, color=WHITE, first=True)
        para(tf, sub, size=10, color=CYAN, space_before=3)
        x += Inches(3.05)

    tf = textbox(s, Inches(0.75), Inches(5.75), Inches(11.9), Inches(1.0))
    para(
        tf,
        "Durée : 4 minutes  ·  Chaque écran est commenté en une phrase, puis relié au suivant par une transition.",
        size=12,
        color=MUTED,
        first=True,
    )
    notes(
        s,
        "[8:50] « La démonstration suit quatre écrans : le tableau de bord pour les indicateurs consolidés, "
        "la carte pour la lecture territoriale, les alertes pour la supervision, et les rapports pour la restitution. »\n\n"
        "NE PAS faire : cliquer sur « Cyclone Démo », ouvrir le comparateur de périodes, télécharger le journal ETL.",
    )
    footer(s, page)
    page += 1

    # ---------------------------------------------------------------- 21 — Apports
    s = blank(prs)
    circuit(s, accent=GREEN)
    ribbon(s, "Apports et résultats")

    apports = [
        ("APPORT MÉTHODOLOGIQUE", ["Chaîne reproductible de la source à l'indicateur", "Pondération AHP documentée et contrôlée", "Traçabilité complète des calculs"], CYAN),
        ("APPORT TECHNIQUE", ["Entrepôt spatial en étoile", "Croisement raster × polygones administratifs", "API REST et interface cartographique unifiées"], YELLOW),
        ("APPORT OPÉRATIONNEL", ["Indicateurs comparables entre les 22 régions", "Alertes hiérarchisées par gravité", "Rapports directement transmissibles"], GREEN),
    ]
    x = Inches(0.7)
    for title, items, col in apports:
        box = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, Inches(1.65), Inches(3.85), Inches(3.3))
        box.fill.solid()
        box.fill.fore_color.rgb = NAVY_2
        box.line.color.rgb = col
        box.line.width = Pt(1.5)
        box.shadow.inherit = False
        bar = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, Inches(1.65), Inches(3.85), Inches(0.06))
        bar.fill.solid()
        bar.fill.fore_color.rgb = col
        bar.line.fill.background()
        tf = box.text_frame
        tf.word_wrap = True
        tf.margin_left = Inches(0.22)
        tf.margin_right = Inches(0.18)
        tf.margin_top = Inches(0.25)
        para(tf, title, size=11.5, bold=True, color=col, first=True)
        for it in items:
            para(tf, "▸  " + it, size=12.5, color=WHITE, space_before=11)
        x += Inches(4.05)

    tf = textbox(s, Inches(0.75), Inches(5.25), Inches(11.9), Inches(1.4))
    para(
        tf,
        "Le système ne remplace pas l'expertise : il réduit le délai entre le signal climatique et la décision publique.",
        size=15,
        bold=True,
        color=YELLOW,
        first=True,
        align=PP_ALIGN.CENTER,
    )
    notes(
        s,
        "[9:30] « Sur le plan méthodologique, la chaîne est reproductible et la pondération est contrôlée. "
        "Sur le plan technique, l'entrepôt spatial permet de croiser des rasters et des limites administratives. "
        "Sur le plan opérationnel, les 22 régions deviennent comparables et les rapports sont directement transmissibles. »",
    )
    footer(s, page)
    page += 1

    # ---------------------------------------------------------------- 22 — Conclusion
    s = blank(prs)
    circuit(s, accent=YELLOW)
    ribbon(s, "Conclusion et perspectives")

    tf = textbox(s, Inches(0.75), Inches(1.55), Inches(5.85), Inches(4.6))
    para(tf, "Ce qui a été réalisé", size=15, bold=True, color=GREEN, first=True)
    for item in [
        "Un système complet, de la collecte à la décision",
        "Cinq modèles de risque opérationnels sur 1 565 zones",
        "Un entrepôt spatial interrogeable",
        "Une interface de supervision et de restitution",
    ]:
        para(tf, "▸  " + item, size=13, color=WHITE, space_before=10)

    tf = textbox(s, Inches(7.0), Inches(1.55), Inches(5.5), Inches(4.6))
    para(tf, "Perspectives", size=15, bold=True, color=YELLOW, first=True)
    for item in [
        "Enrichir la profondeur temporelle de l'entrepôt",
        "Automatiser l'ingestion cyclonique GDACS",
        "Étendre l'analyse aux districts et communes",
        "Ouvrir une API publique pour les partenaires",
        "Intégrer des scénarios de projection climatique",
    ]:
        para(tf, "▸  " + item, size=13, color=WHITE, space_before=10)

    notes(
        s,
        "[10:15] « En conclusion, le système couvre l'ensemble de la chaîne, avec cinq modèles opérationnels sur 1 565 zones. "
        "Les perspectives portent sur la profondeur temporelle, l'automatisation de la veille cyclonique, "
        "l'extension aux mailles inférieures et l'ouverture d'une API aux partenaires. »",
    )
    footer(s, page)
    page += 1

    # ---------------------------------------------------------------- 23 — Merci
    s = blank(prs)
    circuit(s, accent=CYAN)
    tf = textbox(s, Inches(1.5), Inches(2.6), Inches(10.3), Inches(2.2))
    para(tf, "Merci de votre attention", size=44, bold=True, color=WHITE, first=True, align=PP_ALIGN.CENTER)
    para(tf, "Je suis à votre disposition pour vos questions.", size=17, color=CYAN, space_before=16, align=PP_ALIGN.CENTER)
    line = s.shapes.add_connector(1, Inches(5.6), Inches(4.85), Inches(7.7), Inches(4.85))
    line.line.color.rgb = YELLOW
    line.line.width = Pt(3)
    notes(
        s,
        "[11:00] Laisser la dernière diapositive affichée pendant les questions. Ne pas revenir au sommaire.",
    )
    page += 1

    prs.save(str(out_path))
    return out_path, page


if __name__ == "__main__":
    target = Path(__file__).parent / "Soutenance_RISKCLIM-MG.pptx"
    path, count = build(target)
    print(f"OK -> {path} ({count} diapositives)")
