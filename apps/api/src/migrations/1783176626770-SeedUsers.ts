import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;
const SEED_PASSWORD = 'senha123';

const SEED_USERS = [
  { name: 'Técnico Nível 2', email: 'tecnico@smarthelpdesk.com', role: 'TECHNICIAN' },
  { name: 'Especialista Nível 3', email: 'especialista@smarthelpdesk.com', role: 'SPECIALIST' },
  { name: 'Usuário Solicitante', email: 'usuario@smarthelpdesk.com', role: 'USER' },
];

export class SeedUsers1783176626770 implements MigrationInterface {
  name = 'SeedUsers1783176626770';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const passwordHash = await bcrypt.hash(SEED_PASSWORD, SALT_ROUNDS);
    for (const user of SEED_USERS) {
      await queryRunner.query(
        `INSERT INTO "users" ("name", "email", "password_hash", "role") VALUES ($1, $2, $3, $4)`,
        [user.name, user.email, passwordHash, user.role],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const emails = SEED_USERS.map((user) => user.email);
    await queryRunner.query(`DELETE FROM "users" WHERE "email" = ANY($1)`, [emails]);
  }
}
