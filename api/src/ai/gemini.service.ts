import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createHash } from 'crypto';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly apiKey: string | null;
  private readonly modelName: string;
  private readonly embeddingModelName: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY') ?? null;
    this.modelName =
      this.configService.get<string>('GEMINI_MODEL') ?? 'gemini-1.5-flash';
    this.embeddingModelName =
      this.configService.get<string>('GEMINI_EMBEDDING_MODEL') ??
      'text-embedding-004';

    if (!this.apiKey) {
      this.logger.warn(
        'GEMINI_API_KEY is not configured. Falling back to deterministic local logic.',
      );
    }
  }

  async embed(text: string): Promise<number[]> {
    if (!text.trim()) {
      return [];
    }

    if (!this.apiKey) {
      return this.fallbackEmbedding(text);
    }

    try {
      const genAI = new GoogleGenerativeAI(this.apiKey);
      const model = genAI.getGenerativeModel({
        model: this.embeddingModelName,
      });
      const result = await model.embedContent(text);
      const values = result.embedding.values ?? [];
      return values.length > 0 ? values : this.fallbackEmbedding(text);
    } catch (error) {
      this.logger.warn(
        `Gemini embedding call failed. Using fallback. ${String(error)}`,
      );
      return this.fallbackEmbedding(text);
    }
  }

  async answerWithContext(
    question: string,
    contexts: string[],
  ): Promise<string> {
    const contextText = contexts
      .map((value, index) => `[${index + 1}] ${value}`)
      .join('\n\n');

    const prompt = [
      'You are a college support assistant for registration and IT.',
      'Only answer from the provided trusted context.',
      'If context is insufficient, respond exactly with: CONTEXT_INSUFFICIENT.',
      '',
      `Question: ${question}`,
      '',
      `Trusted context:\n${contextText}`,
    ].join('\n');

    if (!this.apiKey) {
      if (contexts.length === 0) {
        return 'CONTEXT_INSUFFICIENT.';
      }

      return `Based on official information: ${contexts[0]}`;
    }

    try {
      const genAI = new GoogleGenerativeAI(this.apiKey);
      const model = genAI.getGenerativeModel({ model: this.modelName });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return text.trim() || 'CONTEXT_INSUFFICIENT.';
    } catch (error) {
      this.logger.warn(`Gemini answer call failed. ${String(error)}`);
      return contexts.length > 0
        ? `Based on official information: ${contexts[0]}`
        : 'CONTEXT_INSUFFICIENT.';
    }
  }

  private fallbackEmbedding(text: string): number[] {
    const size = 64;
    const vec = new Array<number>(size).fill(0);

    for (let i = 0; i < text.length; i += 1) {
      const charCode = text.charCodeAt(i);
      const index = i % size;
      vec[index] += charCode / 255;
    }

    const digest = createHash('sha256').update(text).digest();
    for (let i = 0; i < size; i += 1) {
      vec[i] += digest[i % digest.length] / 255;
    }

    const norm = Math.sqrt(vec.reduce((acc, v) => acc + v * v, 0));
    if (norm === 0) {
      return vec;
    }

    return vec.map((v) => v / norm);
  }
}
