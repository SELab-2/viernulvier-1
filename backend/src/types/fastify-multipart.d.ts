import type { BusboyConfig } from "@fastify/busboy";
import type { Multipart, MultipartFile } from "@fastify/multipart";

declare module "fastify" {
  interface FastifyRequest {
    isMultipart: () => boolean;
    parts: (options?: BusboyConfig) => AsyncIterableIterator<Multipart>;
    file: (options?: BusboyConfig) => Promise<MultipartFile | undefined>;
    files: (options?: BusboyConfig) => AsyncIterableIterator<MultipartFile>;
  }
}