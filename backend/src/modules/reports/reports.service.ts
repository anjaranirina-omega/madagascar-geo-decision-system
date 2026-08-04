import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import ExcelJS = require('exceljs');
import PDFDocument = require('pdfkit');

type TopRiskQuery = {
  riskType?: string;
  zoneType?: string;
  limit?: number;
};

@Injectable()
export class ReportsService {
  constructor(private readonly dataSource: DataSource) {}

  private query(sql: string, params: unknown[] = []) {
    return this.dataSource.query(sql, params);
  }

  private csvEscape(value: unknown) {
    if (value === null || value === undefined) {
      return '';
    }

    const text = String(value).replace(/"/g, '""');

    if (text.includes(',') || text.includes('\n') || text.includes('"')) {
      return `"${text}"`;
    }

    return text;
  }

  private toCsv(rows: Record<string, unknown>[]) {
    if (!rows.length) {
      return '';
    }

    const headers = Object.keys(rows[0]);

    const lines = [
      headers.map((header) => this.csvEscape(header)).join(','),
      ...rows.map((row) =>
        headers.map((header) => this.csvEscape(row[header])).join(','),
      ),
    ];

    return lines.join('\n');
  }

  private async toExcelBuffer(
    sheets: Array<{
      name: string;
      rows: Record<string, unknown>[];
    }>,
  ) {
    const workbook = new ExcelJS.Workbook();

    workbook.creator = 'RISKCLIM-MG';
    workbook.created = new Date();

    for (const sheet of sheets) {
      const worksheet = workbook.addWorksheet(sheet.name.slice(0, 31));

      if (!sheet.rows.length) {
        worksheet.addRow(['Aucune donnée']);
        continue;
      }

      const columns = Object.keys(sheet.rows[0]).map((key) => ({
        header: key,
        key,
        width: Math.min(Math.max(key.length + 6, 14), 35),
      }));

      worksheet.columns = columns;

      for (const row of sheet.rows) {
        worksheet.addRow(row);
      }

      worksheet.getRow(1).font = {
        bold: true,
      };

      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: {
          argb: 'FFEFF6FF',
        },
      };

      worksheet.views = [{ state: 'frozen', ySplit: 1 }];
      worksheet.autoFilter = {
        from: 'A1',
        to: `${String.fromCharCode(64 + columns.length)}1`,
      };
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return Buffer.from(buffer as ArrayBuffer);
  }

  private createPdfBuffer(build: (doc: PDFKit.PDFDocument) => void) {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 42,
        info: {
          Title: 'RISKCLIM-MG Report',
          Author: 'RISKCLIM-MG',
        },
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      build(doc);

      doc.end();
    });
  }

  private formatNumber(value: unknown, digits = 1) {
    if (value === null || value === undefined || value === '') {
      return '—';
    }

    const numberValue = Number(value);

    if (Number.isNaN(numberValue)) {
      return String(value);
    }

    return numberValue.toLocaleString('fr-FR', {
      maximumFractionDigits: digits,
    });
  }

  async getRiskSummaryRows() {
    return this.query(`
      SELECT
        rt.risk_type AS "riskType",
        rt.label AS "riskLabel",
        z.zone_type AS "zoneType",
        COUNT(*) AS "recordsCount",
        COUNT(DISTINCT z.zone_id) AS "zoneCount",
        ROUND(AVG(f.risk_mean)::numeric, 2) AS "riskMean",
        ROUND(MAX(f.risk_max)::numeric, 2) AS "riskMax",
        ROUND(AVG(f.hazard_mean)::numeric, 2) AS "hazardMean",
        ROUND(SUM(f.population_exposed)::numeric, 2) AS "populationExposed"
      FROM dwh.fact_risk_indicator f
      JOIN dwh.dim_risk_type rt
        ON rt.risk_type_key = f.risk_type_key
      JOIN dwh.dim_zone z
        ON z.zone_key = f.zone_key
      GROUP BY
        rt.risk_type,
        rt.label,
        z.zone_type
      ORDER BY
        rt.risk_type,
        z.zone_type;
    `);
  }

  async getTopRiskZonesRows(query: TopRiskQuery = {}) {
    const zoneType = query.zoneType ?? 'region';
    const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 500);

    const params: unknown[] = [zoneType];
    const filters = ['z.zone_type = $1'];

    if (query.riskType) {
      params.push(query.riskType);
      filters.push(`rt.risk_type = $${params.length}`);
    }

    params.push(limit);
    const limitParam = `$${params.length}`;

    return this.query(
      `
      SELECT
        rt.risk_type AS "riskType",
        rt.label AS "riskLabel",
        z.zone_type AS "zoneType",
        z.zone_code AS "zoneCode",
        z.zone_nom AS "zoneNom",
        ROUND(f.risk_mean::numeric, 2) AS "riskMean",
        ROUND(f.risk_max::numeric, 2) AS "riskMax",
        ROUND(f.hazard_mean::numeric, 2) AS "hazardMean",
        ROUND(f.population_exposed::numeric, 2) AS "populationExposed",
        ROUND(f.area_km2::numeric, 2) AS "areaKm2",
        f.risk_level AS "riskLevel",
        f.operational_updated_at AS "updatedAt"
      FROM dwh.fact_risk_indicator f
      JOIN dwh.dim_risk_type rt
        ON rt.risk_type_key = f.risk_type_key
      JOIN dwh.dim_zone z
        ON z.zone_key = f.zone_key
      WHERE ${filters.join(' AND ')}
        AND f.risk_max IS NOT NULL
      ORDER BY
        f.risk_max DESC NULLS LAST
      LIMIT ${limitParam};
      `,
      params,
    );
  }

  async getDataSourcesRows() {
    return this.query(`
      SELECT
        code,
        name,
        category::text AS category,
        provider,
        status::text AS status,
        last_sync_at AS "lastSyncAt",
        last_success_at AS "lastSuccessAt",
        last_error_at AS "lastErrorAt",
        last_error_message AS "lastErrorMessage"
      FROM data_sources
      WHERE is_active = true
      ORDER BY category, name;
    `);
  }

  async getEtlJobsRows(limit = 50) {
    return this.query(
      `
      SELECT
        id,
        type,
        status,
        message,
        started_at AS "startedAt",
        finished_at AS "finishedAt",
        duration_ms AS "durationMs",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM etl_pipeline_jobs
      ORDER BY created_at DESC
      LIMIT $1;
      `,
      [Math.min(Math.max(Number(limit) || 50, 1), 200)],
    );
  }

  async getRasterRows() {
    return this.query(`
      SELECT
        type::text AS type,
        name,
        file_path AS "filePath",
        ROUND(min_value::numeric, 2) AS "minValue",
        ROUND(max_value::numeric, 2) AS "maxValue",
        ROUND(mean_value::numeric, 2) AS "meanValue",
        width,
        height,
        crs,
        updated_at AS "updatedAt"
      FROM raster_layers
      WHERE is_active = true
      ORDER BY updated_at DESC;
    `);
  }

  async getNationalRiskPdf() {
    const [riskSummary, topZones, dataSources, etlJobs, rasters] =
      await Promise.all([
        this.getRiskSummaryRows(),
        this.getTopRiskZonesRows({
          zoneType: 'region',
          limit: 12,
        }),
        this.getDataSourcesRows(),
        this.getEtlJobsRows(5),
        this.getRasterRows(),
      ]);

    const [climateStats] = await this.query(`
      SELECT
        MAX(observed_date) AS latest_date,
        AVG(temperature_mean) AS temperature_mean,
        AVG(humidity_mean) AS humidity_mean,
        AVG(wind_speed_mean) AS wind_speed_mean,
        AVG(precipitation) AS precipitation
      FROM climate_observations
      WHERE source = 'NASA_POWER'
        AND observed_date = (
          SELECT MAX(observed_date)
          FROM climate_observations
          WHERE source = 'NASA_POWER'
            AND (
              temperature_mean IS NOT NULL
              OR humidity_mean IS NOT NULL
              OR wind_speed_mean IS NOT NULL
              OR precipitation IS NOT NULL
            )
        )
    `);

    const [alertStats] = await this.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'ACTIVE') AS active,
        COUNT(*) FILTER (WHERE niveau = 'CRITIQUE') AS critical
      FROM alertes
    `);

    const dominantRisk = [...riskSummary]
      .filter((row) => row.zoneType === 'region')
      .sort((a, b) => Number(b.riskMax ?? 0) - Number(a.riskMax ?? 0))[0];

    const topRegionNames = topZones
      .slice(0, 3)
      .map((row: Record<string, any>) => row.zoneNom)
      .filter(Boolean)
      .join(', ');

    const recommendationForRisk = (riskType: string) => {
      switch (riskType) {
        case 'FLOOD':
          return 'Renforcer la surveillance hydrologique, vérifier les zones basses et préparer les dispositifs de prévention communautaire.';
        case 'DROUGHT':
          return 'Renforcer le suivi hydrométéorologique, anticiper les besoins en eau et prioriser les zones agricoles sensibles.';
        case 'LANDSLIDE':
          return 'Surveiller les versants instables, limiter l’exposition dans les zones de forte pente et préparer les autorités locales.';
        case 'CYCLONE':
          return 'Vérifier les plans de contingence, préparer les communications d’urgence et surveiller les bulletins cycloniques officiels.';
        default:
          return 'Maintenir la veille multi-risques et prioriser les zones présentant les indices les plus élevés.';
      }
    };

    return this.createPdfBuffer((doc) => {
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;

      // Page de garde
      doc.rect(0, 0, pageWidth, pageHeight).fill('#0f172a');

      doc
        .fillColor('#22c55e')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('RISKCLIM-MG', 42, 70);

      doc
        .fillColor('#ffffff')
        .fontSize(28)
        .font('Helvetica-Bold')
        .text('Rapport décisionnel', 42, 120);

      doc
        .fontSize(18)
        .font('Helvetica')
        .fillColor('#cbd5e1')
        .text('Analyse des risques climatiques', 42, 160);

      doc
        .fontSize(14)
        .fillColor('#94a3b8')
        .text('Madagascar', 42, 200)
        .text(new Date().toLocaleDateString('fr-FR', {
          month: 'long',
          year: 'numeric',
        }), 42, 222);

      doc
        .fontSize(9)
        .fillColor('#64748b')
        .text(
          `Généré le ${new Date().toLocaleString('fr-FR')}`,
          42,
          pageHeight - 80,
        );

      doc.addPage();

      // Sommaire
      doc
        .fillColor('#0f172a')
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('Sommaire');

      const summaryItems = [
        '1. Contexte',
        '2. Méthodologie',
        '3. Sources de données',
        '4. Résumé exécutif',
        '5. Résultats multi-risques',
        '6. Indicateurs climatiques',
        '7. Recommandations',
        '8. Métadonnées',
      ];

      doc.moveDown();

      summaryItems.forEach((item) => {
        doc.fontSize(11).font('Helvetica').text(item);
      });

      doc.addPage();

      // Contexte
      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text('1. Contexte');

      doc
        .moveDown(0.5)
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#334155')
        .text(
          'Ce rapport présente une synthèse décisionnelle des risques climatiques à Madagascar. Il s’appuie sur les rasters de risque, les statistiques zonales, le data warehouse, les sources de données réelles et les derniers traitements ETL.',
          { lineGap: 4 },
        );

      doc
        .moveDown()
        .fontSize(18)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text('2. Méthodologie');

      doc
        .moveDown(0.5)
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#334155')
        .text(
          'Les indices de risque sont exprimés sur une échelle de 0 à 100. Les risques spécifiques utilisent des modèles métier distincts : inondation, sécheresse, glissement de terrain et cyclone historique. Les indicateurs zonaux sont calculés directement à partir des pixels raster contenus dans chaque région, district ou commune.',
          { lineGap: 4 },
        );

      doc
        .moveDown()
        .fontSize(18)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text('3. Sources de données');

      doc.moveDown(0.5);

      dataSources.forEach((source: Record<string, any>) => {
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#334155')
          .text(
            `${source.name} — ${source.provider ?? 'fournisseur non précisé'} — ${source.status}`,
          );
      });

      doc.addPage();

      // Résumé exécutif
      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text('4. Résumé exécutif');

      doc.moveDown(0.5);

      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor('#334155')
        .text(
          `Le risque dominant observé dans les indicateurs régionaux est : ${dominantRisk?.riskLabel ?? 'non déterminé'}.`,
          { lineGap: 5 },
        )
        .text(
          `Les régions les plus exposées sont : ${topRegionNames || 'non disponibles'}.`,
          { lineGap: 5 },
        )
        .text(
          `Alertes actives : ${this.formatNumber(alertStats?.active, 0)} ; alertes critiques : ${this.formatNumber(alertStats?.critical, 0)}.`,
          { lineGap: 5 },
        );

      doc
        .moveDown()
        .fontSize(18)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text('5. Résultats multi-risques');

      doc.moveDown(0.5);

      riskSummary.slice(0, 18).forEach((row: Record<string, any>) => {
        const barWidth = Math.min(Number(row.riskMax ?? 0) * 2.2, 220);

        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor('#0f172a')
          .text(`${row.riskLabel} / ${row.zoneType}`);

        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor('#475569')
          .text(
            `Moyen ${this.formatNumber(row.riskMean)} — Max ${this.formatNumber(row.riskMax)} — Zones ${row.zoneCount}`,
          );

        const x = doc.x;
        const y = doc.y + 3;

        doc.rect(x, y, 230, 5).fill('#e2e8f0');
        doc.rect(x, y, barWidth, 5).fill('#2563eb');

        doc.moveDown(0.8);
      });

      doc.addPage();

      // Top zones
      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text('Top zones exposées');

      doc.moveDown(0.5);

      topZones.forEach((row: Record<string, any>, index: number) => {
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#0f172a')
          .text(`${index + 1}. ${row.zoneNom} — ${row.riskLabel}`);

        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#475569')
          .text(
            `Niveau : ${row.riskLevel ?? '—'} | Moyen : ${this.formatNumber(row.riskMean)} | Max : ${this.formatNumber(row.riskMax)} | Population exposée : ${this.formatNumber(row.populationExposed, 0)}`,
            { lineGap: 3 },
          )
          .moveDown(0.4);
      });

      doc
        .moveDown()
        .fontSize(18)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text('6. Indicateurs climatiques');

      doc.moveDown(0.5);

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#334155')
        .text(`Date NASA POWER : ${climateStats?.latest_date ?? '—'}`)
        .text(`Température moyenne : ${this.formatNumber(climateStats?.temperature_mean)} °C`)
        .text(`Humidité moyenne : ${this.formatNumber(climateStats?.humidity_mean)} %`)
        .text(`Vent moyen : ${this.formatNumber(climateStats?.wind_speed_mean)} m/s`)
        .text(`Précipitations moyennes : ${this.formatNumber(climateStats?.precipitation)} mm`);

      doc.addPage();

      // Recommandations
      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text('7. Recommandations automatiques');

      doc.moveDown(0.5);

      topZones.slice(0, 6).forEach((row: Record<string, any>) => {
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#0f172a')
          .text(`${row.zoneNom} — ${row.riskLabel}`);

        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#475569')
          .text(recommendationForRisk(row.riskType), { lineGap: 3 })
          .moveDown(0.5);
      });

      doc
        .moveDown()
        .fontSize(18)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text('8. Métadonnées');

      doc.moveDown(0.5);

      const latestJob = etlJobs[0];

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#334155')
        .text(`Date de génération : ${new Date().toLocaleString('fr-FR')}`)
        .text(`Dernier ETL : ${latestJob?.status ?? '—'} — ${latestJob?.finishedAt ?? latestJob?.updatedAt ?? '—'}`)
        .text(`Nombre de sources : ${dataSources.length}`)
        .text(`Nombre de rasters actifs : ${rasters.length}`)
        .text('Version du modèle : V1 multi-risques documentée');

      doc
        .moveDown()
        .fontSize(9)
        .fillColor('#64748b')
        .text(
          'Ce rapport est généré automatiquement à partir de données réelles. Il constitue une aide à la décision et ne remplace pas l’expertise des autorités compétentes.',
          { lineGap: 4 },
        );
    });
  }

  async getNationalRiskExcel() {
    const [riskSummary, topZones, dataSources, etlJobs, rasters] =
      await Promise.all([
        this.getRiskSummaryRows(),
        this.getTopRiskZonesRows({
          zoneType: 'region',
          limit: 100,
        }),
        this.getDataSourcesRows(),
        this.getEtlJobsRows(50),
        this.getRasterRows(),
      ]);

    return this.toExcelBuffer([
      {
        name: 'Synthese risques',
        rows: riskSummary,
      },
      {
        name: 'Top zones',
        rows: topZones,
      },
      {
        name: 'Sources',
        rows: dataSources,
      },
      {
        name: 'Jobs ETL',
        rows: etlJobs,
      },
      {
        name: 'Rasters',
        rows: rasters,
      },
    ]);
  }

  async getRiskSummaryCsv() {
    return this.toCsv(await this.getRiskSummaryRows());
  }

  async getTopRiskZonesCsv(query: TopRiskQuery = {}) {
    return this.toCsv(await this.getTopRiskZonesRows(query));
  }

  async getTopRiskZonesExcel(query: TopRiskQuery = {}) {
    const rows = await this.getTopRiskZonesRows(query);

    return this.toExcelBuffer([
      {
        name: 'Top zones',
        rows,
      },
    ]);
  }

  async getTopRiskZonesPdf(query: TopRiskQuery = {}) {
    const rows = await this.getTopRiskZonesRows(query);

    return this.createPdfBuffer((doc) => {
      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('RISKCLIM-MG — Top zones exposées');

      doc
        .moveDown(0.5)
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#475569')
        .text(`Généré le : ${new Date().toLocaleString('fr-FR')}`);

      doc.moveDown().fillColor('#0f172a');

      for (const row of rows) {
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(`${row.riskLabel} — ${row.zoneNom}`);

        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            `Niveau : ${row.riskLevel ?? '—'} | Moyen : ${this.formatNumber(
              row.riskMean,
            )} | Max : ${this.formatNumber(row.riskMax)} | Population : ${this.formatNumber(
              row.populationExposed,
              0,
            )}`,
          )
          .moveDown(0.4);
      }
    });
  }

  async getDataSourcesCsv() {
    return this.toCsv(await this.getDataSourcesRows());
  }

  async getDataSourcesExcel() {
    const rows = await this.getDataSourcesRows();

    return this.toExcelBuffer([
      {
        name: 'Sources',
        rows,
      },
    ]);
  }

  async getEtlJobsCsv() {
    return this.toCsv(await this.getEtlJobsRows(100));
  }

  async getEtlJobsExcel() {
    const rows = await this.getEtlJobsRows(100);

    return this.toExcelBuffer([
      {
        name: 'Jobs ETL',
        rows,
      },
    ]);
  }
}
