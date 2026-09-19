import { cache } from "react";
import { headers } from "next/headers";
import { resolveLocale } from "./negotiate";
// React cache shares one result when metadata and a page both ask.
export const currentLocale = cache(async () => resolveLocale(await headers()));
