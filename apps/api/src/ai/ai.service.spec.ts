import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';

const generateContentMock = jest.fn();

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: { generateContent: generateContentMock },
  })),
}));

describe('AiService', () => {
  let service: AiService;

  beforeEach(() => {
    generateContentMock.mockReset();
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'GEMINI_MODEL') return 'gemini-2.5-flash';
        return undefined;
      }),
    } as unknown as ConfigService;
    service = new AiService(configService);
  });

  describe('classify', () => {
    it('parses a well-formed JSON response', async () => {
      generateContentMock.mockResolvedValue({
        text: JSON.stringify({ category: 'hardware', priority: 'HIGH', confidence: 0.9 }),
      });

      const result = await service.classify('Impressora quebrada', 'Não liga mais');

      expect(result).toEqual({ category: 'hardware', priority: 'HIGH', confidence: 0.9 });
    });

    it('falls back to manual triage when the API call fails', async () => {
      generateContentMock.mockRejectedValue(new Error('network down'));

      const result = await service.classify('Título', 'Descrição');

      expect(result).toEqual({ category: 'outros', priority: 'MEDIUM', confidence: 0 });
    });
  });

  describe('suggestSolutions', () => {
    it('returns an empty list without calling the API when there are no articles', async () => {
      const result = await service.suggestSolutions('problema', []);

      expect(result).toEqual([]);
      expect(generateContentMock).not.toHaveBeenCalled();
    });

    it('falls back to an empty list when the API call fails', async () => {
      generateContentMock.mockRejectedValue(new Error('timeout'));

      const result = await service.suggestSolutions('problema', [
        { title: 'Artigo', content: 'Conteúdo' },
      ]);

      expect(result).toEqual([]);
    });
  });

  describe('chat', () => {
    it('parses a well-formed JSON response', async () => {
      generateContentMock.mockResolvedValue({
        text: JSON.stringify({ reply: 'Tente reiniciar o roteador.', resolved: false }),
      });

      const result = await service.chat('Sem internet', [{ role: 'user', content: 'Sem internet' }], [
        { title: 'Wi-Fi', content: 'Reinicie o roteador.' },
      ]);

      expect(result).toEqual({ reply: 'Tente reiniciar o roteador.', resolved: false });
    });

    it('falls back to a generic reply when the API call fails', async () => {
      generateContentMock.mockRejectedValue(new Error('timeout'));

      const result = await service.chat('Sem internet', [], []);

      expect(result.resolved).toBe(false);
      expect(result.reply).toContain('escalar');
    });
  });

  describe('summarizeInsights', () => {
    it('falls back to an empty string when the API call fails', async () => {
      generateContentMock.mockRejectedValue(new Error('timeout'));

      const result = await service.summarizeInsights({ some: 'data' });

      expect(result).toBe('');
    });
  });
});
