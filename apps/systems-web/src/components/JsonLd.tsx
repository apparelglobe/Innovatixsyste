/** Render one or more JSON-LD objects as a <script type="application/ld+json">. */
export function JsonLd({ data }: { data: object | object[] }) {
  const json = JSON.stringify(Array.isArray(data) ? data : [data]);
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
