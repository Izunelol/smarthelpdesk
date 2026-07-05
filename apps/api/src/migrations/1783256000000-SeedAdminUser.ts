import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;
const SEED_PASSWORD = 'senha123';
const ADMIN_EMAIL = 'admin@smarthelpdesk.com';

export class SeedAdminUser1783256000000 implements MigrationInterface {
  name = 'SeedAdminUser1783256000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const passwordHash = await bcrypt.hash(SEED_PASSWORD, SALT_ROUNDS);
    await queryRunner.query(
      `INSERT INTO "users" ("name", "email", "password_hash", "role") VALUES ($1, $2, $3, $4)`,
      ['Administrador', ADMIN_EMAIL, passwordHash, 'ADMIN'],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "users" WHERE "email" = $1`, [ADMIN_EMAIL]);
  }
}
