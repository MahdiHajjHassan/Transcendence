import { BadRequestException, Injectable } from '@nestjs/common';
import { Department, KnowledgeSourceType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { chunkText, cosineSimilarity } from '../utils/text';
import { GeminiService } from '../ai/gemini.service';
import { CreateFaqDto } from './dto/create-faq.dto';
import { CreateKnowledgeDocumentDto } from './dto/create-document.dto';
import { SearchKnowledgeQueryDto } from './dto/search-knowledge-query.dto';

export type RetrievedContext = {
  sourceId: string;
  title: string;
  text: string;
  score: number;
};

@Injectable()
export class KnowledgeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
  ) {}

  async createFaq(dto: CreateFaqDto) {
    return this.prisma.faqEntry.create({
      data: {
        department: dto.department,
        question: dto.question,
        answer: dto.answer,
        tags: dto.tags ?? [],
      },
    });
  }

  async createDocument(
    uploaderId: string,
    dto: CreateKnowledgeDocumentDto,
    file?: Express.Multer.File,
  ): Promise<{ id: string; chunksCreated: number }> {
    const fileContent = file?.buffer?.toString('utf-8')?.trim();
    const content = dto.content?.trim() || fileContent;

    if (!content) {
      throw new BadRequestException(
        'Document content is required either as text field or uploaded file.',
      );
    }

    const document = await this.prisma.knowledgeDocument.create({
      data: {
        title: dto.title,
        department: dto.department,
        sourceType: KnowledgeSourceType.DOCUMENT,
        content,
        uploadedBy: uploaderId,
      },
      select: {
        id: true,
      },
    });

    const chunks = chunkText(content);
    const chunkData: Array<{
      documentId: string;
      chunkText: string;
      embedding: number[];
      chunkIndex: number;
    }> = [];

    for (let i = 0; i < chunks.length; i += 1) {
      const embedding = await this.geminiService.embed(chunks[i]);
      chunkData.push({
        documentId: document.id,
        chunkText: chunks[i],
        embedding,
        chunkIndex: i,
      });
    }

    if (chunkData.length > 0) {
      await this.prisma.knowledgeChunk.createMany({ data: chunkData });
    }

    return {
      id: document.id,
      chunksCreated: chunkData.length,
    };
  }

  async search(query: SearchKnowledgeQueryDto): Promise<{
    page: number;
    limit: number;
    total: number;
    items: Array<{
      id: string;
      type: 'FAQ' | 'DOCUMENT';
      department: Department;
      title: string;
      excerpt: string;
      createdAt: Date;
    }>;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const faqWhere = {
      ...(query.department ? { department: query.department } : {}),
      OR: [
        { question: { contains: query.q, mode: 'insensitive' as const } },
        { answer: { contains: query.q, mode: 'insensitive' as const } },
        { tags: { has: query.q } },
      ],
    };

    const docWhere = {
      ...(query.department ? { department: query.department } : {}),
      OR: [
        { title: { contains: query.q, mode: 'insensitive' as const } },
        { content: { contains: query.q, mode: 'insensitive' as const } },
      ],
    };

    const [faqs, faqCount, docs, docCount] = await Promise.all([
      this.prisma.faqEntry.findMany({
        where: faqWhere,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.faqEntry.count({ where: faqWhere }),
      this.prisma.knowledgeDocument.findMany({
        where: docWhere,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.knowledgeDocument.count({ where: docWhere }),
    ]);

    const items = [
      ...faqs.map((faq) => ({
        id: faq.id,
        type: 'FAQ' as const,
        department: faq.department,
        title: faq.question,
        excerpt: faq.answer.slice(0, 220),
        createdAt: faq.createdAt,
      })),
      ...docs.map((doc) => ({
        id: doc.id,
        type: 'DOCUMENT' as const,
        department: doc.department,
        title: doc.title,
        excerpt: doc.content.slice(0, 220),
        createdAt: doc.createdAt,
      })),
    ]
      .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
      .slice(0, limit);

    return {
      page,
      limit,
      total: faqCount + docCount,
      items,
    };
  }

  async retrieveRelevant(
    question: string,
    department: Department | null,
    topK = 4,
  ): Promise<RetrievedContext[]> {
    const [queryEmbedding, chunks, faqs] = await Promise.all([
      this.geminiService.embed(question),
      this.prisma.knowledgeChunk.findMany({
        where: {
          document: {
            ...(department ? { department } : {}),
            status: 'ACTIVE',
          },
        },
        include: {
          document: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        take: 250,
      }),
      this.prisma.faqEntry.findMany({
        where: {
          ...(department ? { department } : {}),
        },
        take: 200,
      }),
    ]);

    const chunkCandidates = chunks.map((chunk) => ({
      sourceId: chunk.document.id,
      title: chunk.document.title,
      text: chunk.chunkText,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }));

    const faqCandidates = faqs.map((faq) => ({
      sourceId: faq.id,
      title: faq.question,
      text: faq.answer,
      score: cosineSimilarity(
        queryEmbedding,
        this.hashFaqVector(
          `${faq.question} ${faq.answer}`,
          queryEmbedding.length || 64,
        ),
      ),
    }));

    return [...chunkCandidates, ...faqCandidates]
      .filter((item) => item.score > 0.18)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  private hashFaqVector(text: string, size: number): number[] {
    const vec = new Array<number>(size).fill(0);
    for (let i = 0; i < text.length; i += 1) {
      vec[i % size] += text.charCodeAt(i) / 255;
    }
    const norm = Math.sqrt(vec.reduce((acc, val) => acc + val * val, 0));
    if (norm === 0) {
      return vec;
    }
    return vec.map((value) => value / norm);
  }
}
