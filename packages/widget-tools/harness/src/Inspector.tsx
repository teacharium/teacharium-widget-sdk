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
          <table>
            <tbody>
              {variableList.map((variable) => (
                <tr key={variable.name}>
                  <td>
                    <code>{variable.name}</code>
                  </td>
                  <td>{formatValue(variable.currentValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
              <div>
                <code>{item.widgetName ?? item.widgetId}</code> · {item.type}
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
