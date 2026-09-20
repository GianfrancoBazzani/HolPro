
# HolPro

> Unlock Yourself

## Targe audience

The app has two target audience: 

- B2B: Provides to professionals (freelancers or teams) an agentic infrastructure that gives leverage to professionals and helps them reach and help more people with the same time resources. 

- Final Customers: Provides to individual the efficient access to the best coaches, and a personal assistant agent that helps them to track their coaching plan.

HolPro allows any kind of coaching, sports, nutrition, wellness, mindset, supplementation, health habits.

The app also has a Telegram bot. A coach or a coachee connects the account and
then uses the same assistant from Telegram, with the same memory as the web app.

## Hackathon

This project is a hackathon project for the HackBarna AI Summit. The event date is 26 Sep 2026.

## Sponsors

This section lists each sponsor and the work I did with their tool.

### Quality Clouds

I connected the GitHub repo to Quality Clouds. I ran a Full Scan on the repo. I reviewed the scan results and fixed some issues. I did not apply every suggested fix. I applied the fixes that were legit. I ran a rescan after the fixes.

The fixes are in pull request [#3](https://github.com/GianfrancoBazzani/HolPro/pull/3).

### Mastra

The assistant of HolPro is a Mastra agent. It is built on `@mastra/core`, with
the model router and an OpenAI model. The same agent answers on the web app and
on Telegram.

The Telegram bot uses Mastra Channels with `@chat-adapter/telegram`. A user
connects the bot from account settings on `/app` or `/pro`, opens the link in
Telegram and presses Start. The bot then talks to that user with the role, the
language and the timezone of the account. The bot runs in webhook mode in
production and in polling mode in development.

The agent does more than a chat wrapper:

- Memory: `@mastra/memory` with `@mastra/mysql` stores every thread and a
  resource-scoped coaching profile. The agent knows who writes to it and what
  the user said before. The profile is shared between the web app and Telegram.
- Tools: the agent reads and writes real data. It reads plans, publishes plan
  documents, saves onboarding goals, searches coaches and proposes calendar
  changes. A calendar change is a draft. The user approves it in the chat before
  the app applies it.
- Workflows: a long task starts a Mastra workflow. The workflow continues after
  the user starts another turn, and it reports the result in the conversation.

The Telegram code, the tools and the workflows are in
`packages/web-app/mastra/`. The "Telegram assistant" section of
`packages/web-app/README.md` explains the setup step by step.
