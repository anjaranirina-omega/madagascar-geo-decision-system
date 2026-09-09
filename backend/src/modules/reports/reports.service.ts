import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync, unlinkSync } from 'fs';
import { join, resolve } from 'path';
import { DataSource, Repository } from 'typeorm';
import { StorageService } from '../storage/storage.service';
import { GeneratedReport } from './entities/generated-report.entity';
import ExcelJS = require('exceljs');
import PDFDocument = require('pdfkit');

type TopRiskQuery = {
  riskType?: string;
  zoneType?: string;
  limit?: number;
};

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly dataSource: DataSource,

    @InjectRepository(GeneratedReport)
    private readonly generatedReportsRepository: Repository<GeneratedReport>,

    private readonly storageService: StorageService,
  ) {}

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

  private getLocalGeneratedAt() {
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'medium',
      timeZone: 'Indian/Antananarivo',
    }).format(new Date());
  }

  async saveGeneratedReport(payload: {
    title: string;
    reportType: string;
    format: string;
    fileName: string;
    mimeType: string;
    content: Buffer | string;
    filters?: Record<string, unknown> | null;
    generatedBy?: string | null;
  }) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const timestamp = now.toISOString().replace(/[:.]/g, '-');
    const safeFileName = `${timestamp}-${payload.fileName}`.replace(/\s+/g, '-');
    const s3Key = `reports/${year}/${month}/${safeFileName}`;

    const buffer =
      typeof payload.content === 'string'
        ? Buffer.from(payload.content, 'utf8')
        : payload.content;

    await this.storageService.putObject(
      this.storageService.reportsBucket,
      s3Key,
      buffer,
      payload.mimeType,
    );

    return this.generatedReportsRepository.save(
      this.generatedReportsRepository.create({
        title: payload.title,
        reportType: payload.reportType,
        format: payload.format,
        fileName: payload.fileName,
        filePath: s3Key,
        mimeType: payload.mimeType,
        filters: payload.filters ?? null,
        generatedBy: payload.generatedBy ?? null,
        generatedAtLocal: this.getLocalGeneratedAt(),
        version: '1.0',
        status: 'GENERATED',
        fileSizeBytes: buffer.length,
      }),
    );
  }

  findHistory(limit = 50) {
    return this.generatedReportsRepository.find({
      order: {
        createdAt: 'DESC',
      },
      take: Math.min(Math.max(Number(limit) || 50, 1), 200),
    });
  }

  async findGeneratedReport(id: string) {
    const report = await this.generatedReportsRepository.findOne({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException('Rapport introuvable.');
    }

    return report;
  }

  async deleteGeneratedReport(id: string) {
    const report = await this.findGeneratedReport(id);

    // Retrocompatibility: handle old local file paths vs S3 keys
    if (
      report.filePath.startsWith('backend/uploads/') ||
      report.filePath.startsWith('uploads/')
    ) {
      const projectRoot = resolve(process.cwd(), '..');
      const absolutePath = join(projectRoot, report.filePath);

      if (existsSync(absolutePath)) {
        try {
          unlinkSync(absolutePath);
        } catch (err: any) {
          this.logger.warn(
            `Impossible de supprimer le fichier local (${absolutePath}): ${err?.message}`,
          );
        }
      }
    } else {
      try {
        await this.storageService.deleteObject(
          this.storageService.reportsBucket,
          report.filePath,
        );
      } catch (err: any) {
        this.logger.warn(
          `Impossible de supprimer le rapport MinIO/S3 (${report.filePath}): ${err?.message}`,
        );
      }
    }

    await this.generatedReportsRepository.delete(id);

    return {
      deleted: true,
      id,
    };
  }

  private getRasterMapSnapshots() {
    const projectRoot = resolve(process.cwd(), '..');
    const mapsDir = join(projectRoot, 'etl', 'data', 'reports', 'maps');

    const maps = [
      {
        title: 'Carte du risque global',
        path: join(mapsDir, 'risk_global.png'),
      },
      {
        title: 'Carte du risque d’inondation',
        path: join(mapsDir, 'risk_flood.png'),
      },
      {
        title: 'Carte du risque sécheresse',
        path: join(mapsDir, 'risk_drought.png'),
      },
      {
        title: 'Carte du risque glissement de terrain',
        path: join(mapsDir, 'risk_landslide.png'),
      },
      {
        title: 'Carte du risque cyclonique',
        path: join(mapsDir, 'risk_cyclone.png'),
      },
    ];

    return maps.filter((item) => existsSync(item.path));
  }

  private getRasterMapSnapshotsForRisk(riskType?: string) {
    const maps = this.getRasterMapSnapshots();

    if (!riskType) {
      return maps;
    }

    const expectedTitleByRiskType: Record<string, string> = {
      GLOBAL: 'Carte du risque global',
      FLOOD: 'Carte du risque d’inondation',
      DROUGHT: 'Carte du risque sécheresse',
      LANDSLIDE: 'Carte du risque glissement de terrain',
      CYCLONE: 'Carte du risque cyclonique',
    };

    const expectedTitle = expectedTitleByRiskType[riskType];

    if (!expectedTitle) {
      return maps;
    }

    return maps.filter((map) => map.title === expectedTitle);
  }

  async getRiskSummaryRows() {
    return this.query(`
      SELECT
        latest.risk_type AS "riskType",
        latest.label AS "riskLabel",
        latest.zone_type AS "zoneType",
        COUNT(*) AS "recordsCount",
        COUNT(DISTINCT latest.zone_id) AS "zoneCount",
        ROUND(AVG(latest.risk_mean)::numeric, 2) AS "riskMean",
        ROUND(MAX(latest.risk_max)::numeric, 2) AS "riskMax",
        ROUND(AVG(latest.hazard_mean)::numeric, 2) AS "hazardMean",
        ROUND(SUM(latest.population_exposed)::numeric, 2) AS "populationExposed"
      FROM (
        SELECT DISTINCT ON (z.zone_id, rt.risk_type)
          rt.risk_type,
          rt.label,
          z.zone_type,
          z.zone_id,
          f.risk_mean,
          f.risk_max,
          f.hazard_mean,
          f.population_exposed
        FROM dwh.fact_risk_indicator f
        JOIN dwh.dim_risk_type rt
          ON rt.risk_type_key = f.risk_type_key
        JOIN dwh.dim_zone z
          ON z.zone_key = f.zone_key
        ORDER BY z.zone_id, rt.risk_type, f.operational_updated_at DESC NULLS LAST
      ) latest
      GROUP BY
        latest.risk_type,
        latest.label,
        latest.zone_type
      ORDER BY
        latest.risk_type,
        latest.zone_type;
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
      SELECT *
      FROM (
        SELECT DISTINCT ON (z.zone_id, rt.risk_type)
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
          z.zone_id,
          rt.risk_type,
          f.operational_updated_at DESC NULLS LAST
      ) latest
      ORDER BY
        "riskMax" DESC NULLS LAST
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
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM raster_layers
      WHERE is_active = true
      ORDER BY created_at DESC;
    `);
  }

  async getNationalRiskPdf() {
    const [riskSummaryRows, topZoneRows, dataSourceRows, etlJobRows, rasterRows] =
      await Promise.all([
        this.getRiskSummaryRows(),
        this.getTopRiskZonesRows({
          zoneType: 'region',
          limit: 20,
        }),
        this.getDataSourcesRows(),
        this.getEtlJobsRows(5),
        this.getRasterRows(),
      ]);

    const riskSummary = riskSummaryRows as Record<string, any>[];
    const topZones = topZoneRows as Record<string, any>[];
    const dataSources = dataSourceRows as Record<string, any>[];
    const etlJobs = etlJobRows as Record<string, any>[];
    const rasters = rasterRows as Record<string, any>[];

    const [climateStats] = await this.query(`
      SELECT
        MAX(observed_date) AS "latestDate",
        AVG(temperature_mean) AS "temperatureMean",
        AVG(humidity_mean) AS "humidityMean",
        AVG(wind_speed_mean) AS "windSpeedMean",
        AVG(precipitation) AS "precipitation"
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
        COUNT(*) FILTER (WHERE niveau = 'CRITIQUE') AS critical,
        COUNT(*) FILTER (WHERE niveau = 'ELEVE') AS high,
        COUNT(*) FILTER (WHERE niveau = 'MOYEN') AS medium
      FROM alertes
    `);

    const [zoneStats] = await this.query(`
      SELECT
        COUNT(*) FILTER (WHERE zone_type = 'region') AS regions,
        COUNT(*) FILTER (WHERE zone_type = 'district') AS districts,
        COUNT(*) FILTER (WHERE zone_type = 'commune') AS communes,
        SUM(area_km2) FILTER (WHERE zone_type = 'region') AS area_km2
      FROM dwh.dim_zone
    `);

    const globalRegion = riskSummary.find(
      (row: Record<string, any>) =>
        row.riskType === 'GLOBAL' && row.zoneType === 'region',
    );

    const regionalRows = riskSummary.filter(
      (row: Record<string, any>) => row.zoneType === 'region',
    );

    const dominantRisk = [...regionalRows].sort(
      (a: Record<string, any>, b: Record<string, any>) =>
        Number(b.riskMax ?? 0) - Number(a.riskMax ?? 0),
    )[0];

    const uniqueTopRegions = Array.from(
      new Set(
        topZones
          .map((row: Record<string, any>) => row.zoneNom)
          .filter(Boolean),
      ),
    ).slice(0, 3);

    const topRegionNames = uniqueTopRegions.join(', ');
    const latestJob = etlJobs[0];

    const riskLabel = (riskType: string) => {
      const labels: Record<string, string> = {
        GLOBAL: 'Global',
        FLOOD: 'Inondation',
        DROUGHT: 'Sécheresse',
        LANDSLIDE: 'Glissement de terrain',
        CYCLONE: 'Cyclone',
      };

      return labels[riskType] ?? riskType;
    };

    const levelFromScore = (value: unknown) => {
      const score = Number(value ?? 0);

      if (score <= 30) return 'FAIBLE';
      if (score <= 60) return 'MOYEN';
      if (score <= 80) return 'ÉLEVÉ';

      return 'CRITIQUE';
    };

    const recommendationForRisk = (riskType: string) => {
      switch (riskType) {
        case 'FLOOD':
          return [
            'Renforcer la surveillance hydrologique.',
            'Vérifier les zones basses et les communes proches des cours d’eau.',
            'Préparer les dispositifs d’information communautaire.',
          ];
        case 'DROUGHT':
          return [
            'Renforcer le suivi hydrométéorologique.',
            'Anticiper les besoins en eau.',
            'Prioriser les zones agricoles sensibles.',
          ];
        case 'LANDSLIDE':
          return [
            'Surveiller les versants instables.',
            'Limiter l’exposition dans les zones de forte pente.',
            'Informer les autorités locales avant les épisodes pluvieux.',
          ];
        case 'CYCLONE':
          return [
            'Vérifier les plans de contingence.',
            'Surveiller les bulletins cycloniques officiels.',
            'Préparer les communications d’urgence.',
          ];
        default:
          return [
            'Maintenir la veille multi-risques.',
            'Prioriser les zones présentant les indices les plus élevés.',
            'Mettre à jour les données après chaque pipeline ETL.',
          ];
      }
    };

    return this.createPdfBuffer((doc) => {
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 42;
      const contentWidth = pageWidth - margin * 2;
      let pageNumber = 1;

      const addPage = () => {
        doc.addPage();
        pageNumber += 1;
        addHeader();
        doc.y = 70;
      };

      const addHeader = () => {
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor('#0f172a')
          .text(
            'RISKCLIM-MG — Rapport d’analyse des risques climatiques',
            margin,
            24,
            {
              width: contentWidth - 40,
              lineBreak: false,
            },
          );

        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#64748b')
          .text(String(pageNumber), pageWidth - 80, 24, {
            width: 40,
            align: 'right',
            lineBreak: false,
          });

        doc
          .moveTo(margin, 42)
          .lineTo(pageWidth - margin, 42)
          .strokeColor('#e2e8f0')
          .stroke();

        doc.x = margin;
      };

      const ensureSpace = (height = 80) => {
        if (doc.y + height > pageHeight - 60) {
          addPage();
        }
      };

      const sectionTitle = (title: string) => {
        ensureSpace(50);
        doc.x = margin;
        doc
          .moveDown(0.8)
          .fontSize(16)
          .font('Helvetica-Bold')
          .fillColor('#0f172a')
          .text(title, margin, doc.y, {
            width: contentWidth,
          });
        doc.moveDown(0.4);
      };

      const subTitle = (title: string) => {
        ensureSpace(40);
        doc.x = margin;
        doc
          .moveDown(0.4)
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor('#0f172a')
          .text(title, margin, doc.y, {
            width: contentWidth,
          });
        doc.moveDown(0.2);
      };

      const paragraph = (value: string) => {
        ensureSpace(45);
        doc.x = margin;
        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#334155')
          .text(value, margin, doc.y, {
            width: contentWidth,
            lineGap: 4,
          });
        doc.moveDown(0.25);
      };

      const bullet = (value: string) => {
        ensureSpace(25);
        doc.x = margin;
        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#334155')
          .text(`• ${value}`, margin + 10, doc.y, {
            width: contentWidth - 10,
            lineGap: 3,
          });
      };

      const checkBullet = (value: string) => {
        ensureSpace(25);
        doc.x = margin;
        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#334155')
          .text(`✓ ${value}`, margin + 10, doc.y, {
            width: contentWidth - 10,
            lineGap: 3,
          });
      };

      const infoRow = (label: string, value: string) => {
        ensureSpace(22);

        const y = doc.y;

        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor('#475569')
          .text(label, margin, y, {
            width: 150,
            lineBreak: false,
          });

        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#0f172a')
          .text(value, margin + 155, y, {
            width: contentWidth - 155,
          });

        doc.y = Math.max(doc.y, y + 16);
      };

      const scoreBox = (
        label: string,
        score: unknown,
        level: string,
        x: number,
        y: number,
      ) => {
        doc
          .roundedRect(x, y, 250, 76, 12)
          .fillAndStroke('#f8fafc', '#e2e8f0');

        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor('#64748b')
          .text(label, x + 14, y + 12, {
            width: 220,
          });

        doc
          .fontSize(24)
          .font('Helvetica-Bold')
          .fillColor('#0f172a')
          .text(`${this.formatNumber(score)}`, x + 14, y + 30, {
            width: 80,
            lineBreak: false,
          });

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#64748b')
          .text('/100', x + 88, y + 40, {
            width: 50,
            lineBreak: false,
          });

        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor('#2563eb')
          .text(`Niveau : ${level}`, x + 145, y + 39, {
            width: 90,
          });

        doc.x = margin;
      };

      const tableRow = (
        values: string[],
        widths: number[],
        options?: {
          header?: boolean;
        },
      ) => {
        ensureSpace(28);

        const y = doc.y;
        let x = margin;

        if (options?.header) {
          doc.rect(margin, y - 3, contentWidth, 22).fill('#f1f5f9');
        }

        values.forEach((value, index) => {
          doc
            .fontSize(options?.header ? 8 : 9)
            .font(options?.header ? 'Helvetica-Bold' : 'Helvetica')
            .fillColor(options?.header ? '#475569' : '#0f172a')
            .text(value, x + 4, y + 2, {
              width: widths[index] - 8,
              lineBreak: false,
              ellipsis: true,
            });

          x += widths[index];
        });

        doc.y = y + 23;
        doc
          .moveTo(margin, doc.y)
          .lineTo(pageWidth - margin, doc.y)
          .strokeColor('#e2e8f0')
          .stroke();
      };

      // PAGE 1 — Couverture
      doc.rect(0, 0, pageWidth, pageHeight).fill('#0f172a');

      doc
        .fillColor('#22c55e')
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('RISKCLIM-MG', margin, 70, {
          width: contentWidth,
        });

      doc
        .fillColor('#cbd5e1')
        .fontSize(11)
        .font('Helvetica')
        .text(
          'Système géodécisionnel spatial d’aide à la décision climatique',
          margin,
          96,
          {
            width: contentWidth,
          },
        );

      doc
        .fillColor('#ffffff')
        .fontSize(26)
        .font('Helvetica-Bold')
        .text('RAPPORT D’ANALYSE DES RISQUES CLIMATIQUES', margin, 150, {
          width: contentWidth,
          lineGap: 3,
        });

      doc
        .fontSize(12)
        .font('Helvetica')
        .fillColor('#cbd5e1')
        .text('Période', margin, 235, {
          width: contentWidth,
        })
        .font('Helvetica-Bold')
        .fillColor('#ffffff')
        .text('Dernières données consolidées', margin, 252, {
          width: contentWidth,
        });

      doc
        .font('Helvetica')
        .fillColor('#cbd5e1')
        .text('Zone', margin, 295, {
          width: contentWidth,
        })
        .font('Helvetica-Bold')
        .fillColor('#ffffff')
        .text('Madagascar', margin, 312, {
          width: contentWidth,
        });

      doc
        .font('Helvetica')
        .fillColor('#cbd5e1')
        .text('Date de génération', margin, 355, {
          width: contentWidth,
        })
        .font('Helvetica-Bold')
        .fillColor('#ffffff')
        .text(new Date().toLocaleDateString('fr-FR'), margin, 372, {
          width: contentWidth,
        });

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#94a3b8')
        .text(
          'Document généré automatiquement par RISKCLIM-MG',
          margin,
          pageHeight - 80,
          {
            width: contentWidth,
          },
        );

      // PAGE 2 — Sommaire
      addPage();

      doc
        .fontSize(22)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text('Sommaire', margin, doc.y, {
          width: contentWidth,
        });

      doc.moveDown();

      [
        '1. Résumé exécutif',
        '2. Présentation de la zone',
        '3. Synthèse des risques',
        '4. Analyse détaillée',
        '5. Évolution temporelle',
        '6. Carte des risques',
        '7. Alertes',
        '8. Recommandations',
        '9. Sources de données',
        '10. Annexes et métadonnées',
      ].forEach((item) => {
        doc
          .fontSize(11)
          .font('Helvetica')
          .fillColor('#334155')
          .text(item, margin, doc.y, {
            width: contentWidth,
            lineGap: 8,
          });
      });

      // PAGE 3 — Résumé + zone + synthèse
      addPage();

      sectionTitle('1. Résumé exécutif');

      const globalScore = globalRegion?.riskMean ?? null;
      const globalLevel = levelFromScore(globalScore);

      scoreBox('Risque global moyen', globalScore, globalLevel, margin, doc.y);

      doc.y += 92;

      paragraph(
        `Le système identifie un risque global moyen national de ${this.formatNumber(
          globalScore,
        )}/100. Le risque dominant observé dans les indicateurs régionaux est : ${
          dominantRisk?.riskLabel ?? 'non déterminé'
        }.`,
      );

      paragraph(
        `Les régions les plus exposées selon les derniers calculs sont : ${
          topRegionNames || 'non disponibles'
        }.`,
      );

      paragraph(
        `Alertes actives : ${this.formatNumber(
          alertStats?.active,
          0,
        )}. Alertes critiques : ${this.formatNumber(alertStats?.critical, 0)}.`,
      );

      paragraph(
        'Recommandation générale : maintenir une veille multi-risques et prioriser les zones présentant les indices les plus élevés.',
      );

      sectionTitle('2. Présentation de la zone');

      infoRow('Nom de la zone :', 'Madagascar');
      infoRow('Surface estimée :', `${this.formatNumber(zoneStats?.area_km2, 0)} km²`);
      infoRow('Nombre de régions :', this.formatNumber(zoneStats?.regions, 0));
      infoRow('Nombre de districts :', this.formatNumber(zoneStats?.districts, 0));
      infoRow('Nombre de communes :', this.formatNumber(zoneStats?.communes, 0));
      infoRow('Date de calcul :', new Date().toLocaleDateString('fr-FR'));

      sectionTitle('3. Synthèse des risques');

      tableRow(['Risque', 'Score moyen', 'Score max', 'Niveau'], [190, 110, 110, 110], {
        header: true,
      });

      regionalRows.forEach((row: Record<string, any>) => {
        tableRow(
          [
            row.riskLabel ?? row.riskType,
            this.formatNumber(row.riskMean),
            this.formatNumber(row.riskMax),
            levelFromScore(row.riskMax),
          ],
          [190, 110, 110, 110],
        );
      });

      // PAGE 4 — Analyse détaillée
      addPage();

      sectionTitle('4. Analyse détaillée');

      const modelDetails = [
        {
          riskType: 'FLOOD',
          title: '4.1 Inondation',
          criteria: [
            'CHIRPS — pluie récente',
            'HydroRIVERS — proximité hydrographique',
            'Pente inversée — zones favorables à l’accumulation',
            'WorldPop — population exposée',
            'ESA WorldCover — occupation du sol',
          ],
        },
        {
          riskType: 'DROUGHT',
          title: '4.2 Sécheresse',
          criteria: [
            'NASA POWER — déficit pluviométrique et température',
            'CHIRPS — pluie récente',
            'ESA WorldCover — sensibilité agricole et territoriale',
            'WorldPop — exposition humaine',
          ],
        },
        {
          riskType: 'LANDSLIDE',
          title: '4.3 Glissement de terrain',
          criteria: [
            'Copernicus DEM — pente',
            'CHIRPS — pluie récente',
            'ESA WorldCover — sensibilité de l’occupation du sol',
            'WorldPop — exposition humaine',
          ],
        },
        {
          riskType: 'CYCLONE',
          title: '4.4 Cyclone',
          criteria: [
            'IBTrACS — trajectoires cycloniques historiques',
            'CHIRPS — pluie récente',
            'ESA WorldCover — vulnérabilité de l’occupation du sol',
            'WorldPop — exposition humaine',
          ],
        },
      ];

      modelDetails.forEach((model) => {
        const row = regionalRows.find(
          (item: Record<string, any>) => item.riskType === model.riskType,
        );

        subTitle(model.title);

        paragraph(
          `Score moyen : ${this.formatNumber(
            row?.riskMean,
          )}/100 — Score maximum : ${this.formatNumber(
            row?.riskMax,
          )}/100 — Niveau : ${levelFromScore(row?.riskMax)}.`,
        );

        model.criteria.forEach((criterion) => bullet(criterion));

        paragraph(
          `Interprétation : le modèle ${riskLabel(
            model.riskType,
          ).toLowerCase()} combine les facteurs physiques, environnementaux et d’exposition afin de produire un indice d’aide à la décision.`,
        );
      });

      // PAGE 5 — Évolution + cartes + alertes
      addPage();

      sectionTitle('5. Évolution temporelle');

      paragraph(
        'Les séries temporelles sont calculées à partir du data warehouse et des observations climatiques disponibles. Les graphiques temporels détaillés seront enrichis dans les futures versions du module rapports.',
      );

      doc
        .roundedRect(margin, doc.y, contentWidth, 70, 12)
        .fillAndStroke('#f8fafc', '#e2e8f0');

      doc
        .fillColor('#475569')
        .fontSize(10)
        .font('Helvetica')
        .text(
          'Graphiques prévus : évolution du risque global, précipitations, température, humidité et zones critiques.',
          margin + 16,
          doc.y + 23,
          {
            width: contentWidth - 32,
          },
        );

      doc.y += 88;

      sectionTitle('6. Cartes des risques');

      const rasterMaps = this.getRasterMapSnapshots();

      if (rasterMaps.length > 0) {
        paragraph(
          'Les cartes ci-dessous sont générées automatiquement à partir des rasters de risque disponibles dans la plateforme.',
        );

        rasterMaps.forEach((map) => {
          ensureSpace(310);

          doc
            .fontSize(11)
            .font('Helvetica-Bold')
            .fillColor('#0f172a')
            .text(map.title, margin, doc.y, {
              width: contentWidth,
            });

          doc.moveDown(0.3);

          doc.image(map.path, margin, doc.y, {
            fit: [contentWidth, 260],
            align: 'center',
          });

          doc.y += 270;
        });
      } else {
        paragraph(
          'Les cartes raster sont disponibles dans la plateforme cartographique. Aucune image de carte générée pour rapport n’a été trouvée. Exécuter le script reports/generate_raster_map_snapshots.py pour produire les cartes PNG.',
        );
      }

      sectionTitle('7. Alertes');

      infoRow('Total alertes :', this.formatNumber(alertStats?.total, 0));
      infoRow('Alertes actives :', this.formatNumber(alertStats?.active, 0));
      infoRow('Alertes critiques :', this.formatNumber(alertStats?.critical, 0));
      infoRow('Alertes élevées :', this.formatNumber(alertStats?.high, 0));
      infoRow('Alertes moyennes :', this.formatNumber(alertStats?.medium, 0));

      // PAGE 6 — Recommandations + sources
      addPage();

      sectionTitle('8. Recommandations');

      topZones.slice(0, 6).forEach((row: Record<string, any>) => {
        ensureSpace(80);

        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('#0f172a')
          .text(`${row.zoneNom} — ${row.riskLabel}`, margin, doc.y, {
            width: contentWidth,
          });

        recommendationForRisk(row.riskType).forEach((item) => {
          checkBullet(item);
        });

        doc.moveDown(0.3);
      });

      sectionTitle('9. Sources de données');

      dataSources.forEach((source: Record<string, any>) => {
        bullet(
          `${source.name} — ${source.provider ?? '—'} — statut : ${source.status}`,
        );
      });

      subTitle('Informations pipeline');

      infoRow('Dernier ETL :', latestJob?.status ?? '—');
      infoRow('Message :', latestJob?.message ?? '—');
      infoRow(
        'Durée :',
        latestJob?.durationMs
          ? `${(latestJob.durationMs / 1000).toFixed(1)} s`
          : '—',
      );

      // PAGE 7 — Annexes
      addPage();

      sectionTitle('10. Annexes et métadonnées');

      bullet('Liste des régions, districts et communes intégrée dans la base géographique.');
      bullet('Statistiques zonales calculées directement depuis les rasters.');
      bullet('Poids dynamiques appliqués au risque global.');
      bullet('Poids experts initiaux appliqués aux modèles spécifiques.');
      bullet('Métadonnées raster enregistrées dans la table raster_layers.');
      bullet('Logs ETL disponibles dans les jobs de pipeline.');

      doc.moveDown();

      infoRow('Date de génération :', new Date().toLocaleString('fr-FR'));
      infoRow('Version du modèle :', 'V1 multi-risques documentée');
      infoRow('Nombre de sources :', this.formatNumber(dataSources.length, 0));
      infoRow('Nombre de rasters actifs :', this.formatNumber(rasters.length, 0));

      doc
        .moveDown(2)
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text(
          'Fin du rapport — Document généré automatiquement par RISKCLIM-MG',
          margin,
          doc.y,
          {
            width: contentWidth,
            align: 'center',
          },
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
    const [topZoneRows, dataSourceRows, etlJobRows] = await Promise.all([
      this.getTopRiskZonesRows(query),
      this.getDataSourcesRows(),
      this.getEtlJobsRows(3),
    ]);

    const rows = topZoneRows as Record<string, any>[];
    const dataSources = dataSourceRows as Record<string, any>[];
    const etlJobs = etlJobRows as Record<string, any>[];

    const riskLabel = (riskType: string) => {
      const labels: Record<string, string> = {
        GLOBAL: 'Global',
        FLOOD: 'Inondation',
        DROUGHT: 'Sécheresse',
        LANDSLIDE: 'Glissement de terrain',
        CYCLONE: 'Cyclone',
      };

      return labels[riskType] ?? riskType ?? 'Tous risques';
    };

    const levelFromScore = (value: unknown) => {
      const score = Number(value ?? 0);

      if (score <= 30) return 'FAIBLE';
      if (score <= 60) return 'MOYEN';
      if (score <= 80) return 'ÉLEVÉ';

      return 'CRITIQUE';
    };

    const recommendationForRisk = (riskType: string) => {
      switch (riskType) {
        case 'FLOOD':
          return 'Renforcer la surveillance hydrologique et prioriser les zones basses proches des cours d’eau.';
        case 'DROUGHT':
          return 'Anticiper les besoins en eau et prioriser le suivi des zones agricoles sensibles.';
        case 'LANDSLIDE':
          return 'Surveiller les versants instables et informer les autorités locales avant les épisodes pluvieux.';
        case 'CYCLONE':
          return 'Vérifier les plans de contingence et suivre les bulletins cycloniques officiels.';
        default:
          return 'Maintenir la veille multi-risques et prioriser les zones présentant les scores les plus élevés.';
      }
    };

    return this.createPdfBuffer((doc) => {
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 42;
      const contentWidth = pageWidth - margin * 2;
      let pageNumber = 1;

      const addHeader = () => {
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor('#0f172a')
          .text('RISKCLIM-MG — Rapport des zones exposées', margin, 24, {
            width: contentWidth - 40,
            lineBreak: false,
          });

        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#64748b')
          .text(String(pageNumber), pageWidth - 80, 24, {
            width: 40,
            align: 'right',
            lineBreak: false,
          });

        doc
          .moveTo(margin, 42)
          .lineTo(pageWidth - margin, 42)
          .strokeColor('#e2e8f0')
          .stroke();

        doc.x = margin;
      };

      const addPage = () => {
        doc.addPage();
        pageNumber += 1;
        addHeader();
        doc.y = 70;
      };

      const ensureSpace = (height = 70) => {
        if (doc.y + height > pageHeight - 60) {
          addPage();
        }
      };

      const sectionTitle = (title: string) => {
        ensureSpace(50);
        doc.x = margin;
        doc
          .moveDown(0.7)
          .fontSize(16)
          .font('Helvetica-Bold')
          .fillColor('#0f172a')
          .text(title, margin, doc.y, {
            width: contentWidth,
          });
        doc.moveDown(0.35);
      };

      const paragraph = (value: string) => {
        ensureSpace(42);
        doc.x = margin;
        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#334155')
          .text(value, margin, doc.y, {
            width: contentWidth,
            lineGap: 4,
          });
        doc.moveDown(0.25);
      };

      const infoRow = (label: string, value: string) => {
        ensureSpace(22);

        const y = doc.y;

        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor('#475569')
          .text(label, margin, y, {
            width: 145,
            lineBreak: false,
          });

        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#0f172a')
          .text(value, margin + 150, y, {
            width: contentWidth - 150,
          });

        doc.y = Math.max(doc.y, y + 16);
      };

      const tableRow = (
        values: string[],
        widths: number[],
        options?: {
          header?: boolean;
        },
      ) => {
        ensureSpace(30);

        const y = doc.y;
        let x = margin;

        if (options?.header) {
          doc.rect(margin, y - 3, contentWidth, 24).fill('#f1f5f9');
        }

        values.forEach((value, index) => {
          doc
            .fontSize(options?.header ? 8 : 8.5)
            .font(options?.header ? 'Helvetica-Bold' : 'Helvetica')
            .fillColor(options?.header ? '#475569' : '#0f172a')
            .text(value, x + 4, y + 3, {
              width: widths[index] - 8,
              lineBreak: false,
              ellipsis: true,
            });

          x += widths[index];
        });

        doc.y = y + 25;
        doc
          .moveTo(margin, doc.y)
          .lineTo(pageWidth - margin, doc.y)
          .strokeColor('#e2e8f0')
          .stroke();
      };

      const bullet = (value: string) => {
        ensureSpace(24);
        doc
          .fontSize(9.5)
          .font('Helvetica')
          .fillColor('#334155')
          .text(`• ${value}`, margin + 10, doc.y, {
            width: contentWidth - 10,
            lineGap: 3,
          });
      };

      const mainRiskLabel = query.riskType
        ? riskLabel(query.riskType)
        : 'Tous risques';
      const zoneTypeLabel = query.zoneType ?? 'region';

      // Page de garde
      doc.rect(0, 0, pageWidth, pageHeight).fill('#0f172a');

      doc
        .fillColor('#22c55e')
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('RISKCLIM-MG', margin, 70, {
          width: contentWidth,
        });

      doc
        .fillColor('#cbd5e1')
        .fontSize(11)
        .font('Helvetica')
        .text(
          'Système géodécisionnel spatial d’aide à la décision climatique',
          margin,
          96,
          {
            width: contentWidth,
          },
        );

      doc
        .fillColor('#ffffff')
        .fontSize(25)
        .font('Helvetica-Bold')
        .text('RAPPORT DES ZONES EXPOSÉES', margin, 150, {
          width: contentWidth,
          lineGap: 3,
        });

      doc
        .fontSize(12)
        .font('Helvetica')
        .fillColor('#cbd5e1')
        .text('Type de risque', margin, 235, {
          width: contentWidth,
        })
        .font('Helvetica-Bold')
        .fillColor('#ffffff')
        .text(mainRiskLabel, margin, 252, {
          width: contentWidth,
        });

      doc
        .font('Helvetica')
        .fillColor('#cbd5e1')
        .text('Niveau administratif', margin, 295, {
          width: contentWidth,
        })
        .font('Helvetica-Bold')
        .fillColor('#ffffff')
        .text(zoneTypeLabel, margin, 312, {
          width: contentWidth,
        });

      doc
        .font('Helvetica')
        .fillColor('#cbd5e1')
        .text('Date de génération', margin, 355, {
          width: contentWidth,
        })
        .font('Helvetica-Bold')
        .fillColor('#ffffff')
        .text(new Date().toLocaleDateString('fr-FR'), margin, 372, {
          width: contentWidth,
        });

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#94a3b8')
        .text(
          'Document généré automatiquement par RISKCLIM-MG',
          margin,
          pageHeight - 80,
          {
            width: contentWidth,
          },
        );

      // Page contenu
      addPage();

      sectionTitle('1. Contexte');

      paragraph(
        'Ce rapport présente les zones administratives les plus exposées selon les derniers indicateurs de risque disponibles dans le data warehouse RISKCLIM-MG.',
      );

      paragraph(
        'Les résultats sont calculés à partir des rasters de risque, des statistiques zonales, des sources de données réelles et du pipeline ETL.',
      );

      sectionTitle('2. Paramètres du rapport');

      infoRow('Risque :', mainRiskLabel);
      infoRow('Niveau administratif :', zoneTypeLabel);
      infoRow('Nombre de lignes :', this.formatNumber(rows.length, 0));
      infoRow('Date de génération :', new Date().toLocaleString('fr-FR'));

      sectionTitle('3. Résumé exécutif');

      if (rows.length > 0) {
        const top = rows[0];

        paragraph(
          `La zone la plus exposée est ${top.zoneNom ?? '—'} pour le risque ${
            top.riskLabel ?? mainRiskLabel
          }, avec un score maximum de ${this.formatNumber(
            top.riskMax,
          )}/100 et un niveau ${top.riskLevel ?? levelFromScore(top.riskMax)}.`,
        );

        const distinctZones = Array.from(
          new Set(rows.map((row) => row.zoneNom).filter(Boolean)),
        ).slice(0, 5);

        paragraph(
          `Les principales zones à surveiller sont : ${
            distinctZones.join(', ') || 'non disponibles'
          }.`,
        );
      } else {
        paragraph('Aucune zone exposée n’est disponible pour les paramètres sélectionnés.');
      }

      sectionTitle('4. Cartes des risques');

      const reportMaps = this.getRasterMapSnapshotsForRisk(query.riskType);

      if (reportMaps.length > 0) {
        paragraph(
          query.riskType
            ? 'La carte ci-dessous correspond au type de risque sélectionné dans le rapport.'
            : 'Les cartes ci-dessous présentent les principaux risques disponibles dans la plateforme.',
        );

        reportMaps.forEach((map) => {
          ensureSpace(310);

          doc
            .fontSize(11)
            .font('Helvetica-Bold')
            .fillColor('#0f172a')
            .text(map.title, margin, doc.y, {
              width: contentWidth,
            });

          doc.moveDown(0.3);

          doc.image(map.path, margin, doc.y, {
            fit: [contentWidth, 260],
            align: 'center',
          });

          doc.y += 270;
        });
      } else {
        paragraph(
          'Aucune image de carte générée n’a été trouvée. Exécuter le script reports/generate_raster_map_snapshots.py pour produire les cartes PNG.',
        );
      }

      sectionTitle('5. Tableau statistique');

      tableRow(
        ['#', 'Risque', 'Zone', 'Moyen', 'Max', 'Niveau', 'Population'],
        [35, 95, 135, 60, 60, 70, 55],
        { header: true },
      );

      rows.forEach((row: Record<string, any>, index: number) => {
        tableRow(
          [
            String(index + 1),
            row.riskLabel ?? riskLabel(row.riskType),
            row.zoneNom ?? '—',
            this.formatNumber(row.riskMean),
            this.formatNumber(row.riskMax),
            row.riskLevel ?? levelFromScore(row.riskMax),
            this.formatNumber(row.populationExposed, 0),
          ],
          [35, 95, 135, 60, 60, 70, 55],
        );
      });

      sectionTitle('6. Recommandations');

      rows.slice(0, 8).forEach((row: Record<string, any>) => {
        ensureSpace(50);

        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#0f172a')
          .text(`${row.zoneNom ?? 'Zone'} — ${row.riskLabel ?? riskLabel(row.riskType)}`, margin, doc.y, {
            width: contentWidth,
          });

        bullet(recommendationForRisk(row.riskType));
        doc.moveDown(0.3);
      });

      sectionTitle('7. Sources de données');

      dataSources.forEach((source: Record<string, any>) => {
        bullet(
          `${source.name} — ${source.provider ?? '—'} — statut : ${source.status}`,
        );
      });

      sectionTitle('8. Métadonnées');

      const latestJob = etlJobs[0];

      infoRow('Dernier ETL :', latestJob?.status ?? '—');
      infoRow('Message ETL :', latestJob?.message ?? '—');
      infoRow(
        'Durée ETL :',
        latestJob?.durationMs
          ? `${(latestJob.durationMs / 1000).toFixed(1)} s`
          : '—',
      );
      infoRow('Version du rapport :', '1.0');

      doc
        .moveDown(1.5)
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text(
          'Fin du rapport — Document généré automatiquement par RISKCLIM-MG',
          margin,
          doc.y,
          {
            width: contentWidth,
            align: 'center',
          },
        );
    });
  }


  async getRiskComparison(query: {
    periodAStart: string;
    periodAEnd: string;
    periodBStart: string;
    periodBEnd: string;
    riskType?: string;
    zoneType?: string;
  }) {
    const zoneType = query.zoneType ?? 'region';
    const riskType = query.riskType ?? null;

    return this.query(
      `
      WITH period_a AS (
        SELECT
          rt.risk_type,
          rt.label AS risk_label,
          z.zone_type,
          z.zone_id,
          z.zone_nom,
          AVG(f.risk_mean) AS risk_mean_a,
          MAX(f.risk_max) AS risk_max_a,
          SUM(f.population_exposed) AS population_exposed_a,
          COUNT(*) AS records_a
        FROM dwh.fact_risk_indicator f
        JOIN dwh.dim_risk_type rt ON rt.risk_type_key = f.risk_type_key
        JOIN dwh.dim_zone z ON z.zone_key = f.zone_key
        JOIN dwh.dim_time t ON t.time_key = f.time_key
        WHERE t.full_date BETWEEN $1::date AND $2::date
          AND z.zone_type = $5
          AND ($6::text IS NULL OR rt.risk_type = $6)
        GROUP BY rt.risk_type, rt.label, z.zone_type, z.zone_id, z.zone_nom
      ),
      period_b AS (
        SELECT
          rt.risk_type,
          rt.label AS risk_label,
          z.zone_type,
          z.zone_id,
          z.zone_nom,
          AVG(f.risk_mean) AS risk_mean_b,
          MAX(f.risk_max) AS risk_max_b,
          SUM(f.population_exposed) AS population_exposed_b,
          COUNT(*) AS records_b
        FROM dwh.fact_risk_indicator f
        JOIN dwh.dim_risk_type rt ON rt.risk_type_key = f.risk_type_key
        JOIN dwh.dim_zone z ON z.zone_key = f.zone_key
        JOIN dwh.dim_time t ON t.time_key = f.time_key
        WHERE t.full_date BETWEEN $3::date AND $4::date
          AND z.zone_type = $5
          AND ($6::text IS NULL OR rt.risk_type = $6)
        GROUP BY rt.risk_type, rt.label, z.zone_type, z.zone_id, z.zone_nom
      )
      SELECT
        COALESCE(a.risk_type, b.risk_type) AS "riskType",
        COALESCE(a.risk_label, b.risk_label) AS "riskLabel",
        COALESCE(a.zone_type, b.zone_type) AS "zoneType",
        COALESCE(a.zone_id, b.zone_id) AS "zoneId",
        COALESCE(a.zone_nom, b.zone_nom) AS "zoneNom",
        ROUND(a.risk_mean_a::numeric, 2) AS "riskMeanA",
        ROUND(b.risk_mean_b::numeric, 2) AS "riskMeanB",
        ROUND((b.risk_mean_b - a.risk_mean_a)::numeric, 2) AS "riskMeanDelta",
        ROUND(a.risk_max_a::numeric, 2) AS "riskMaxA",
        ROUND(b.risk_max_b::numeric, 2) AS "riskMaxB",
        ROUND((b.risk_max_b - a.risk_max_a)::numeric, 2) AS "riskMaxDelta",
        ROUND(a.population_exposed_a::numeric, 2) AS "populationExposedA",
        ROUND(b.population_exposed_b::numeric, 2) AS "populationExposedB",
        ROUND((b.population_exposed_b - a.population_exposed_a)::numeric, 2) AS "populationExposedDelta",
        COALESCE(a.records_a, 0) AS "recordsA",
        COALESCE(b.records_b, 0) AS "recordsB"
      FROM period_a a
      FULL OUTER JOIN period_b b
        ON a.risk_type = b.risk_type
       AND a.zone_id = b.zone_id
      ORDER BY
        "riskMaxDelta" DESC NULLS LAST,
        "riskMaxB" DESC NULLS LAST
      LIMIT 200;
      `,
      [
        query.periodAStart,
        query.periodAEnd,
        query.periodBStart,
        query.periodBEnd,
        zoneType,
        riskType,
      ],
    );
  }

  async getRiskComparisonExcel(query: {
    periodAStart: string;
    periodAEnd: string;
    periodBStart: string;
    periodBEnd: string;
    riskType?: string;
    zoneType?: string;
  }) {
    const rows = await this.getRiskComparison(query);

    return this.toExcelBuffer([
      {
        name: 'Comparaison risques',
        rows,
      },
    ]);
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
