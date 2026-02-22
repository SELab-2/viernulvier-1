import Fastify from "fastify";
const fastify = Fastify();
import pg from "@fastify/postgres";

fastify.register(pg, {
  connectionString: "postgres://postgres@localhost/postgres",
});

fastify.get("/user/:id", function (_req, reply) {
  fastify.pg.query(
    "SELECT id, username, hash, salt FROM users WHERE id=$1",
    [1],
    function onResult(err, result) {
      reply.send(err || result);
    },
  );
});

fastify.listen({ port: 3000 }, (err) => {
  if (err) throw err;
  const addr = fastify.server.address();
  if (addr != null)
    console.log(
      `server listening on ${typeof addr == "string" ? addr : addr.port}`,
    );
});
