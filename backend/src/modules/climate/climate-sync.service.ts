import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { execFile } from 'child_process';
import { existsSync } from 'fs';
import { join, resolve } from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

@Injectable()
export class ClimateSyncService {
  private readonly logger = new Logger(ClimateSyncService.name);
  private running = false;

  private getProjectRoot() {
    return resolve(process.cwd(), '..');
  }

  private getEtlDir() {
    return join(this.getProjectRoot(), 'etl');
  }

  private getPythonBin() {
    const etlDir = this.getEtlDir();
    const venvPython = join(etlDir, '.venv', 'bin', 'python');

    return process.env.PYTHON_BIN ?? (existsSync(venvPython) ? venvPython : 'python3');
  }

  async syncNasaPowerRegions() {
    if (this.running) {
      throw new ConflictException(
        'Une synchronisation NASA POWER est déjà en cours.',
      );
    }

    this.running = true;

    const pythonBin = this.getPythonBin();
    const etlDir = this.getEtlDir();
    const script = 'climate/nasa_power/fetch_nasa_power_regions.py';

    const startedAt = Date.now();

    this.logger.log('Démarrage synchronisation NASA POWER régions');

    try {
      const { stdout, stderr } = await execFileAsync(pythonBin, [script], {
        cwd: etlDir,
        env: {
          ...process.env,
        },
        timeout: 20 * 60 * 1000,
        maxBuffer: 1024 * 1024 * 30,
      });

      const durationMs = Date.now() - startedAt;

      this.logger.log(
        `Synchronisation NASA POWER terminée (${durationMs}ms)`,
      );

      if (stderr?.trim()) {
        this.logger.warn(`NASA POWER stderr: ${stderr.slice(0, 2000)}`);
      }

      if (stdout?.trim()) {
        this.logger.log(`NASA POWER stdout: ${stdout.slice(-2000)}`);
      }

      return {
        message: 'Synchronisation NASA POWER exécutée avec succès.',
        script,
        status: 'SUCCESS',
        durationMs,
      };
    } catch (error) {
      const durationMs = Date.now() - startedAt;

      this.logger.error(
        'Échec de la synchronisation NASA POWER',
        error instanceof Error ? error.stack : String(error),
      );

      throw new InternalServerErrorException({
        message: 'Échec de la synchronisation NASA POWER.',
        script,
        status: 'FAILED',
        durationMs,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.running = false;
    }
  }
}
