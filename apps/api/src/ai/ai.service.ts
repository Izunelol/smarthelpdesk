import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

export interface Classification {
  category: 'acesso' | 'hardware' | 'software' | 'rede' | 'outros';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
}

export interface ChatTurn {
  role: 'user' | 'ai';
  content: string;
}

export interface ChatReply {
  reply: string;
  resolved: boolean;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly ai: GoogleGenAI;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.ai = new GoogleGenAI({
      apiKey: this.configService.get<string>('GEMINI_API_KEY'),
    });
    this.model = this.configService.get<string>('GEMINI_MODEL') ?? 'gemini-2.5-flash';
  }

  // RF15 — classificação automática de categoria e prioridade
  async classify(title: string, description: string): Promise<Classification> {
    const prompt =
      `Você é um triador de chamados de TI. Classifique o chamado.\n` +
      `Título: ${title}\nDescrição: ${description}\n` +
      `Responda SOMENTE JSON: {"category":"acesso|hardware|software|rede|outros",` +
      `"priority":"LOW|MEDIUM|HIGH|CRITICAL","confidence":0..1}`;

    try {
      const res = await this.ai.models.generateContent({
        model: this.model,
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });
      return JSON.parse(res.text ?? '{}') as Classification;
    } catch (err) {
      this.logger.warn(`Classificação por IA falhou, usando fallback: ${err}`);
      return { category: 'outros', priority: 'MEDIUM', confidence: 0 };
    }
  }

  // RF16 — sugestão de soluções (RAG simples sobre a base de conhecimento)
  async suggestSolutions(
    description: string,
    articles: { title: string; content: string }[],
  ): Promise<string[]> {
    if (articles.length === 0) {
      return [];
    }

    const context = articles
      .map((a, i) => `[${i + 1}] ${a.title}\n${a.content}`)
      .join('\n\n');
    const prompt =
      `Com base APENAS nos artigos abaixo, sugira até 3 soluções objetivas.\n` +
      `Problema: ${description}\n\nArtigos:\n${context}\n\n` +
      `Responda como lista JSON de strings.`;

    try {
      const res = await this.ai.models.generateContent({
        model: this.model,
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });
      return JSON.parse(res.text ?? '[]') as string[];
    } catch (err) {
      this.logger.warn(`Sugestão de soluções por IA falhou: ${err}`);
      return [];
    }
  }

  // RF15/RF16 — chat do chatbot de nível 1: conversa com o usuário usando a base de
  // conhecimento e decide se o problema foi resolvido
  async chat(
    ticketDescription: string,
    history: ChatTurn[],
    articles: { title: string; content: string }[],
  ): Promise<ChatReply> {
    const context = articles.length
      ? articles.map((a, i) => `[${i + 1}] ${a.title}\n${a.content}`).join('\n\n')
      : '(nenhum artigo relevante encontrado)';
    const conversation = history
      .map((turn) => `${turn.role === 'user' ? 'Usuário' : 'Assistente'}: ${turn.content}`)
      .join('\n');
    const prompt =
      `Você é o assistente de nível 1 (chatbot) do SmartHelpDesk, um helpdesk de TI.\n` +
      `Ajude o usuário a resolver o problema abaixo usando seu conhecimento técnico geral de ` +
      `suporte de TI. Se houver artigos relevantes na base de conhecimento, priorize-os como ` +
      `referência, mas não se limite a eles: quando não houver artigo aplicável, ainda assim ` +
      `dê orientações técnicas úteis com base no seu próprio conhecimento. Se conseguir ` +
      `resolver, explique a solução e marque "resolved" como true. Caso não seja suficiente ` +
      `mesmo após tentar ajudar, faça perguntas objetivas ou oriente o usuário a escalar o ` +
      `chamado, marcando "resolved" como false.\n\n` +
      `Problema original: ${ticketDescription}\n\n` +
      `Artigos da base de conhecimento:\n${context}\n\n` +
      `Conversa até agora:\n${conversation}\n\n` +
      `Responda SOMENTE JSON: {"reply":"...","resolved":true|false}`;

    try {
      const res = await this.ai.models.generateContent({
        model: this.model,
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });
      const parsed = JSON.parse(res.text ?? '{}') as Partial<ChatReply>;
      return {
        reply: parsed.reply ?? 'Não consegui gerar uma resposta agora. Tente novamente.',
        resolved: Boolean(parsed.resolved),
      };
    } catch (err) {
      this.logger.warn(`Chat com a IA falhou: ${err}`);
      return {
        reply:
          'No momento não consigo responder automaticamente. Você pode tentar novamente ' +
          'ou escalar o chamado para um técnico.',
        resolved: false,
      };
    }
  }

  // RF17/RF18 — resumo em linguagem natural de indicadores (forecast/gargalos)
  async summarizeInsights(data: Record<string, unknown>): Promise<string> {
    const prompt =
      `Você é um analista de TI. Redija um resumo objetivo (máx. 4 frases, em português) ` +
      `dos indicadores abaixo, destacando tendências e possíveis gargalos.\n` +
      `Dados: ${JSON.stringify(data)}`;

    try {
      const res = await this.ai.models.generateContent({
        model: this.model,
        contents: prompt,
      });
      return res.text ?? '';
    } catch (err) {
      this.logger.warn(`Resumo de insights por IA falhou: ${err}`);
      return '';
    }
  }
}
