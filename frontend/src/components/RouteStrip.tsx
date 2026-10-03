export type StationState = "idle" | "active" | "done" | "fail";

export interface Station {
  name: string;
  meta: string;
  state: StationState;
}

export function RouteStrip({
  stations,
  progress,
  hazard,
}: {
  stations: Station[];
  progress: number;
  hazard: boolean;
}) {
  return (
    <section className="route" aria-label="Signing route status">
      <div className="shell">
        <div className="route__track">
          <div className="route__rail" aria-hidden="true">
            <span
              className="route__rail-fill"
              data-hazard={hazard || undefined}
              style={{ ["--progress" as string]: `${progress}%` }}
            />
          </div>
          <ol className="route__stations">
            {stations.map((s) => (
              <li
                key={s.name}
                className="route__station"
                data-state={s.state}
                aria-label={`${s.name}: ${
                  s.state === "done"
                    ? `complete, ${s.meta}`
                    : s.state === "active"
                      ? "in progress"
                      : s.state === "fail"
                        ? `failed, ${s.meta}`
                        : "waiting"
                }`}
              >
                <span className="route__dot" aria-hidden="true" />
                <span className="route__name">{s.name}</span>
                <span className="route__meta">{s.meta}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
