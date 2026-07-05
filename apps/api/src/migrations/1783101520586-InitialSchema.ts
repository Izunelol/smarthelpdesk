import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1783101520586 implements MigrationInterface {
    name = 'InitialSchema1783101520586'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`CREATE TABLE "categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" character varying NOT NULL, CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "knowledge_articles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "content" text NOT NULL, "keywords" text array NOT NULL DEFAULT ARRAY[]::text[], "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4dff86fc9e08f53fe1d4cfe5fb1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "attendances" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "description" text NOT NULL, "started_at" TIMESTAMP WITH TIME ZONE NOT NULL, "ended_at" TIMESTAMP WITH TIME ZONE, "level" integer NOT NULL, "ticket_id" uuid, "responsible_id" uuid, CONSTRAINT "PK_483ed97cd4cd43ab4a117516b69" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "ratings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "score" integer NOT NULL, "comment" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "ticket_id" uuid, CONSTRAINT "REL_888c2396a88852b897c3da4c43" UNIQUE ("ticket_id"), CONSTRAINT "PK_0f31425b073219379545ad68ed9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."tickets_status_enum" AS ENUM('OPEN', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED')`);
        await queryRunner.query(`CREATE TYPE "public"."tickets_priority_enum" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')`);
        await queryRunner.query(`CREATE TABLE "tickets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "description" text NOT NULL, "status" "public"."tickets_status_enum" NOT NULL DEFAULT 'OPEN', "priority" "public"."tickets_priority_enum" NOT NULL DEFAULT 'MEDIUM', "level" integer NOT NULL DEFAULT '1', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "closed_at" TIMESTAMP WITH TIME ZONE, "requester_id" uuid, "category_id" uuid, CONSTRAINT "PK_343bc942ae261cf7a1377f48fd0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('USER', 'TECHNICIAN', 'SPECIALIST', 'MANAGER', 'ADMIN')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "email" character varying NOT NULL, "password_hash" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'USER', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "attendance_knowledge_articles" ("attendance_id" uuid NOT NULL, "knowledge_article_id" uuid NOT NULL, CONSTRAINT "PK_96453c34b348c41abeb6376ac87" PRIMARY KEY ("attendance_id", "knowledge_article_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_b53203e4913dfa6816a642e60c" ON "attendance_knowledge_articles"  ("attendance_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_b863acf731910e7372e572391c" ON "attendance_knowledge_articles"  ("knowledge_article_id") `);
        await queryRunner.query(`ALTER TABLE "attendances" ADD CONSTRAINT "FK_26a8977b65632de4bb350fc5921" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attendances" ADD CONSTRAINT "FK_028b89fe9bac56b71d4515c3e68" FOREIGN KEY ("responsible_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ratings" ADD CONSTRAINT "FK_888c2396a88852b897c3da4c436" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "FK_2a06f5cdaf003ceaa9fcf08be77" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "FK_32a7f0e4e32a46a094b55f7c25c" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attendance_knowledge_articles" ADD CONSTRAINT "FK_b53203e4913dfa6816a642e60cb" FOREIGN KEY ("attendance_id") REFERENCES "attendances"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "attendance_knowledge_articles" ADD CONSTRAINT "FK_b863acf731910e7372e572391c7" FOREIGN KEY ("knowledge_article_id") REFERENCES "knowledge_articles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "attendance_knowledge_articles" DROP CONSTRAINT "FK_b863acf731910e7372e572391c7"`);
        await queryRunner.query(`ALTER TABLE "attendance_knowledge_articles" DROP CONSTRAINT "FK_b53203e4913dfa6816a642e60cb"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "FK_32a7f0e4e32a46a094b55f7c25c"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "FK_2a06f5cdaf003ceaa9fcf08be77"`);
        await queryRunner.query(`ALTER TABLE "ratings" DROP CONSTRAINT "FK_888c2396a88852b897c3da4c436"`);
        await queryRunner.query(`ALTER TABLE "attendances" DROP CONSTRAINT "FK_028b89fe9bac56b71d4515c3e68"`);
        await queryRunner.query(`ALTER TABLE "attendances" DROP CONSTRAINT "FK_26a8977b65632de4bb350fc5921"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b863acf731910e7372e572391c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b53203e4913dfa6816a642e60c"`);
        await queryRunner.query(`DROP TABLE "attendance_knowledge_articles"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`DROP TABLE "tickets"`);
        await queryRunner.query(`DROP TYPE "public"."tickets_priority_enum"`);
        await queryRunner.query(`DROP TYPE "public"."tickets_status_enum"`);
        await queryRunner.query(`DROP TABLE "ratings"`);
        await queryRunner.query(`DROP TABLE "attendances"`);
        await queryRunner.query(`DROP TABLE "knowledge_articles"`);
        await queryRunner.query(`DROP TABLE "categories"`);
    }

}
