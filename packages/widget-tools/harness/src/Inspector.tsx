import { useItemsData, useVariableData } from "@teacharium/player";

export interface LoggedEvent {
  at: number;
  type: string;
  data: Record<string, unknown>;
}

function formatValue(value: unknown): string {
  if (value === undefined) return "—";
  return typeof value === "string" ? JSON.stringify(value) : String(value);
}

/** Value kind for styling: string, number, boolean or empty. */
function valueKind(value: unknown): string {
  if (value === undefined || value === null) return "empty";
  return typeof value;
}

/** Let long variable names wrap only after `_` and `-`, never mid-word. */
function breakableName(name: string) {
  return name.split(/(?<=[_-])/).map((part, index) => (
    <span key={index}>
      {part}
      <wbr />
    </span>
  ));
}

/**
 * Rendered as the player's `sideContent`, inside its providers, so it can
 * read the live variables and items the widget writes.
 */
export function Inspector() {
  const { variables } = useVariableData();
  const { items } = useItemsData();

  const variableList = Object.values(variables);
  const itemList = [...items.values()];

  return (
    <div className="h-inspector">
      <section>
        <h3>Variables</h3>
        {variableList.length === 0 ? (
          <p className="h-hint">
            None yet. Widgets add them with api.addVariable().
          </p>
        ) : (
          <dl className="h-vars">
            {variableList.map((variable) => (
              <div key={variable.name} className="h-var">
                <dt title={variable.name}>{breakableName(variable.name)}</dt>
                <dd
                  className={`h-var-value h-var-${valueKind(variable.currentValue)}`}
                >
                  {formatValue(variable.currentValue)}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>
      <section>
        <h3>Items</h3>
        {itemList.length === 0 ? (
          <p className="h-hint">
            None. Scored widgets register with useIsItem().
          </p>
        ) : (
          itemList.map((item) => (
            <div key={item.widgetId} className="h-item">
              <div className="h-item-title">
                <code>{item.widgetName ?? item.widgetId}</code>
                <span className="h-item-type">{item.type}</span>
              </div>
              <pre>{JSON.stringify(item.status, null, 2)}</pre>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

export function EventLog({
  events,
  onClear,
}: {
  events: LoggedEvent[];
  onClear: () => void;
}) {
  return (
    <section className="h-events">
      <div className="h-row">
        <h3>Events</h3>
        <button type="button" className="h-link" onClick={onClear}>
          Clear
        </button>
      </div>
      {events.length === 0 ? (
        <p className="h-hint">
          Lesson events (navigation, actions, answers) appear here.
        </p>
      ) : (
        <ol>
          {events.map((event, index) => (
            <li key={index}>
              <code>{event.type}</code>
              <pre>{JSON.stringify(event.data)}</pre>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
