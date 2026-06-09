import { verifySmtpConnection } from "../src/lib/email";

async function main() {
  const result = await verifySmtpConnection();
  console.log(result.message);
  process.exit(result.ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
