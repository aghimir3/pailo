from app.modules.factory.schemas import (
    DashboardResponse,
    InventoryAlert,
    Kpi,
    OwnerInsight,
    QualitySignal,
    TaskSummary,
    ThroughputPoint,
    WorkOrderSummary,
)


def kpis() -> list[Kpi]:
    return [
        Kpi(label="Planned pairs", value="120", detail="Today across 3 work orders", tone="cyan", trend="+20 vs yesterday"),
        Kpi(label="Completed", value="86", detail="72% of daily target", tone="green", trend="On pace by 17:30"),
        Kpi(label="Blocked tasks", value="5", detail="Thread, outsole, label review", tone="amber", trend="2 need owner help"),
        Kpi(label="Cost pressure", value="NPR 934", detail="Avg estimated cost per pair", tone="red", trend="34 over target"),
    ]


def throughput() -> list[ThroughputPoint]:
    return [
        ThroughputPoint(day="Mon", planned=100, completed=92),
        ThroughputPoint(day="Tue", planned=110, completed=104),
        ThroughputPoint(day="Wed", planned=120, completed=98),
        ThroughputPoint(day="Thu", planned=115, completed=107),
        ThroughputPoint(day="Fri", planned=120, completed=86),
    ]


def work_orders() -> list[WorkOrderSummary]:
    return [
        WorkOrderSummary(code="WO-2026-000001", style="Pailo City Runner", color="Black", planned_pairs=60, completed_pairs=44, stage="Stitching", blocker="Black thread below minimum", due="Today"),
        WorkOrderSummary(code="WO-2026-000002", style="Pailo School Classic", color="White", planned_pairs=40, completed_pairs=32, stage="QC", blocker=None, due="Today"),
        WorkOrderSummary(code="WO-2026-000003", style="Pailo Trail Sandal", color="Tan", planned_pairs=20, completed_pairs=10, stage="Sole attachment", blocker="Outsole delivery late", due="Tomorrow"),
    ]


def tasks() -> list[TaskSummary]:
    return [
        TaskSummary(code="TASK-2026-000041", title="Cut upper material for City Runner", status="in_progress", priority="high", assignee="Ram", due_time="11:30", work_order="WO-2026-000001", quantity="44 / 60 pairs"),
        TaskSummary(code="TASK-2026-000042", title="QC inspect white school shoes", status="waiting_for_review", priority="high", assignee="Sita", due_time="13:00", work_order="WO-2026-000002", quantity="32 pairs"),
        TaskSummary(code="TASK-2026-000043", title="Call outsole supplier", status="blocked", priority="urgent", assignee="Milan", due_time="Now", work_order="WO-2026-000003", blocker_reason="Delivery not confirmed"),
        TaskSummary(code="TASK-2026-000044", title="Print size 40-43 labels", status="ready", priority="medium", assignee="Ram", due_time="16:00", work_order="WO-2026-000002", quantity="40 labels"),
    ]


def inventory_alerts() -> list[InventoryAlert]:
    return [
        InventoryAlert(material="Black thread", code="MAT-THR-BLK", current="2 rolls", minimum="8 rolls", risk="Blocks stitching today", supplier="Kathmandu Threads"),
        InventoryAlert(material="TR outsole size 42", code="MAT-OUT-TR42", current="18 pairs", minimum="40 pairs", risk="Blocks tomorrow batch", supplier="Birat Sole Works"),
        InventoryAlert(material="Shoe box large", code="MAT-BOX-L", current="62 pcs", minimum="100 pcs", risk="Packing delay", supplier="Patan Packaging"),
    ]


def quality_signals() -> list[QualitySignal]:
    return [
        QualitySignal(label="Defect rate", value="4.7%", detail="Glue marks trending up", tone="amber"),
        QualitySignal(label="Rework pairs", value="9", detail="7 in finishing, 2 in stitching", tone="amber"),
        QualitySignal(label="QC cleared", value="32", detail="School Classic ready for labels", tone="green"),
    ]


def owner_insights() -> list[OwnerInsight]:
    return [
        OwnerInsight(title="Protect tomorrow's output", detail="Outsole size 42 stock covers only 45% of tomorrow's Trail Sandal plan.", action="Confirm supplier delivery before 15:00", tone="red"),
        OwnerInsight(title="Cost target needs attention", detail="City Runner estimate is NPR 934 per pair against the NPR 900 target.", action="Review outsole and upper material price lines", tone="amber"),
        OwnerInsight(title="QC pattern emerging", detail="Glue marks appear on 5 of the last 9 rework pairs.", action="Check sole attachment station before next batch", tone="cyan"),
    ]


def dashboard_response() -> DashboardResponse:
    return DashboardResponse(
        production_date="2026-05-02",
        target_cost_npr=900,
        kpis=kpis(),
        throughput=throughput(),
        work_orders=work_orders(),
        my_tasks=[task for task in tasks() if task.assignee == "Ram"],
        inventory_alerts=inventory_alerts(),
        quality_signals=quality_signals(),
        owner_insights=owner_insights(),
    )
