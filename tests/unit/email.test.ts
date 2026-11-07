import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { SMTPServer } from "smtp-server";
import type { AddressInfo } from "node:net";

// A real SMTP server on localhost: this exercises the actual SMTP protocol and
// AUTH LOGIN that nodemailer uses against Gmail, only without TLS.
const received: { from: string; to: string[]; raw: string; user?: string }[] = [];
let server: SMTPServer;

before(async () => {
  server = new SMTPServer({
    secure: false,
    disabledCommands: ["STARTTLS"],
    authOptional: false,
    allowInsecureAuth: true,
    onAuth(auth, _session, cb) {
      if (auth.username === "me@gmail.com" && auth.password === "app-password") return cb(null, { user: auth.username });
      cb(new Error("535 Invalid login"));
    },
    onData(stream, session, cb) {
      let raw = "";
      stream.on("data", (c) => (raw += c));
      stream.on("end", () => {
        received.push({
          from: session.envelope.mailFrom ? session.envelope.mailFrom.address : "",
          to: session.envelope.rcptTo.map((r) => r.address),
          raw,
          user: session.user as string | undefined,
        });
        cb();
      });
    },
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  const port = (server.server.address() as AddressInfo).port;
  Object.assign(process.env, {
    SMTP_HOST: "127.0.0.1",
    SMTP_PORT: String(port),
    SMTP_USER: "me@gmail.com",
    SMTP_PASS: "app-password",
    EMAIL_FROM: "Clinic Growth <me@gmail.com>",
  });
});

after(() => new Promise<void>((r) => server.close(() => r())));

test("sends a plain-text email over authenticated SMTP", async () => {
  const { sendEmail } = await import("@/lib/email");
  const result = await sendEmail({ to: "owner@clinic.in", subject: "Your code", text: "Your sign-in code is 123456." });
  assert.deepEqual(result, { delivered: true });
  const mail = received.at(-1)!;
  assert.equal(mail.user, "me@gmail.com");
  assert.equal(mail.from, "me@gmail.com");
  assert.deepEqual(mail.to, ["owner@clinic.in"]);
  assert.match(mail.raw, /Subject: Your code/);
  assert.match(mail.raw, /Your sign-in code is 123456\./);
});
