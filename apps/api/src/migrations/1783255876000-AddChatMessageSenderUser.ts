import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChatMessageSenderUser1783255876000 implements MigrationInterface {
  name = 'AddChatMessageSenderUser1783255876000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."ticket_chat_messages_sender_enum" ADD VALUE 'STAFF'`,
    );
    await queryRunner.query(
      `ALTER TABLE "ticket_chat_messages" ADD "sender_user_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "ticket_chat_messages" ADD CONSTRAINT "FK_ticket_chat_messages_sender_user" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ticket_chat_messages" DROP CONSTRAINT "FK_ticket_chat_messages_sender_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ticket_chat_messages" DROP COLUMN "sender_user_id"`,
    );
    // Nota: o Postgres não permite remover um valor de enum diretamente;
    // reverter exige recriar o tipo sem 'STAFF' caso necessário.
  }
}
