import os
import fitz
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY

PAGE_WIDTH, PAGE_HEIGHT = A4

def draw_decorations(canvas_obj, doc):
    canvas_obj.saveState()
    
    # 1. Header Background (Warm Soft Grey)
    header_h = 38 * mm
    canvas_obj.setFillColor(colors.HexColor('#DFE2DE'))
    canvas_obj.rect(0, PAGE_HEIGHT - header_h, PAGE_WIDTH, header_h, stroke=0, fill=1)
    
    # 2. Dark Green Top Left Accent / Photo container
    photo_w = 34 * mm
    photo_h = 34 * mm
    canvas_obj.setFillColor(colors.HexColor('#233D34')) # Dark forest green
    canvas_obj.rect(8 * mm, PAGE_HEIGHT - 36 * mm, photo_w, photo_h, stroke=0, fill=1)
    
    # Stylized Avatar silhouette
    canvas_obj.setFillColor(colors.HexColor('#2E4E42'))
    canvas_obj.circle(25 * mm, PAGE_HEIGHT - 19 * mm, 13 * mm, stroke=0, fill=1)
    canvas_obj.setFillColor(colors.HexColor('#DFE2DE'))
    canvas_obj.circle(25 * mm, PAGE_HEIGHT - 15 * mm, 5.5 * mm, stroke=0, fill=1)
    canvas_obj.ellipse(18 * mm, PAGE_HEIGHT - 31 * mm, 32 * mm, PAGE_HEIGHT - 21 * mm, stroke=0, fill=1)
    
    # 3. Top Right Dot Matrix (5 rows x 6 cols)
    canvas_obj.setFillColor(colors.HexColor('#4B5563'))
    start_x = PAGE_WIDTH - 28 * mm
    start_y = PAGE_HEIGHT - 7 * mm
    for row in range(5):
        for col in range(6):
            canvas_obj.circle(start_x + col * 3.5 * mm, start_y - row * 3.5 * mm, 0.55 * mm, stroke=0, fill=1)
            
    # 4. Header Name, Subtitle and Contact
    # Name
    canvas_obj.setFillColor(colors.HexColor('#111827'))
    canvas_obj.setFont('Helvetica-Bold', 18)
    canvas_obj.drawString(46 * mm, PAGE_HEIGHT - 14 * mm, 'Omega ANJARANIRINA')
    
    # Subtitle
    canvas_obj.setFillColor(colors.HexColor('#374151'))
    canvas_obj.setFont('Helvetica', 9.5)
    canvas_obj.drawString(46 * mm, PAGE_HEIGHT - 19.5 * mm, 'Étudiante en Master Informatique – Développement Fullstack')
    
    # Contact row 1
    canvas_obj.setFillColor(colors.HexColor('#1F2937'))
    canvas_obj.setFont('Helvetica', 7.2)
    contact_r1 = '📞 +261 38 39 481 20   |   ✉ anjaranirinaomega@gmail.com   |   📍 ISB118 3205 Soatsihadino Fianarantsoa'
    canvas_obj.drawString(46 * mm, PAGE_HEIGHT - 26 * mm, contact_r1)
    
    # Contact row 2
    contact_r2 = '💼 https://www.linkedin.com/in/omega-anjaranirina-85096a3b4   |   🐙 https://github.com/anjaranirina-omega'
    canvas_obj.drawString(46 * mm, PAGE_HEIGHT - 31 * mm, contact_r2)
    
    # 5. Bottom Left Dot Matrix (4 rows x 8 cols)
    start_x_bot = 8 * mm
    start_y_bot = 20 * mm
    for row in range(4):
        for col in range(8):
            canvas_obj.circle(start_x_bot + col * 3.5 * mm, start_y_bot - row * 3.5 * mm, 0.55 * mm, stroke=0, fill=1)
            
    # 6. Bottom Right Dark Green Bar
    canvas_obj.setFillColor(colors.HexColor('#233D34'))
    canvas_obj.rect(PAGE_WIDTH - 55 * mm, 7 * mm, 47 * mm, 8 * mm, stroke=0, fill=1)
    
    # 7. Separator line between Left and Right columns
    canvas_obj.setStrokeColor(colors.HexColor('#E5E7EB'))
    canvas_obj.setLineWidth(0.75)
    canvas_obj.line(135 * mm, 24 * mm, 135 * mm, PAGE_HEIGHT - header_h - 4 * mm)
    
    canvas_obj.restoreState()

def build_pdf():
    pdf_path = 'CV_Omega_ANJARANIRINA.pdf'
    
    # Main document body sits strictly below the 38mm header
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        leftMargin=8 * mm,
        rightMargin=8 * mm,
        topMargin=41 * mm,
        bottomMargin=8 * mm
    )
    
    styles = getSampleStyleSheet()
    
    COLOR_PRIMARY = colors.HexColor('#111827')
    COLOR_MUTED = colors.HexColor('#4B5563')
    
    # Styles
    sec_title = ParagraphStyle(
        'SecTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=COLOR_PRIMARY,
        spaceBefore=1,
        spaceAfter=1.5
    )
    
    item_company = ParagraphStyle(
        'ItemCompany',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.3,
        leading=9.2,
        textColor=COLOR_PRIMARY
    )
    
    item_date = ParagraphStyle(
        'ItemDate',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=6.8,
        leading=8.6,
        textColor=COLOR_MUTED
    )
    
    item_role = ParagraphStyle(
        'ItemRole',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.3,
        leading=9.2,
        textColor=COLOR_PRIMARY
    )
    
    body_text = ParagraphStyle(
        'BodyText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=6.9,
        leading=8.8,
        textColor=COLOR_PRIMARY
    )
    
    body_justify = ParagraphStyle(
        'BodyJustify',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=6.9,
        leading=9.2,
        textColor=COLOR_PRIMARY,
        alignment=TA_JUSTIFY
    )
    
    bullet_text = ParagraphStyle(
        'BulletText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=6.8,
        leading=8.6,
        textColor=COLOR_PRIMARY,
        leftIndent=6,
        firstLineIndent=-6
    )
    
    bullet_tight = ParagraphStyle(
        'BulletTight',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=6.7,
        leading=8.4,
        textColor=COLOR_PRIMARY,
        leftIndent=6,
        firstLineIndent=-6
    )
    
    # ==========================
    # LEFT COLUMN FLOWABLES
    # ==========================
    left_flow = []
    
    # 1. EXPÉRIENCES PROFESSIONNELLES
    left_flow.append(Paragraph('<b>E X P É R I E N C E S &nbsp; P R O F E S S I O N N E L L E S</b>', sec_title))
    left_flow.append(Spacer(1, 1*mm))
    
    # Exp 1 : ITDC MADA (Stage Ingénieur / Développeur Fullstack)
    itdc_t = Table([
        [
            Paragraph('<b>ITDC MADA</b><br/><font color="#4B5563" size=6.5>Nov. 2025 – Mars 2026</font>', item_company),
            Paragraph(
                '<b>Stage Développeur Fullstack</b><br/>'
                '• Développement front-end réactif sous <b>React.js</b> et <b>Tailwind CSS</b>.<br/>'
                '• Conception et intégration d’<b>API REST</b> et WebSockets temps réel (<b>Node.js / Express</b>).<br/>'
                '• Gestion et modélisation de base de données relationnelle <b>PostgreSQL</b>.<br/>'
                '• Automatisation de la génération de rapports décisionnels multi-formats.<br/>'
                '• Collaboration active en équipe selon la méthodologie <b>Agile Scrum</b>.',
                bullet_tight
            )
        ]
    ], colWidths=[31 * mm, 89 * mm])
    itdc_t.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1.5),
    ]))
    left_flow.append(itdc_t)
    left_flow.append(Spacer(1, 1*mm))
    
    # Exp 2 : DREAM'S PATH
    dreams_t = Table([
        [
            Paragraph('<b>DREAM’S PATH</b><br/><font color="#4B5563" size=6.5>Août 2024 – Nov. 2024</font>', item_company),
            Paragraph(
                '<b>Stage Développeur Fullstack</b><br/>'
                'Développement front-end avec React.js | Développement back-end avec Spring Boot | Création et intégration d’API REST | Gestion de base de données PostgreSQL | Mise en place de l’authentification avec Keycloak',
                body_text
            )
        ]
    ], colWidths=[31 * mm, 89 * mm])
    dreams_t.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1.5),
    ]))
    left_flow.append(dreams_t)
    left_flow.append(Spacer(1, 1*mm))
    
    # Exp 3 : SOCIETE MIEZAKA
    miezaka_t = Table([
        [
            Paragraph('<b>SOCIETE MIEZAKA</b><br/><font color="#4B5563" size=6.5>Août 2023 – Nov. 2023</font>', item_company),
            Paragraph(
                '<b>Stage Data Analyst</b><br/>'
                'Analyse et traitement de données | Manipulation de bases de données',
                body_text
            )
        ]
    ], colWidths=[31 * mm, 89 * mm])
    miezaka_t.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1.5),
    ]))
    left_flow.append(miezaka_t)
    left_flow.append(Spacer(1, 2*mm))
    
    # 2. PROJETS ACADÉMIQUES
    left_flow.append(Paragraph('<b>P R O J E T S &nbsp; A C A D É M I Q U E S</b>', sec_title))
    left_flow.append(Spacer(1, 1*mm))
    
    # Projet 1
    p1_head = Table([
        [
            Paragraph('<b>▽ Application hybride – Gestion de location de voiture</b>', item_role),
            Paragraph('<b>Mars 2026</b>', ParagraphStyle('D1', parent=item_date, alignment=TA_RIGHT))
        ]
    ], colWidths=[88 * mm, 32 * mm])
    p1_head.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ]))
    left_flow.append(p1_head)
    left_flow.append(Paragraph(
        '• Développement d’une application hybride avec <b>React Native</b> et <b>Expo</b><br/>'
        '• Backend avec <b>Node.js</b> et <b>Express.js</b><br/>'
        '• Gestion des données avec <b>PostgreSQL</b><br/>'
        '• Implémentation des opérations CRUD<br/>'
        '• Création de statistiques et affichage graphique des données',
        bullet_tight
    ))
    left_flow.append(Spacer(1, 1.2*mm))
    
    # Projet 2
    p2_head = Table([
        [
            Paragraph('<b>▽ Plateforme de location immobilière CI/CD</b>', item_role),
            Paragraph('<b>Octobre – Décembre 2025</b>', ParagraphStyle('D2', parent=item_date, alignment=TA_RIGHT))
        ]
    ], colWidths=[80 * mm, 40 * mm])
    p2_head.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ]))
    left_flow.append(p2_head)
    left_flow.append(Paragraph(
        '• Conception et développement d’une plateforme web fullstack<br/>'
        '• Frontend avec <b>React.js</b><br/>'
        '• Backend avec <b>Flask</b><br/>'
        '• Base de données <b>PostgreSQL</b><br/>'
        '• Développement d’API REST et opérations CRUD<br/>'
        '• Mise en place d’un pipeline CI/CD avec <b>Jenkins</b>',
        bullet_tight
    ))
    left_flow.append(Spacer(1, 2*mm))
    
    # 3. FORMATIONS
    left_flow.append(Paragraph('<b>F O R M A T I O N S</b>', sec_title))
    left_flow.append(Spacer(1, 1*mm))
    
    form_data = [
        [
            Paragraph('<b>Ecole Nationale d’Informatique</b><br/><font color="#4B5563" size=6.4>2025–2026</font>', item_company),
            Paragraph('<b>Master II en Informatique (en cours)</b>', body_text)
        ],
        [
            Paragraph('<b>Ecole Nationale d’Informatique</b><br/><font color="#4B5563" size=6.4>2024–2025</font>', item_company),
            Paragraph('<b>Master I en Informatique</b>', body_text)
        ],
        [
            Paragraph('<b>Ecole Nationale d’Informatique</b><br/><font color="#4B5563" size=6.4>2023–2024</font>', item_company),
            Paragraph('<b>Licence professionnelle en Informatique</b>', body_text)
        ],
        [
            Paragraph('<b>Ecole Nationale d’Informatique</b><br/><font color="#4B5563" size=6.4>2022–2023</font>', item_company),
            Paragraph('<b>Deuxième année de formation de licence professionnelle en Informatique</b>', body_text)
        ],
        [
            Paragraph('<b>Ecole Nationale d’Informatique</b><br/><font color="#4B5563" size=6.4>2021–2022</font>', item_company),
            Paragraph('<b>Première année de formation de licence professionnelle en Informatique</b>', body_text)
        ],
        [
            Paragraph('<b>Lycée Soatanana</b><br/><font color="#4B5563" size=6.4>2020–2021</font>', item_company),
            Paragraph('<b>Baccalauréat série D</b>', body_text)
        ]
    ]
    form_table = Table(form_data, colWidths=[34 * mm, 86 * mm])
    form_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0.5),
    ]))
    left_flow.append(form_table)
    
    # ==========================
    # RIGHT COLUMN FLOWABLES
    # ==========================
    right_flow = []
    
    # 1. PROFIL
    right_flow.append(Paragraph('<b>P R O F I L</b>', sec_title))
    right_flow.append(Paragraph(
        'Étudiante en Master II en Informatique à l’École Nationale d’Informatique, passionnée par le <b>développement web fullstack</b> et l’ingénierie logicielle.<br/>'
        'Motivée, sérieuse et curieuse d’apprendre, je maîtrise la conception d’applications complètes (<b>React.js, Node.js, Spring Boot, PostgreSQL</b>) et les méthodes agiles.<br/>'
        'Je souhaite m’investir pleinement dans des projets innovants et renforcer mes compétences au sein d’une équipe dynamique.',
        body_justify
    ))
    right_flow.append(Spacer(1, 2.5 * mm))
    
    # 2. COMPÉTENCES TECHNIQUES
    right_flow.append(Paragraph('<b>COMPÉTENCES TECHNIQUES</b>', sec_title))
    
    right_flow.append(Paragraph('<b>○ Développement Web</b>', ParagraphStyle('S1', parent=item_role, fontSize=7.1)))
    right_flow.append(Paragraph('Python (Flask), React.js, React Native, JavaScript, PHP, Node.js / Express.js, Spring Boot, JSP, Tailwind CSS', body_text))
    right_flow.append(Spacer(1, 1.2 * mm))
    
    right_flow.append(Paragraph('<b>○ Bases de données</b>', ParagraphStyle('S2', parent=item_role, fontSize=7.1)))
    right_flow.append(Paragraph('PostgreSQL, MySQL, SQL Server, TypeORM', body_text))
    right_flow.append(Spacer(1, 1.2 * mm))
    
    right_flow.append(Paragraph('<b>○ Outils & Méthodes</b>', ParagraphStyle('S3', parent=item_role, fontSize=7.1)))
    right_flow.append(Paragraph('API REST, CRUD, Authentification (JWT, Keycloak), Architecture Fullstack, Git, CI/CD (Jenkins), Agile (Scrum), UML, MERISE', body_text))
    right_flow.append(Spacer(1, 2.5 * mm))
    
    # 3. QUALITÉS
    right_flow.append(Paragraph('<b>Q U A L I T É S</b>', sec_title))
    right_flow.append(Paragraph(
        '• Esprit d’équipe<br/>'
        '• Motivation et curiosité<br/>'
        '• Capacité d’apprentissage rapide<br/>'
        '• Sens de l’organisation<br/>'
        '• Adaptabilité<br/>'
        '• Sérieuse et autonome',
        body_text
    ))
    right_flow.append(Spacer(1, 2.5 * mm))
    
    # 4. LANGUES
    right_flow.append(Paragraph('<b>L A N G U E S</b>', sec_title))
    right_flow.append(Paragraph(
        '○ <b>Français :</b> Bon niveau<br/>'
        '○ <b>Anglais :</b> Niveau intermédiaire',
        body_text
    ))
    
    # ==========================
    # COMBINE MAIN TABLE
    # ==========================
    content_table = Table([
        [left_flow, right_flow]
    ], colWidths=[120 * mm, 74 * mm])
    content_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (0,-1), 0),
        ('RIGHTPADDING', (0,0), (0,-1), 4 * mm),
        ('LEFTPADDING', (1,0), (1,-1), 4 * mm),
        ('RIGHTPADDING', (1,0), (1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ]))
    
    story = [content_table]
    
    doc.build(story, onFirstPage=draw_decorations)
    print("PDF build finished successfully!")

build_pdf()

# Render High-Res PNG
doc_fitz = fitz.open('CV_Omega_ANJARANIRINA.pdf')
print(f'Total pages: {len(doc_fitz)}')
page = doc_fitz[0]
pix = page.get_pixmap(dpi=300)
pix.save('CV_Omega_ANJARANIRINA_Exact.png')
print("High-res PNG rendered!")
