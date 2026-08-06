import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DataSourceCategory,
  DataSourceCode,
  DataSourceStatus,
  DataSourceStatusEntity,
} from './entities/data-source-status.entity';

type SeedDataSource = {
  code: DataSourceCode;
  name: string;
  category: DataSourceCategory;
  provider: string;
  description: string;
  url: string;
  status: DataSourceStatus;
  metadata?: Record<string, unknown>;
};

const DEFAULT_DATA_SOURCES: SeedDataSource[] = [
  {
    code: DataSourceCode.CHIRPS,
    name: 'CHIRPS',
    category: DataSourceCategory.CLIMATE,
    provider: 'Climate Hazards Center - UCSB',
    description:
      'Précipitations satellitaires quasi temps réel utilisées pour les modèles de risque.',
    url: 'https://data.chc.ucsb.edu/products/CHIRPS-2.0/',
    status: DataSourceStatus.CONNECTED,
    metadata: {
      variable: 'rainfall',
      spatialResolution: '0.05°',
      usage: ['risk_global', 'flood_risk', 'drought_future'],
    },
  },
  {
    code: DataSourceCode.COPERNICUS_DEM,
    name: 'Copernicus DEM GLO-30',
    category: DataSourceCategory.TOPOGRAPHY,
    provider: 'Copernicus / OpenTopography',
    description:
      'Modèle numérique d’élévation utilisé pour calculer la pente et les facteurs topographiques.',
    url: 'https://portal.opentopography.org/',
    status: DataSourceStatus.CONNECTED,
    metadata: {
      variable: 'elevation/slope',
      spatialResolution: '30 m',
      usage: ['slope', 'flood_risk', 'landslide_future'],
    },
  },
  {
    code: DataSourceCode.WORLDPOP,
    name: 'WorldPop',
    category: DataSourceCategory.POPULATION,
    provider: 'WorldPop',
    description:
      'Population spatialisée utilisée pour estimer l’exposition des habitants.',
    url: 'https://www.worldpop.org/',
    status: DataSourceStatus.CONNECTED,
    metadata: {
      country: 'MDG',
      year: 2020,
      usage: ['exposure', 'zone_indicators'],
    },
  },
  {
    code: DataSourceCode.ESA_WORLDCOVER,
    name: 'ESA WorldCover',
    category: DataSourceCategory.LANDCOVER,
    provider: 'European Space Agency',
    description:
      'Occupation du sol utilisée pour représenter la vulnérabilité territoriale.',
    url: 'https://esa-worldcover.org/',
    status: DataSourceStatus.CONNECTED,
    metadata: {
      year: 2021,
      version: 'v200',
      usage: ['landcover', 'vulnerability'],
    },
  },
  {
    code: DataSourceCode.HYDRORIVERS,
    name: 'HydroRIVERS / HydroSHEDS',
    category: DataSourceCategory.HYDROLOGY,
    provider: 'HydroSHEDS',
    description:
      'Réseau hydrographique vectoriel utilisé pour calculer la proximité aux rivières dans le modèle inondation.',
    url: 'https://www.hydrosheds.org/products/hydrorivers',
    status: DataSourceStatus.CONNECTED,
    metadata: {
      region: 'Africa',
      usage: ['river_proximity', 'flood_risk'],
    },
  },
  {
    code: DataSourceCode.OPENWEATHER,
    name: 'OpenWeather',
    category: DataSourceCategory.WEATHER,
    provider: 'OpenWeather',
    description:
      'Météo actuelle utilisée pour l’observation temps réel et les facteurs aggravants futurs.',
    url: 'https://openweathermap.org/api',
    status: DataSourceStatus.CONNECTED,
    metadata: {
      usage: ['current_weather', 'map_panel', 'weather_risk_future'],
    },
  },
  {
    code: DataSourceCode.IBTRACS,
    name: 'IBTrACS',
    category: DataSourceCategory.CYCLONE,
    provider: 'NOAA / NCEI',
    description:
      'Archive internationale des trajectoires cycloniques utilisée pour modéliser l’aléa cyclonique historique.',
    url: 'https://www.ncei.noaa.gov/products/international-best-track-archive',
    status: DataSourceStatus.PENDING,
    metadata: {
      basin: 'South Indian Ocean',
      usage: ['cyclone_historical_hazard', 'cyclone_risk'],
    },
  },
  {
    code: DataSourceCode.NASA_POWER,
    name: 'NASA POWER',
    category: DataSourceCategory.CLIMATE,
    provider: 'NASA',
    description:
      'Source climatique prévue pour température, vent et séries climatiques historiques.',
    url: 'https://power.larc.nasa.gov/',
    status: DataSourceStatus.PENDING,
    metadata: {
      planned: true,
      usage: ['temperature_future', 'wind_future', 'climate_history_future'],
    },
  },
];

@Injectable()
export class DataSourcesService implements OnModuleInit {
  constructor(
    @InjectRepository(DataSourceStatusEntity)
    private readonly dataSourcesRepository: Repository<DataSourceStatusEntity>,
  ) {}

  async onModuleInit() {
    await this.seedDefaults();
  }

  async seedDefaults() {
    for (const source of DEFAULT_DATA_SOURCES) {
      const existing = await this.dataSourcesRepository.findOne({
        where: {
          code: source.code,
        },
      });

      if (existing) {
        await this.dataSourcesRepository.save({
          ...existing,
          name: source.name,
          category: source.category,
          provider: source.provider,
          description: source.description,
          url: source.url,
          metadata: {
            ...(existing.metadata ?? {}),
            ...(source.metadata ?? {}),
          },
        });

        continue;
      }

      await this.dataSourcesRepository.save(
        this.dataSourcesRepository.create({
          ...source,
          lastSyncAt:
            source.status === DataSourceStatus.CONNECTED ? new Date() : null,
          lastSuccessAt:
            source.status === DataSourceStatus.CONNECTED ? new Date() : null,
        }),
      );
    }
  }

  findAll() {
    return this.dataSourcesRepository.find({
      order: {
        category: 'ASC',
        name: 'ASC',
      },
    });
  }

  findOne(code: DataSourceCode) {
    return this.dataSourcesRepository.findOne({
      where: {
        code,
      },
    });
  }

  async markSyncStart(code: DataSourceCode) {
    const source = await this.findOrCreate(code);

    source.lastSyncAt = new Date();
    source.status = DataSourceStatus.PENDING;

    return this.dataSourcesRepository.save(source);
  }

  async markSuccess(
    code: DataSourceCode,
    metadata?: Record<string, unknown> | null,
  ) {
    const source = await this.findOrCreate(code);

    source.status = DataSourceStatus.CONNECTED;
    source.lastSyncAt = new Date();
    source.lastSuccessAt = new Date();
    source.lastErrorMessage = null;

    if (metadata) {
      source.metadata = {
        ...(source.metadata ?? {}),
        ...metadata,
      };
    }

    return this.dataSourcesRepository.save(source);
  }

  async markFailed(code: DataSourceCode, errorMessage: string) {
    const source = await this.findOrCreate(code);

    source.status = DataSourceStatus.FAILED;
    source.lastSyncAt = new Date();
    source.lastErrorAt = new Date();
    source.lastErrorMessage = errorMessage;

    return this.dataSourcesRepository.save(source);
  }

  private async findOrCreate(code: DataSourceCode) {
    const existing = await this.findOne(code);

    if (existing) {
      return existing;
    }

    const seed = DEFAULT_DATA_SOURCES.find((item) => item.code === code);

    return this.dataSourcesRepository.save(
      this.dataSourcesRepository.create({
        code,
        name: seed?.name ?? code,
        category: seed?.category ?? DataSourceCategory.CLIMATE,
        provider: seed?.provider ?? null,
        description: seed?.description ?? null,
        url: seed?.url ?? null,
        status: DataSourceStatus.PENDING,
        metadata: seed?.metadata ?? null,
      }),
    );
  }
}
