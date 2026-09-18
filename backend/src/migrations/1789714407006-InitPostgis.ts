import { MigrationInterface, QueryRunner } from "typeorm";

export class InitPostgis1789714407006 implements MigrationInterface {
    name = 'InitPostgis1789714407006';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis`);
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis_topology`);
        await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS oltp`);
        await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS dwh`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // On ne supprime pas PostGIS ni les schémas partagés automatiquement.
        // Cela évite de casser d'autres objets ou extensions utilisés par la base.
    }
}
