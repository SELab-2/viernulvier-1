import Fastify from "fastify";

export const app = Fastify({
  logger: true,
});

app.get("/", async (_request, _reply) => {
  return { hello: "world" };
});

if (require.main === module) {
  app.listen({ port: 3000 }).catch(err => {
    app.log.error(err);
    process.exit(1);
  });
}