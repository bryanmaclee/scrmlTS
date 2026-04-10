/**
 * @module codegen/binding-registry
 *
 * BindingRegistry — explicit typed contract between HTML gen (analysis) and JS gen (emission).
 *
 * Currently the coupling between generateHtml() and generateClientJs() is
 * implicit: index.js creates two mutable arrays, passes them to generateHtml()
 * which populates them as a side effect, then passes the populated arrays to
 * generateClientJs(). This is the "implicit coupling" anti-pattern.
 *
 * BindingRegistry makes this contract explicit:
 * - Populated during HTML generation via addEventBinding() / addLogicBinding()
 * - Read-only during client JS emission via .eventBindings / .logicBindings
 *
 * Event bindings: { placeholderId, eventName, handlerName, handlerArgs, handlerExpr? }
 *   Recorded when HTML gen encounters a call-ref attribute (onclick=handler())
 *   or an expr attribute on an event (onclick=${() => fn(arg)}).
 *   Used by client JS gen to wire event listeners.
 *
 * Logic bindings: { placeholderId, expr, reactiveRefs?, isConditionalDisplay?, varName?, condExpr?, refs? }
 *   Recorded when HTML gen encounters:
 *   - A logic node embedded in markup (reactive display placeholder)
 *   - A variable-ref attribute value for if= (conditional display — simple var)
 *   - An expr attribute value for if= (conditional display — boolean expression)
 *   Used by client JS gen to wire reactive updates and conditional visibility.
 *
 *   Phase 4 addition: reactiveRefs (Set<string> | undefined)
 *     Pre-annotated by emit-html.js using extractReactiveDeps from reactive-deps.js.
 *     Contains the set of reactive variable names (without @ prefix) that the
 *     expression depends on. String-literal-aware — @var inside quoted strings is
 *     NOT included. When present, emit-event-wiring.js reads from this set instead
 *     of regex-scanning the expr string. When absent, the wiring falls back to regex.
 *
 *   If= expression support:
 *     condExpr (string | undefined) — raw expression string from if="..." or if=!@var
 *     refs (string[] | undefined)   — reactive variable names extracted from condExpr
 *     When condExpr + refs are present, emit-event-wiring subscribes to all refs and
 *     evaluates the compiled expression (with @var → _scrml_reactive_get("var")).
 *     When only varName is present, uses simple single-var display toggle (backward compat).
 */

/** An event binding recorded by HTML gen and consumed by client JS gen. */
export interface EventBinding {
  placeholderId: string;
  eventName: string;
  handlerName: string;
  handlerArgs: unknown[];
  /** Raw expression handler from ${...} attribute values (e.g. "() => fn(arg)"). */
  handlerExpr?: string;
}

/** A logic binding recorded by HTML gen and consumed by client JS gen. */
export interface LogicBinding {
  placeholderId: string;
  expr: string;
  reactiveRefs?: Set<string>;
  isConditionalDisplay?: boolean;
  varName?: string;
  condExpr?: string;
  refs?: string[];
}

export class BindingRegistry {
  private _eventBindings: EventBinding[];
  private _logicBindings: LogicBinding[];

  constructor() {
    this._eventBindings = [];
    this._logicBindings = [];
  }

  /**
   * Record an event binding — emitted by HTML gen when a call-ref or expr
   * attribute is encountered on an event attribute (onclick, onsubmit, etc.).
   */
  addEventBinding(entry: EventBinding): void {
    this._eventBindings.push(entry);
  }

  /**
   * Record a logic binding — emitted by HTML gen when a reactive display placeholder
   * or conditional display binding is encountered.
   */
  addLogicBinding(entry: LogicBinding): void {
    this._logicBindings.push(entry);
  }

  /** All event bindings. Read-only during emission. */
  get eventBindings(): EventBinding[] {
    return this._eventBindings;
  }

  /** All logic bindings. Read-only during emission. */
  get logicBindings(): LogicBinding[] {
    return this._logicBindings;
  }

  /**
   * Factory: create a BindingRegistry pre-populated with event and logic bindings.
   * Primarily used by tests that construct binding arrays directly.
   */
  static from(eventBindings: EventBinding[] = [], logicBindings: LogicBinding[] = []): BindingRegistry {
    const reg = new BindingRegistry();
    for (const eb of eventBindings) reg.addEventBinding(eb);
    for (const lb of logicBindings) reg.addLogicBinding(lb);
    return reg;
  }
}
