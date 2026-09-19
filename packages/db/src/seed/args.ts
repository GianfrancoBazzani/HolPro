export function parseSeedArgs(argv: string[]): {
  coacheeEmail: string;
  coachEmail?: string;
} {
  const args = argv[0] === "--" ? argv.slice(1) : argv;
  if (!args[0] || args.length > 2)
    throw new Error(
      "Usage: pnpm --filter @holpro/db db:seed:plan -- <coachee-email> [coach-email]",
    );
  return { coacheeEmail: args[0], ...(args[1] ? { coachEmail: args[1] } : {}) };
}
