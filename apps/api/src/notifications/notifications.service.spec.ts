import { NotificationsService } from './notifications.service';

const sendMail = jest.fn();

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail })),
}));

function configServiceWith(values: Record<string, string | undefined>) {
  return { get: (key: string) => values[key] } as any;
}

describe('NotificationsService', () => {
  beforeEach(() => {
    sendMail.mockReset().mockResolvedValue(undefined);
  });

  describe('without SMTP configured', () => {
    it('logs instead of sending and does not throw', async () => {
      const service = new NotificationsService(configServiceWith({}));

      await expect(
        service.notifyTicketCreated('user@example.com', 'ticket-1', 'Impressora não liga'),
      ).resolves.toBeUndefined();
      expect(sendMail).not.toHaveBeenCalled();
    });
  });

  describe('with SMTP configured', () => {
    function buildService() {
      return new NotificationsService(
        configServiceWith({
          SMTP_HOST: 'smtp.example.com',
          SMTP_PORT: '587',
          SMTP_USER: 'no-reply@example.com',
          SMTP_PASS: 'secret',
        }),
      );
    }

    it('sends the ticket-created notification', async () => {
      const service = buildService();

      await service.notifyTicketCreated('user@example.com', 'ticket-1', 'Impressora não liga');

      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: expect.stringContaining('ticket-1'),
        }),
      );
    });

    it('sends the escalation notification with the target level', async () => {
      const service = buildService();

      await service.notifyTicketEscalated('tech@example.com', 'ticket-1', 'Rede lenta', 2);

      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ subject: expect.stringContaining('nível 2') }),
      );
    });

    it('swallows transporter errors instead of throwing', async () => {
      sendMail.mockRejectedValue(new Error('smtp down'));
      const service = buildService();

      await expect(
        service.notifyStatusChanged('user@example.com', 'ticket-1', 'Rede lenta', 'RESOLVED'),
      ).resolves.toBeUndefined();
    });
  });
});
