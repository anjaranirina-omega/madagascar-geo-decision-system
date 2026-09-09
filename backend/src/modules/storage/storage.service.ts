import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  public readonly avatarsBucket: string;
  public readonly reportsBucket: string;
  private readonly publicBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    const endpoint =
      this.configService.get<string>('S3_ENDPOINT') || 'http://localhost:9000';
    const region =
      this.configService.get<string>('S3_REGION') || 'us-east-1';
    const accessKeyId =
      this.configService.get<string>('S3_ACCESS_KEY') ||
      this.configService.get<string>('MINIO_ROOT_USER') ||
      'minioadmin';
    const secretAccessKey =
      this.configService.get<string>('S3_SECRET_KEY') ||
      this.configService.get<string>('MINIO_ROOT_PASSWORD') ||
      'minioadmin123';
    const forcePathStyle =
      this.configService.get<string>('S3_FORCE_PATH_STYLE') !== 'false';
    const useSsl =
      this.configService.get<string>('S3_USE_SSL') === 'true';

    this.avatarsBucket =
      this.configService.get<string>('S3_BUCKET_AVATARS') ||
      'geodecisionnel-avatars';
    this.reportsBucket =
      this.configService.get<string>('S3_BUCKET_REPORTS') ||
      'geodecisionnel-reports';

    this.publicBaseUrl = (
      this.configService.get<string>('S3_PUBLIC_URL') || endpoint
    ).replace(/\/+$/, '');

    this.client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle,
      tls: useSsl,
    });
  }

  async onModuleInit() {
    await this.ensureBucketsExist();
  }

  async ensureBucketsExist(): Promise<void> {
    const buckets = [this.avatarsBucket, this.reportsBucket];

    for (const bucket of buckets) {
      try {
        await this.client.send(new HeadBucketCommand({ Bucket: bucket }));
        this.logger.log(`Bucket S3/MinIO '${bucket}' prêt.`);
      } catch (error: any) {
        if (
          error.name === 'NotFound' ||
          error.name === 'NoSuchBucket' ||
          error.$metadata?.httpStatusCode === 404
        ) {
          try {
            await this.client.send(new CreateBucketCommand({ Bucket: bucket }));
            this.logger.log(`Bucket S3/MinIO '${bucket}' créé avec succès.`);

            if (bucket === this.avatarsBucket) {
              await this.setBucketPublicReadPolicy(bucket);
            }
          } catch (createErr: any) {
            this.logger.warn(
              `Impossible de créer le bucket '${bucket}': ${createErr.message}`,
            );
          }
        } else {
          this.logger.warn(
            `Vérification du bucket '${bucket}' ignorée (MinIO/S3 non joignable au démarrage): ${error.message}`,
          );
        }
      }
    }
  }

  private async setBucketPublicReadPolicy(bucket: string): Promise<void> {
    try {
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'PublicReadGetObject',
            Effect: 'Allow',
            Principal: '*',
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucket}/*`],
          },
        ],
      };

      await this.client.send(
        new PutBucketPolicyCommand({
          Bucket: bucket,
          Policy: JSON.stringify(policy),
        }),
      );
      this.logger.log(`Politique de lecture publique appliquée à '${bucket}'.`);
    } catch (policyErr: any) {
      this.logger.warn(
        `Impossible d'appliquer la politique publique sur '${bucket}': ${policyErr.message}`,
      );
    }
  }

  async putObject(
    bucket: string,
    key: string,
    body: Buffer | Uint8Array | string,
    contentType = 'application/octet-stream',
    metadata?: Record<string, string>,
  ): Promise<string> {
    const buffer =
      typeof body === 'string'
        ? Buffer.from(body, 'utf8')
        : body instanceof Uint8Array
          ? Buffer.from(body)
          : body;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      Metadata: metadata,
    });

    await this.client.send(command);

    return this.getPublicUrl(bucket, key);
  }

  async getObjectStream(bucket: string, key: string): Promise<Readable> {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await this.client.send(command);
    return response.Body as Readable;
  }

  async getPresignedDownloadUrl(
    bucket: string,
    key: string,
    expiresInSeconds = 300,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async deleteObject(bucket: string, key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await this.client.send(command);
    this.logger.log(`Objet S3/MinIO supprimé: ${bucket}/${key}`);
  }

  getPublicUrl(bucket: string, key: string): string {
    const cleanKey = key.replace(/^\/+/, '');
    return `${this.publicBaseUrl}/${bucket}/${cleanKey}`;
  }

  extractKeyFromUrl(
    url: string,
    defaultBucket?: string,
  ): { bucket: string; key: string } | null {
    if (!url) return null;
    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname.replace(/^\/+/, '');
      const segments = pathname.split('/');

      if (defaultBucket) {
        const bucketIndex = segments.indexOf(defaultBucket);
        if (bucketIndex !== -1 && bucketIndex < segments.length - 1) {
          return {
            bucket: defaultBucket,
            key: segments.slice(bucketIndex + 1).join('/'),
          };
        }
      }

      if (segments.length >= 2) {
        return {
          bucket: segments[0],
          key: segments.slice(1).join('/'),
        };
      }
    } catch {
      if (url.includes('/')) {
        const segments = url.replace(/^\/+/, '').split('/');
        if (
          defaultBucket &&
          segments[0] === defaultBucket &&
          segments.length > 1
        ) {
          return {
            bucket: defaultBucket,
            key: segments.slice(1).join('/'),
          };
        }
      }
    }
    return null;
  }
}
