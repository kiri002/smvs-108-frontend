import { execSync } from "node:child_process";
import path from "node:path";

// Starts every run from the seed data (local development database only).
export default function globalSetup() {
  execSync("npm run db:reset", { cwd: path.resolve(__dirname, "../../smvs-108-backend"), stdio: "inherit" });
}
