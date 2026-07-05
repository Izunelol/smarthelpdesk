import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTicketChatMessages1783177795243 implements MigrationInterface {
  name = 'AddTicketChatMessages1783177795243';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."ticket_chat_messages_sender_enum" AS ENUM('USER', 'AI')`,
    );
    await queryRunner.query(
      `CREATE TABLE "ticket_chat_messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sender" "public"."ticket_chat_messages_sender_enum" NOT NULL, "content" text NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "ticket_id" uuid, CONSTRAINT "PK_ticket_chat_messages_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "ticket_chat_messages" ADD CONSTRAINT "FK_ticket_chat_messages_ticket" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ticket_chat_messages" DROP CONSTRAINT "FK_ticket_chat_messages_ticket"`,
    );
    await queryRunner.query(`DROP TABLE "ticket_chat_messages"`);
    await queryRunner.query(`DROP TYPE "public"."ticket_chat_messages_sender_enum"`);
  }
}
