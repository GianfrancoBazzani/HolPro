"use client";
import { useState } from "react";
import { useT } from "@/components/i18n/provider";
import {
  PlanOutline,
  type OutlineProps,
} from "@/components/dashboard/plan-outline";
import {
  deletePlanItem,
  deletePlanCheckpoint,
  deletePlanPeriod,
} from "@/lib/pro/plan-actions";
import { PlanDialog, type PlanTarget } from "./plan-dialog";
import { DeleteControl } from "./delete-control";
export function PlanEditor({
  engagementId,
  items,
  engagements,
}: { engagementId: string } & Pick<OutlineProps, "items" | "engagements">) {
  const t = useT("pro"),
    [target, setTarget] = useState<PlanTarget | null>(null);
  const edit = (next: PlanTarget) => (
    <button
      className="calendar-chip"
      type="button"
      aria-label={t("plan.editLabel", { title: next.value?.title ?? "" })}
      onClick={() => setTarget(next)}
    >
      {t("plan.edit")}
    </button>
  );
  return (
    <>
      <PlanOutline
        items={items}
        engagements={engagements}
        slots={{
          footer: () => (
            <button
              className="button button-primary"
              onClick={() =>
                setTarget({ kind: "item", parentId: engagementId })
              }
            >
              {t("plan.addItem")}
            </button>
          ),
          item: (item) => (
            <div className="plan-item-actions">
              <div className="form-actions">
                <button
                  className="calendar-chip"
                  onClick={() =>
                    setTarget({ kind: "checkpoint", parentId: item.id })
                  }
                >
                  {t("plan.addCheckpoint")}
                </button>
                <button
                  className="calendar-chip"
                  onClick={() =>
                    setTarget({ kind: "period", parentId: item.id })
                  }
                >
                  {t("plan.addPeriod")}
                </button>
                {edit({ kind: "item", parentId: engagementId, value: item })}
                <DeleteControl
                  id={item.id}
                  title={item.title}
                  action={deletePlanItem}
                  note={t("plan.deleteItemNote")}
                />
              </div>
            </div>
          ),
          checkpoint: (cp, item) => (
            <div className="form-actions">
              {edit({ kind: "checkpoint", parentId: item.id, value: cp })}
              <DeleteControl
                id={cp.id}
                title={cp.title}
                action={deletePlanCheckpoint}
              />
            </div>
          ),
          period: (period, item) => (
            <div className="form-actions">
              {edit({ kind: "period", parentId: item.id, value: period })}
              <DeleteControl
                id={period.id}
                title={period.title}
                action={deletePlanPeriod}
              />
            </div>
          ),
        }}
      />
      {target && (
        <PlanDialog
          key={`${target.kind}-${target.value?.id ?? "new"}`}
          target={target}
          onClose={() => setTarget(null)}
        />
      )}
    </>
  );
}
