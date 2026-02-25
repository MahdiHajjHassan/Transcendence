import { Module } from '@nestjs/common';
import { PublicApiController } from './public-api.controller';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { TicketsModule } from '../tickets/tickets.module';

@Module({
  imports: [KnowledgeModule, TicketsModule],
  controllers: [PublicApiController],
})
export class PublicApiModule {}
