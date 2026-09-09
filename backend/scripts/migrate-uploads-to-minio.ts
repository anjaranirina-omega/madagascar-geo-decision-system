import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { existsSync, readFileSync } from 'fs';
import { basename, extname, join, resolve } from 'path';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { GeneratedReport } from '../src/modules/reports/entities/generated-report.entity';
import { StorageService } from '../src/modules/storage/storage.service';
import { User } from '../src/modules/users/entities/user.entity';

interface MigrationResult {
  total: number;
  migrated: number;
  skipped: number;
  failed: number;
  errors: Array<{ id: string; name: string; error: string }>;
}

function getMimeTypeFromExtension(extension: string): string {
  switch (extension.toLowerCase()) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.pdf':
      return 'application/pdf';
    case '.xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case '.csv':
      return 'text/csv';
    default:
      return 'application/octet-stream';
  }
}

function findLocalFile(candidatePaths: string[]): string | null {
  for (const p of candidatePaths) {
    if (existsSync(p)) {
      return p;
    }
  }
  return null;
}

async function runMigration() {
  console.log('======================================================');
  console.log('🚀 MIGRATION DES FICHIERS LOCAUX VERS MINIO (S3)');
  console.log('======================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const storageService = app.get(StorageService);
  const userRepository = app.get<Repository<User>>(getRepositoryToken(User));
  const reportsRepository = app.get<Repository<GeneratedReport>>(
    getRepositoryToken(GeneratedReport),
  );

  const cwd = process.cwd();
  const projectRoot = resolve(cwd, '..');

  // Ensure MinIO buckets are ready
  console.log('📦 Vérification et initialisation des buckets MinIO...');
  await storageService.ensureBucketsExist();
  console.log(
    `✔ Buckets cibles : "${storageService.avatarsBucket}" & "${storageService.reportsBucket}"\n`,
  );

  // ---------------------------------------------------------------------------
  // 1. MIGRATION DES AVATARS UTILISATEURS
  // ---------------------------------------------------------------------------
  console.log('------------------------------------------------------');
  console.log('👤 [1/2] Migration des avatars utilisateurs...');
  console.log('------------------------------------------------------');

  const avatarResults: MigrationResult = {
    total: 0,
    migrated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  const users = await userRepository.find();
  avatarResults.total = users.length;

  for (const user of users) {
    if (!user.avatarUrl) {
      avatarResults.skipped++;
      continue;
    }

    // Check if the avatar is already migrated to MinIO / S3
    const isAlreadyMigrated =
      user.avatarUrl.includes(storageService.avatarsBucket) ||
      user.avatarUrl.includes('avatars/user-') ||
      (!user.avatarUrl.includes('/uploads/avatars/') &&
        !user.avatarUrl.includes('uploads/avatars/'));

    if (isAlreadyMigrated) {
      console.log(
        `  ⏩ [SKIP] Utilisateur ${user.id} (${user.email}) : avatar déjà sur MinIO (${user.avatarUrl})`,
      );
      avatarResults.skipped++;
      continue;
    }

    try {
      // Extract file name from avatarUrl (ex: "avatar-1724830000000-123456.png")
      const filename = basename(user.avatarUrl.split('?')[0]);

      // Search across possible local directories
      const candidatePaths = [
        join(cwd, 'uploads', 'avatars', filename),
        join(cwd, 'backend', 'uploads', 'avatars', filename),
        join(projectRoot, 'backend', 'uploads', 'avatars', filename),
        join(projectRoot, 'uploads', 'avatars', filename),
      ];

      const localFilePath = findLocalFile(candidatePaths);

      if (!localFilePath) {
        throw new Error(
          `Fichier local introuvable sur disque pour "${user.avatarUrl}". Chemins vérifiés : ${candidatePaths.join(', ')}`,
        );
      }

      const fileBuffer = readFileSync(localFilePath);
      const ext = extname(filename) || '.webp';
      const mimeType = getMimeTypeFromExtension(ext);
      const s3Key = `avatars/user-${user.id}/${filename}`;

      // Upload to MinIO
      const newAvatarUrl = await storageService.putObject(
        storageService.avatarsBucket,
        s3Key,
        fileBuffer,
        mimeType,
      );

      // Update in DB
      user.avatarUrl = newAvatarUrl;
      await userRepository.save(user);

      console.log(
        `  ✔ [OK] Utilisateur ${user.id} (${user.email}) : migré -> ${newAvatarUrl}`,
      );
      avatarResults.migrated++;
    } catch (error: any) {
      console.error(
        `  ❌ [ERREUR] Utilisateur ${user.id} (${user.email}) : ${error.message}`,
      );
      avatarResults.failed++;
      avatarResults.errors.push({
        id: user.id,
        name: user.email,
        error: error.message,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 2. MIGRATION DES RAPPORTS GÉNÉRÉS
  // ---------------------------------------------------------------------------
  console.log('\n------------------------------------------------------');
  console.log('📄 [2/2] Migration des rapports générés...');
  console.log('------------------------------------------------------');

  const reportResults: MigrationResult = {
    total: 0,
    migrated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  const reports = await reportsRepository.find();
  reportResults.total = reports.length;

  for (const report of reports) {
    // Check if the report is already migrated to MinIO (key starts with reports/)
    const isAlreadyMigrated =
      report.filePath.startsWith('reports/') ||
      (!report.filePath.startsWith('backend/uploads/') &&
        !report.filePath.startsWith('uploads/') &&
        !report.filePath.startsWith('/uploads/'));

    if (isAlreadyMigrated) {
      console.log(
        `  ⏩ [SKIP] Rapport ${report.id} ("${report.title}") : déjà sur MinIO (${report.filePath})`,
      );
      reportResults.skipped++;
      continue;
    }

    try {
      const filename = basename(report.filePath);

      // Search across possible local directories
      const candidatePaths = [
        join(cwd, report.filePath),
        join(projectRoot, report.filePath),
        join(cwd, 'backend', 'uploads', 'reports', filename),
        join(cwd, 'uploads', 'reports', filename),
        join(projectRoot, 'backend', 'uploads', 'reports', filename),
      ];

      const localFilePath = findLocalFile(candidatePaths);

      if (!localFilePath) {
        throw new Error(
          `Fichier local introuvable sur disque pour "${report.filePath}". Chemins vérifiés : ${candidatePaths.join(', ')}`,
        );
      }

      const fileBuffer = readFileSync(localFilePath);
      const ext = extname(filename) || `.${report.format.toLowerCase()}`;
      const mimeType = report.mimeType || getMimeTypeFromExtension(ext);

      // Construct consistent S3 key: reports/{YYYY}/{MM}/{filename}
      const createdAt = report.createdAt ? new Date(report.createdAt) : new Date();
      const year = createdAt.getFullYear();
      const month = String(createdAt.getMonth() + 1).padStart(2, '0');
      const s3Key = `reports/${year}/${month}/${filename}`;

      // Upload to MinIO
      await storageService.putObject(
        storageService.reportsBucket,
        s3Key,
        fileBuffer,
        mimeType,
      );

      // Update in DB
      report.filePath = s3Key;
      await reportsRepository.save(report);

      console.log(
        `  ✔ [OK] Rapport ${report.id} ("${report.title}") : migré -> ${s3Key}`,
      );
      reportResults.migrated++;
    } catch (error: any) {
      console.error(
        `  ❌ [ERREUR] Rapport ${report.id} ("${report.title}") : ${error.message}`,
      );
      reportResults.failed++;
      reportResults.errors.push({
        id: report.id,
        name: report.title,
        error: error.message,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 3. RAPPORT FINAL ET RÉSUMÉ
  // ---------------------------------------------------------------------------
  console.log('\n======================================================');
  console.log('📊 RÉSUMÉ FINAL DE LA MIGRATION MINIO');
  console.log('======================================================');

  console.log('\n👤 AVATARS UTILISATEURS :');
  console.log(`  • Total scanné : ${avatarResults.total}`);
  console.log(`  • Migrés avec succès : ${avatarResults.migrated}`);
  console.log(`  • Ignorés (déjà migrés ou sans avatar) : ${avatarResults.skipped}`);
  console.log(`  • Échecs : ${avatarResults.failed}`);

  if (avatarResults.errors.length > 0) {
    console.log('  Détail des erreurs avatars :');
    for (const err of avatarResults.errors) {
      console.log(`    - [${err.name}] : ${err.error}`);
    }
  }

  console.log('\n📄 RAPPORTS GÉNÉRÉS :');
  console.log(`  • Total scanné : ${reportResults.total}`);
  console.log(`  • Migrés avec succès : ${reportResults.migrated}`);
  console.log(`  • Ignorés (déjà migrés) : ${reportResults.skipped}`);
  console.log(`  • Échecs : ${reportResults.failed}`);

  if (reportResults.errors.length > 0) {
    console.log('  Détail des erreurs rapports :');
    for (const err of reportResults.errors) {
      console.log(`    - [${err.name}] : ${err.error}`);
    }
  }

  console.log('\n======================================================');
  if (avatarResults.failed === 0 && reportResults.failed === 0) {
    console.log('🎉 MIGRATION COMPLÉTÉE SANS AUCUNE ERREUR !');
  } else {
    console.log(
      `⚠️ MIGRATION TERMINÉE AVEC ${avatarResults.failed + reportResults.failed} ERREUR(S). Consultez les logs ci-dessus.`,
    );
  }
  console.log('======================================================\n');

  await app.close();
}

runMigration().catch((error) => {
  console.error('💥 Erreur fatale lors de la migration :', error);
  process.exit(1);
});
