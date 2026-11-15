import { requireProvenance, provenanceHover } from "./provenance";

export function ProvenanceBadge(props: { id: string }) {
  const row = requireProvenance(props.id);
  const hover = provenanceHover(row);
  return (
    <span className="see-why-badge" data-status={row.status} title={hover ?? undefined} data-provenance={row.id}>
      {row.status}
    </span>
  );
}

export function SolverSampleTag() {
  return <span className="see-why-sample">solver sample</span>;
}

/** Badge the table row when the displayed figure is that row. An edited session value stays unlabeled by the table. */
export function TaggedNumber(props: { id: string; text: string; matchesTable: boolean }) {
  if (props.matchesTable) {
    return (
      <>
        {props.text} <ProvenanceBadge id={props.id} />
      </>
    );
  }
  const row = requireProvenance(props.id);
  return (
    <>
      {props.text} <span className="see-why-sample">session setting</span> {row.valueLabel}{" "}
      <ProvenanceBadge id={props.id} />
    </>
  );
}

export function ProvenanceList(props: { ids: readonly string[] }) {
  return (
    <section className="see-why-panel" data-testid="see-why-provenance">
      <header className="see-why-panel-head">
        <h2>Provenance</h2>
        <p>
          Status words are the provenance table: sourced, derived, unsourced, conflicting. Hover a badge for the PDF
          page or decision ID when that table names one. A solver sample has no row in the table.
        </p>
      </header>
      <ul className="see-why-provenance-list">
        {props.ids.map((id) => {
          const row = requireProvenance(id);
          return (
            <li key={row.id}>
              <span className="see-why-prov-name">{row.name}</span>
              <span className="see-why-prov-value">{row.valueLabel}</span>
              <ProvenanceBadge id={row.id} />
              <span className="see-why-source">{row.source}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
