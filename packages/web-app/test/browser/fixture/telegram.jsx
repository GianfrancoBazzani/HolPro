import React from "react";
import { AccountControls } from "@/components/account/account-controls";
export function TelegramFixture() {
  return (
    <AccountControls
      role={new URLSearchParams(location.search).get("role") || "coachee"}
      profile={
        new URLSearchParams(location.search).get("role") === "coach"
          ? { bio: "Strength coach", acceptingClients: true }
          : undefined
      }
    />
  );
}
