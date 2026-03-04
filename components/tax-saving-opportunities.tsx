interface TaxSavingOpportunitiesProps {
  detailed?: boolean
}

export function TaxSavingOpportunities({ detailed = false }: TaxSavingOpportunitiesProps) {
  return (
    <div className="space-y-3 text-sm">
      <div className="rounded-md border p-3">
        <p className="font-medium">Input Tax Credit optimization</p>
        <p className="text-muted-foreground">Reconcile vendor GSTIN mismatches before monthly filing.</p>
      </div>
      <div className="rounded-md border p-3">
        <p className="font-medium">Advance tax provisioning</p>
        <p className="text-muted-foreground">Set aside projected monthly liabilities from cash collections.</p>
      </div>
      {detailed ? (
        <div className="rounded-md border p-3">
          <p className="font-medium">Scenario-based deductions</p>
          <p className="text-muted-foreground">Compare deductions across pricing and expense strategies.</p>
        </div>
      ) : null}
    </div>
  )
}
