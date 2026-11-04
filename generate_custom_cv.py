import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm, cm
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
import fitz

# Define Page Dimensions
PAGE_WIDTH, PAGE_HEIGHT = A4

def draw_background_and_decorations(canvas_obj, doc):
    canvas_obj.saveState()
    
    # 1. Header Background (Light Warm Grey)
    header_height = 42 * mm
    canvas_obj.setFillColor(colors.HexColor('#E5E6E3'))
    canvas_obj.rect(0, PAGE_HEIGHT - header_height, PAGE_WIDTH, header_height, stroke=0, fill=1)
    
    # 2. Dark Green Sidebar Block for photo area (Top Left)
    photo_box_w = 40 * mm
    canvas_obj.setFillColor(colors.HexColor('#233D34')) # Dark green
    canvas_obj.rect(8 * mm, PAGE_HEIGHT - 38 * mm, photo_box_w, 34 * mm, stroke=0, fill=1)
    
    # Draw photo silhouette / frame placeholder
    canvas_obj.setFillColor(colors.HexColor('#315247'))
    canvas_obj.circle(28 * mm, PAGE_HEIGHT - 21 * mm, 12 * mm, stroke=0, fill=1)
    canvas_obj.setFillColor(colors.HexColor('#E5E6E3'))
    canvas_obj.circle(28 * mm, PAGE_HEIGHT - 17 * mm, 5 * mm, stroke=0, fill=1)
    canvas_obj.ellipse(22 * mm, PAGE_HEIGHT - 30 * mm, 34 * mm, PAGE_HEIGHT - 22 * mm, stroke=0, fill=1)
    
    # 3. Decorative Dot Matrix (Top Right)
    canvas_obj.setFillColor(colors.HexColor('#6B7280'))
    start_x = PAGE_WIDTH - 30 * mm
    start_y = PAGE_HEIGHT - 10 * mm
    for row in range(5):
        for col in range(6):
            canvas_obj.circle(start_x + col * 3.5 * mm, start_y - row * 3.5 * mm, 0.6 * mm, stroke=0, fill=1)
            
    # 4. Decorative Dot Matrix (Bottom Left)
    start_x_bot = 8 * mm
    start_y_bot = 25 * mm
    for row in range(5):
        for col in range(8):
            canvas_obj.circle(start_x_bot + col * 3.5 * mm, start_y_bot - row * 3.5 * mm, 0.6 * mm, stroke=0, fill=1)
            
    # 5. Dark Green Bottom Right Accent
    canvas_obj.setFillColor(colors.HexColor('#233D34'))
    canvas_obj.rect(PAGE_WIDTH - 55 * mm, 10 * mm, 45 * mm, 8 * mm, stroke=0, fill=1)
    
    # 6. Vertical separator line between Left Main content and Right Sidebar
    canvas_obj.setStrokeColor(colors.HexColor('#D1D5DB'))
    canvas_obj.setLineWidth(0.75)
    # canvas_obj.line(138 * mm, 30 * mm, 138 * mm, PAGE_HEIGHT - header_height - 5 * mm)
    
    canvas_obj.restoreState()

def build_cv():
    pdf_path = 'CV_Omega_ANJARANIRINA_Spoon_Consulting.pdf'
    
    # Set page margins
    left_margin = 8 * mm
    right_margin = 8 * mm
    top_margin = 44 * mm # under header
    bottom_margin = 12 * mm
    
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        leftMargin=left_margin,
        rightMargin=right_margin,
        topMargin=top_margin,
        bottomMargin=bottom_margin
    )
    
    # Color palette
    COLOR_PRIMARY_DARK = colors.HexColor('#111827')
    COLOR_GREEN_DARK = colors.HexColor('#233D34')
    COLOR_GREY_MUTED = colors.HexColor('#4B5563')
    COLOR_GREY_LIGHT = colors.HexColor('#6B7280')
    
    styles = getSampleStyleSheet()
    
    # Left Column Width = 124 mm, Right Column Width = 66 mm (Total = 190 mm)
    COL_LEFT_W = 124 * mm
    COL_RIGHT_W = 66 * mm
    
    # Typography Styles
    name_style = ParagraphStyle(
        'HeaderName',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=21,
        textColor=COLOR_PRIMARY_DARK
    )
    
    subtitle_style = ParagraphStyle(
        'HeaderSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=12,
        textColor=COLOR_GREY_MUTED
    )
    
    contact_style = ParagraphStyle(
        'HeaderContact',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        textColor=COLOR_PRIMARY_DARK
    )
    
    sec_title_left = ParagraphStyle(
        'SecTitleLeft',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=12,
        textColor=COLOR_PRIMARY_DARK,
        spaceBefore=4,
        spaceAfter=2
    )
    
    sec_title_right = ParagraphStyle(
        'SecTitleRight',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=12,
        textColor=COLOR_PRIMARY_DARK,
        spaceBefore=4,
        spaceAfter=2
    )
    
    body_p = ParagraphStyle(
        'BodyP',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=9.8,
        textColor=COLOR_PRIMARY_DARK
    )
    
    body_justify = ParagraphStyle(
        'BodyJustify',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.3,
        leading=9.6,
        textColor=COLOR_PRIMARY_DARK,
        alignment=TA_JUSTIFY
    )
    
    item_title = ParagraphStyle(
        'ItemTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.8,
        leading=10,
        textColor=COLOR_PRIMARY_DARK
    )
    
    item_date = ParagraphStyle(
        'ItemDate',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.2,
        leading=9.5,
        textColor=COLOR_GREY_MUTED
    )
    
    bullet_left = ParagraphStyle(
        'BulletLeft',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.2,
        leading=9.2,
        textColor=COLOR_PRIMARY_DARK,
        leftIndent=8,
        firstLineIndent=-8
    )
    
    bullet_right = ParagraphStyle(
        'BulletRight',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.2,
        leading=9.5,
        textColor=COLOR_PRIMARY_DARK
    )
    
    # -------------------------------------------------------------
    # BUILD LEFT COLUMN FLOWABLES
    # -------------------------------------------------------------
    left_flowables = []
    
    # 1. EXPÉRIENCES PROFESSIONNELLES
    left_flowables.append(Paragraph('<b>E X P É R I E N C E S &nbsp; P R O F E S S I O N N E L L E S</b>', sec_title_left))
    
    # ITDC MADA (NEW)
    itdc_t = Table([
        [
            Paragraph('<b>ITDC MADA</b><br/><font color="#4B5563">Nov. 2025 – Mars 2026</font>', item_title),
            Paragraph('<b>Stage Ingénieur Développeur Fullstack</b><br/>'
                      'Conception et développement d’une application web décisionnelle et temps réel.<br/>'
                      '• Développement front-end réactif et responsive avec <b>React.js</b> et <b>Tailwind CSS</b>.<br/>'
                      '• Conception d’APIs RESTful et communication temps réel avec <b>WebSockets (Socket.IO)</b>.<br/>'
                      '• Modélisation et gestion de base de données <b>PostgreSQL</b> avec <b>TypeORM</b>.<br/>'
                      '• Automatisation de la génération de rapports multi-formats (PDF / Excel).<br/>'
                      '• Collaboration active au sein d’une équipe selon la méthodologie <b>Agile Scrum</b>.', bullet_left)
        ]
    ], colWidths=[34*mm, 88*mm])
    itdc_t.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 1),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    left_flowables.append(itdc_t)
    left_flowables.append(Spacer(1, 1.5*mm))
    
    # DREAM'S PATH
    dreams_t = Table([
        [
            Paragraph('<b>DREAM’S PATH</b><br/><font color="#4B5563">Août 2024 – Nov. 2024</font>', item_title),
            Paragraph('<b>Stage Développeur Fullstack</b><br/>'
                      'Développement front-end avec <b>React.js</b> | Développement back-end avec <b>Spring Boot</b> | Création et intégration d’<b>API REST</b> | Gestion de base de données <b>PostgreSQL</b> | Mise en place de l’authentification avec <b>Keycloak</b>.', bullet_left)
        ]
    ], colWidths=[34*mm, 88*mm])
    dreams_t.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 1),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    left_flowables.append(dreams_t)
    left_flowables.append(Spacer(1, 1.5*mm))
    
    # SOCIETE MIEZAKA
    miezaka_t = Table([
        [
            Paragraph('<b>SOCIETE MIEZAKA</b><br/><font color="#4B5563">Août 2023 – Nov. 2023</font>', item_title),
            Paragraph('<b>Stage Data Analyst</b><br/>'
                      'Analyse et traitement de données | Manipulation de bases de données.', bullet_left)
        ]
    ], colWidths=[34*mm, 88*mm])
    miezaka_t.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 1),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    left_flowables.append(miezaka_t)
    left_flowables.append(Spacer(1, 2*mm))
    
    # 2. PROJETS ACADÉMIQUES
    left_flowables.append(Paragraph('<b>P R O J E T S &nbsp; A C A D É M I Q U E S</b>', sec_title_left))
    
    # Projet 1 : App hybride
    p1_t = Table([
        [
            Paragraph('<b>▽ Application hybride – Gestion de location de voiture</b>', item_title),
            Paragraph('<b>Mars 2026</b>', ParagraphStyle('RightDate', parent=item_date, alignment=TA_RIGHT))
        ]
    ], colWidths=[90*mm, 32*mm])
    p1_t.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 1),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1),
    ]))
    left_flowables.append(p1_t)
    left_flowables.append(Paragraph('• Développement d’une application hybride avec <b>React Native</b> et <b>Expo</b><br/>'
                                   '• Backend avec <b>Node.js</b> et <b>Express.js</b> | Gestion des données avec <b>PostgreSQL</b><br/>'
                                   '• Implémentation des opérations CRUD | Statistiques et affichage graphique des données', bullet_left))
    left_flowables.append(Spacer(1, 1.5*mm))
    
    # Projet 2 : Location immobiliere CI/CD
    p2_t = Table([
        [
            Paragraph('<b>▽ Plateforme de location immobilière CI/CD</b>', item_title),
            Paragraph('<b>Oct. – Déc. 2025</b>', ParagraphStyle('RightDate2', parent=item_date, alignment=TA_RIGHT))
        ]
    ], colWidths=[85*mm, 37*mm])
    p2_t.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 1),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1),
    ]))
    left_flowables.append(p2_t)
    left_flowables.append(Paragraph('• Conception et développement d’une plateforme web fullstack (Frontend <b>React.js</b>, Backend <b>Flask</b>, <b>PostgreSQL</b>)<br/>'
                                   '• Développement d’API REST et opérations CRUD | Mise en place d’un pipeline <b>CI/CD avec Jenkins</b>', bullet_left))
    left_flowables.append(Spacer(1, 2*mm))
    
    # 3. FORMATIONS
    left_flowables.append(Paragraph('<b>F O R M A T I O N S</b>', sec_title_left))
    
    formations_data = [
        [
            Paragraph('<b>Ecole Nationale d’Informatique</b><br/><font color="#4B5563">2025 – 2026</font>', item_title),
            Paragraph('<b>Master II en Informatique (en cours)</b><br/><i>Spécialité : Génie Logiciel & Systèmes d’Information</i>', bullet_left)
        ],
        [
            Paragraph('<b>Ecole Nationale d’Informatique</b><br/><font color="#4B5563">2024 – 2025</font>', item_title),
            Paragraph('<b>Master I en Informatique</b>', bullet_left)
        ],
        [
            Paragraph('<b>Ecole Nationale d’Informatique</b><br/><font color="#4B5563">2023 – 2024</font>', item_title),
            Paragraph('<b>Licence professionnelle en Informatique</b>', bullet_left)
        ],
        [
            Paragraph('<b>Ecole Nationale d’Informatique</b><br/><font color="#4B5563">2021 – 2023</font>', item_title),
            Paragraph('<b>1ère & 2ème année de formation Licence professionnelle</b>', bullet_left)
        ],
        [
            Paragraph('<b>Lycée Soatanana</b><br/><font color="#4B5563">2020 – 2021</font>', item_title),
            Paragraph('<b>Baccalauréat série D</b>', bullet_left)
        ],
    ]
    
    form_t = Table(formations_data, colWidths=[36*mm, 86*mm])
    form_t.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 1),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1),
    ]))
    left_flowables.append(form_t)
    
    # -------------------------------------------------------------
    # BUILD RIGHT COLUMN FLOWABLES
    # -------------------------------------------------------------
    right_flowables = []
    
    # PROFIL
    right_flowables.append(Paragraph('<b>P R O F I L</b>', sec_title_right))
    right_flowables.append(Paragraph(
        'Étudiante en <b>Master II en Informatique</b> à l’École Nationale d’Informatique, passionnée par le <b>développement web fullstack</b> et l’ingénierie logicielle.<br/>'
        'Motivée, rigoureuse et dotée d’un solide sens du détail, je maîtrise les architectures modernes (React.js, Node.js, Spring Boot, PostgreSQL) et les pratiques Agiles.<br/>'
        'Je souhaite mettre mon dynamisme et mon adaptabilité au service de projets ambitieux et d’équipes performantes.',
        body_justify
    ))
    right_flowables.append(Spacer(1, 2.5*mm))
    
    # COMPÉTENCES TECHNIQUES
    right_flowables.append(Paragraph('<b>COMPÉTENCES TECHNIQUES</b>', sec_title_right))
    
    right_flowables.append(Paragraph('<b>○ Développement Web</b>', ParagraphStyle('SkillH', parent=item_title, fontSize=7.4)))
    right_flowables.append(Paragraph('React.js, React Native, JavaScript, Node.js / Express.js, Spring Boot, Python (Flask), PHP, HTML5/CSS3.', bullet_right))
    right_flowables.append(Spacer(1, 1.5*mm))
    
    right_flowables.append(Paragraph('<b>○ Bases de données</b>', ParagraphStyle('SkillH2', parent=item_title, fontSize=7.4)))
    right_flowables.append(Paragraph('PostgreSQL, MySQL, SQL Server, TypeORM, Modélisation SQL.', bullet_right))
    right_flowables.append(Spacer(1, 1.5*mm))
    
    right_flowables.append(Paragraph('<b>○ Outils & Méthodes</b>', ParagraphStyle('SkillH3', parent=item_title, fontSize=7.4)))
    right_flowables.append('API REST, CRUD, JWT / Keycloak, Git / GitHub, CI/CD (Jenkins), Méthodes Agiles (Scrum), UML, MERISE.', bullet_right)
    right_flowables.append(Spacer(1, 2.5*mm))
    
    # QUALITÉS
    right_flowables.append(Paragraph('<b>Q U A L I T É S</b>', sec_title_right))
    qualities_text = (
        '• Esprit d’équipe & communication<br/>'
        '• Motivation et curiosité continue<br/>'
        '• Capacité d’apprentissage rapide<br/>'
        '• Sens de l’organisation et rigueur<br/>'
        '• Adaptabilité et force de proposition<br/>'
        '• Sérieuse et autonome'
    )
    right_flowables.append(Paragraph(qualities_text, bullet_right))
    right_flowables.append(Spacer(1, 2.5*mm))
    
    # LANGUES
    right_flowables.append(Paragraph('<b>L A N G U E S</b>', sec_title_right))
    lang_text = (
        '<b>○ Français :</b> Bon niveau (Courant)<br/>'
        '<b>○ Anglais :</b> Niveau intermédiaire technique<br/>'
        '<b>○ Malgache :</b> Langue maternelle'
    )
    right_flowables.append(Paragraph(lang_text, bullet_right))
    
    # -------------------------------------------------------------
    # MAIN LAYOUT TABLE (Left Col + Right Col)
    # -------------------------------------------------------------
    # Header block inside document to sit perfectly below the custom banner
    header_content = Table([
        [
            Paragraph('<b>Omega ANJARANIRINA</b>', name_style),
            Paragraph('📞 <b>+261 38 39 481 20</b> &nbsp;|&nbsp; ✉ <b>anjaranirinaomega@gmail.com</b><br/>'
                      '📍 <b>ISB118 3205 Soatsihadino Fianarantsoa</b><br/>'
                      '🔗 <b>linkedin.com/in/omega-anjaranirina-85096a3b4</b><br/>'
                      '🐙 <b>github.com/anjaranirina-omega</b>', contact_style)
        ],
        [
            Paragraph('<b>Étudiante en Master Informatique – Développement Fullstack</b>', subtitle_style),
            Paragraph('', contact_style)
        ]
    ], colWidths=[100*mm, 90*mm])
    header_content.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1),
    ]))
    
    main_table_data = [
        [
            left_flowables,
            right_flowables
        ]
    ]
    
    main_table = Table(main_table_data, colWidths=[122*mm, 68*mm])
    main_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (0,-1), 0),
        ('RIGHTPADDING', (0,0), (0,-1), 4*mm),
        ('LEFTPADDING', (1,0), (1,-1), 4*mm),
        ('RIGHTPADDING', (1,0), (1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('LINEAFTER', (0,0), (0,-1), 0.75, colors.HexColor('#E5E7EB')),
    ]))
    
    story = [
        # Header is placed via onFirstPage or in flowables
        # Let's adjust topMargin
        Spacer(1, 1*mm),
        main_table
    ]
    
    doc.build(story, onFirstPage=draw_background_and_decorations)
    print("CV built successfully!")

build_cv()
