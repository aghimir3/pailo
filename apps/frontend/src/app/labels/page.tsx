import { LabelsWorkflow } from "@/components/factory/labels-workflow";
import { FactoryShell } from "@/components/factory/factory-shell";
import { loadOperationsData } from "@/lib/operations-data";

export default async function LabelsPage() {
  const data = await loadOperationsData();

  return (
    <FactoryShell description="Print-ready label sheets with editable values, exact A4 preview, and browser print output." eyebrow="Label room" title="Label generator">
      <LabelsWorkflow initialPreview={data.labelPreview} styles={data.catalog.styles} templates={data.catalog.label_templates} />
    </FactoryShell>
  );
}