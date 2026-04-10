import { useState, useEffect, useCallback } from "react";
import { flushSync } from "react-dom";

const STORAGE_KEY = "todomvc-react";

function loadTodos() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveTodos(todos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

let nextId = 1;

export default function App() {
  const [todos, setTodos] = useState(() => {
    const loaded = loadTodos();
    if (loaded.length) {
      nextId = Math.max(...loaded.map((t) => t.id)) + 1;
    }
    return loaded;
  });
  const [newText, setNewText] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    saveTodos(todos);
  }, [todos]);

  // Benchmark API — expose state manipulation on window
  useEffect(() => {
    const adj = ["pretty","large","big","small","tall","short","long","handsome","plain","quaint","clean","elegant","easy","angry","crazy","helpful","mushy","odd","unsightly","adorable","important","inexpensive","cheap","expensive","fancy"];
    const col = ["red","yellow","blue","green","pink","brown","purple","brown","white","black","orange"];
    const noun = ["table","chair","house","bbq","desk","car","pony","cookie","sandwich","burger","pizza","mouse","keyboard"];
    function buildTitle(i) { return `${adj[i % adj.length]} ${col[i % col.length]} ${noun[i % noun.length]}`; }

    window.__benchFlush = () => Promise.resolve(); // flushSync is already synchronous
    window.__bench = {
      createRows(n) {
        flushSync(() => setTodos(prev => {
          const newTodos = [];
          for (let i = 0; i < n; i++) newTodos.push({ id: nextId++, title: buildTitle(i), completed: false });
          return [...prev, ...newTodos];
        }));
      },
      clearRows() { flushSync(() => setTodos([])); },
      updateEvery10th() { flushSync(() => setTodos(prev => prev.map((t, i) => i % 10 === 0 ? { ...t, title: t.title + " !!!" } : t))); },
      deleteEvery10th() { flushSync(() => setTodos(prev => prev.filter((_, i) => i % 10 !== 0))); },
      swapRows(a, b) {
        flushSync(() => setTodos(prev => {
          if (!prev[a] || !prev[b]) return prev;
          const next = [...prev]; const tmp = next[a]; next[a] = next[b]; next[b] = tmp; return next;
        }));
      },
      removeRow(idx) { flushSync(() => setTodos(prev => idx >= 0 && idx < prev.length ? prev.filter((_, i) => i !== idx) : prev)); },
      selectRow() { flushSync(() => setFilter(f => f)); },
      reset() { flushSync(() => { setTodos([]); nextId = 1; }); },
    };
  }, []);

  function addTodo(e) {
    e.preventDefault();
    const text = newText.trim();
    if (!text) return;
    setTodos((prev) => [...prev, { id: nextId++, title: text, completed: false }]);
    setNewText("");
  }

  function toggleTodo(id) {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  }

  function toggleAll() {
    const allDone = todos.every((t) => t.completed);
    setTodos((prev) => prev.map((t) => ({ ...t, completed: !allDone })));
  }

  function deleteTodo(id) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  function clearCompleted() {
    setTodos((prev) => prev.filter((t) => !t.completed));
  }

  const activeCount = todos.filter((t) => !t.completed).length;
  const completedCount = todos.filter((t) => t.completed).length;

  const visibleTodos =
    filter === "active"
      ? todos.filter((t) => !t.completed)
      : filter === "completed"
        ? todos.filter((t) => t.completed)
        : todos;

  return (
    <div className="todoapp">
      <header className="header">
        <h1>todos</h1>
        <form onSubmit={addTodo}>
          <input
            className="new-todo"
            type="text"
            placeholder="What needs to be done?"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            autoFocus
          />
        </form>
      </header>

      {todos.length > 0 && (
        <section className="main">
          <input
            id="toggle-all"
            className="toggle-all"
            type="checkbox"
            checked={activeCount === 0}
            onChange={toggleAll}
          />
          <label htmlFor="toggle-all">Mark all as complete</label>
          <ul className="todo-list">
            {visibleTodos.map((todo) => (
              <li key={todo.id} className="todo-item">
                <div className="view">
                  <input
                    className="toggle"
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => toggleTodo(todo.id)}
                  />
                  <label>{todo.title}</label>
                  <button className="destroy" onClick={() => deleteTodo(todo.id)} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {todos.length > 0 && (
        <footer className="footer">
          <span className="todo-count">
            <strong>{activeCount}</strong>
            {activeCount === 1 ? " item left" : " items left"}
          </span>
          <ul className="filters">
            <li>
              <a
                href="#/"
                className={filter === "all" ? "selected" : ""}
                onClick={() => setFilter("all")}
              >
                All
              </a>
            </li>
            <li>
              <a
                href="#/active"
                className={filter === "active" ? "selected" : ""}
                onClick={() => setFilter("active")}
              >
                Active
              </a>
            </li>
            <li>
              <a
                href="#/completed"
                className={filter === "completed" ? "selected" : ""}
                onClick={() => setFilter("completed")}
              >
                Completed
              </a>
            </li>
          </ul>
          {completedCount > 0 && (
            <button className="clear-completed" onClick={clearCompleted}>
              Clear completed
            </button>
          )}
        </footer>
      )}
    </div>
  );
}
