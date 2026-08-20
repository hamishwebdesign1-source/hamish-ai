"use client";

import { useState } from "react";
import { Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StudioTour } from "@/components/platform/studio-tour";

// The brief's own requirement (§26): the tour should be "accessible later
// through Help," not just a one-time thing a tenant can never see again.
export function RestartTourButton() {
  const [showTour, setShowTour] = useState(false);

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setShowTour(true)}>
        <Repeat className="size-3.5" /> Restart the product tour
      </Button>
      {showTour && <StudioTour />}
    </>
  );
}
