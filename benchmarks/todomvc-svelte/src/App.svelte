<script>
  import { tick } from "svelte";
  const STORAGE_KEY = "todomvc-svelte5";

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

  let todos = $state(loadTodos());
  let newTodoText = $state("");
  let filter = $state("all");
  let nextId = $state(
    todos.length ? Math.max(...todos.map((t) => t.id)) + 1 : 1
  );

  let activeCount = $derived(todos.filter((t) => !t.completed).length);
  let completedCount = $derived(todos.filter((t) => t.completed).length);
  let allDone = $derived(todos.length > 0 && activeCount === 0);
  let visibleTodos = $derived(
    filter === "active"
      ? todos.filter((t) => !t.completed)
      : filter === "completed"
        ? todos.filter((t) => t.completed)
        : todos
  );

  function addTodo(e) {
    e.preventDefault();
    const text = newTodoText.trim();
    if (!text) return;
    todos = [...todos, { id: nextId, title: text, completed: false }];
    nextId++;
    newTodoText = "";
    saveTodos(todos);
  }

  function toggleTodo(id) {
    todos = todos.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    saveTodos(todos);
  }

  function toggleAll() {
    const target = !allDone;
    todos = todos.map((t) => ({ ...t, completed: target }));
    saveTodos(todos);
  }

  function deleteTodo(id) {
    todos = todos.filter((t) => t.id !== id);
    saveTodos(todos);
  }

  function clearCompleted() {
    todos = todos.filter((t) => !t.completed);
    saveTodos(todos);
  }

  // Benchmark API
  window.__benchFlush = () => tick();
  const adj = ["pretty","large","big","small","tall","short","long","handsome","plain","quaint","clean","elegant","easy","angry","crazy","helpful","mushy","odd","unsightly","adorable","important","inexpensive","cheap","expensive","fancy"];
  const col = ["red","yellow","blue","green","pink","brown","purple","brown","white","black","orange"];
  const noun = ["table","chair","house","bbq","desk","car","pony","cookie","sandwich","burger","pizza","mouse","keyboard"];
  function buildTitle(i) { return `${adj[i % adj.length]} ${col[i % col.length]} ${noun[i % noun.length]}`; }

  window.__bench = {
    createRows(n) {
      const newTodos = [];
      for (let i = 0; i < n; i++) newTodos.push({ id: nextId++, title: buildTitle(i), completed: false });
      todos = [...todos, ...newTodos];
    },
    clearRows() { todos = []; },
    updateEvery10th() { todos = todos.map((t, i) => i % 10 === 0 ? { ...t, title: t.title + " !!!" } : t); },
    deleteEvery10th() { todos = todos.filter((_, i) => i % 10 !== 0); },
    swapRows(a, b) {
      if (todos[a] && todos[b]) {
        const next = [...todos]; const tmp = next[a]; next[a] = next[b]; next[b] = tmp; todos = next;
      }
    },
    removeRow(idx) { if (idx >= 0 && idx < todos.length) todos = todos.filter((_, i) => i !== idx); },
    selectRow() { filter = filter; },
    reset() { todos = []; nextId = 1; },
  };
</script>

<div class="todoapp">
  <header class="header">
    <h1>todos</h1>
    <form onsubmit={addTodo}>
      <input
        class="new-todo"
        type="text"
        placeholder="What needs to be done?"
        bind:value={newTodoText}
        autofocus
      />
    </form>
  </header>

  {#if todos.length}
    <section class="main">
      <input
        id="toggle-all"
        class="toggle-all"
        type="checkbox"
        checked={allDone}
        onchange={toggleAll}
      />
      <label for="toggle-all">Mark all as complete</label>
      <ul class="todo-list">
        {#each visibleTodos as todo (todo.id)}
          <li class="todo-item">
            <div class="view">
              <input
                class="toggle"
                type="checkbox"
                checked={todo.completed}
                onchange={() => toggleTodo(todo.id)}
              />
              <label>{todo.title}</label>
              <button class="destroy" onclick={() => deleteTodo(todo.id)}
              ></button>
            </div>
          </li>
        {/each}
      </ul>
    </section>

    <footer class="footer">
      <span class="todo-count">
        <strong>{activeCount}</strong>
        {activeCount === 1 ? " item left" : " items left"}
      </span>
      <ul class="filters">
        <li>
          <a
            href="#/"
            class:selected={filter === "all"}
            onclick={() => (filter = "all")}>All</a
          >
        </li>
        <li>
          <a
            href="#/active"
            class:selected={filter === "active"}
            onclick={() => (filter = "active")}>Active</a
          >
        </li>
        <li>
          <a
            href="#/completed"
            class:selected={filter === "completed"}
            onclick={() => (filter = "completed")}>Completed</a
          >
        </li>
      </ul>
      {#if completedCount > 0}
        <button class="clear-completed" onclick={clearCompleted}
          >Clear completed</button
        >
      {/if}
    </footer>
  {/if}
</div>

<style>
  :global(body) {
    font: 14px "Helvetica Neue", Helvetica, Arial, sans-serif;
    line-height: 1.4em;
    background: #f5f5f5;
    color: #111111;
    min-width: 230px;
    max-width: 550px;
    margin: 0 auto;
    font-weight: 300;
  }

  .todoapp {
    background: #fff;
    margin: 130px 0 40px 0;
    position: relative;
    box-shadow:
      0 2px 4px 0 rgba(0, 0, 0, 0.2),
      0 25px 50px 0 rgba(0, 0, 0, 0.1);
  }

  .todoapp h1 {
    position: absolute;
    top: -140px;
    width: 100%;
    font-size: 80px;
    font-weight: 200;
    text-align: center;
    color: #b83f45;
    text-rendering: optimizeLegibility;
  }

  .new-todo {
    padding: 16px 16px 16px 60px;
    height: 65px;
    border: none;
    background: rgba(0, 0, 0, 0.003);
    box-shadow: inset 0 -2px 1px rgba(0, 0, 0, 0.03);
    position: relative;
    margin: 0;
    width: 100%;
    font-size: 24px;
    font-family: inherit;
    font-weight: inherit;
    line-height: 1.4em;
    color: inherit;
    box-sizing: border-box;
  }

  .new-todo::placeholder {
    font-style: italic;
    font-weight: 400;
    color: rgba(0, 0, 0, 0.4);
  }

  .main {
    position: relative;
    z-index: 2;
    border-top: 1px solid #e6e6e6;
  }

  .toggle-all {
    width: 1px;
    height: 1px;
    border: none;
    opacity: 0;
    position: absolute;
    right: 100%;
    bottom: 100%;
  }

  .toggle-all + label {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 45px;
    height: 65px;
    font-size: 0;
    position: absolute;
    top: -65px;
    left: -0px;
  }

  .toggle-all + label:before {
    content: "\276F";
    display: inline-block;
    font-size: 22px;
    color: #949494;
    padding: 10px 27px 10px 27px;
    transform: rotate(90deg);
  }

  .todo-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .todo-item {
    position: relative;
    font-size: 24px;
    border-bottom: 1px solid #ededed;
  }

  .todo-item .view {
    display: flex;
    align-items: center;
  }

  .todo-item .toggle {
    text-align: center;
    width: 40px;
    height: 40px;
    margin: auto 0;
    border: none;
    appearance: none;
    cursor: pointer;
  }

  .todo-item label {
    word-break: break-all;
    padding: 15px 15px 15px 15px;
    display: block;
    line-height: 1.2;
    transition: color 0.4s;
    font-weight: 400;
    color: #484848;
    flex: 1;
  }

  .todo-item .destroy {
    display: none;
    position: absolute;
    top: 0;
    right: 10px;
    bottom: 0;
    width: 40px;
    height: 40px;
    margin: auto 0;
    font-size: 30px;
    color: #949494;
    transition: color 0.2s ease-out;
    cursor: pointer;
    border: none;
    background: none;
  }

  .todo-item .destroy:after {
    content: "\00D7";
  }

  .todo-item:hover .destroy {
    display: block;
  }

  .todo-item .destroy:hover {
    color: #c18585;
  }

  .todo-item .edit {
    display: none;
  }

  .footer {
    padding: 10px 15px;
    height: 20px;
    text-align: center;
    font-size: 15px;
    border-top: 1px solid #e6e6e6;
  }

  .footer:before {
    content: "";
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    height: 50px;
    overflow: hidden;
    box-shadow:
      0 1px 1px rgba(0, 0, 0, 0.2),
      0 8px 0 -3px #f6f6f6,
      0 9px 1px -3px rgba(0, 0, 0, 0.2),
      0 16px 0 -6px #f6f6f6,
      0 17px 2px -6px rgba(0, 0, 0, 0.2);
  }

  .todo-count {
    float: left;
    text-align: left;
  }

  .filters {
    margin: 0;
    padding: 0;
    list-style: none;
    position: absolute;
    right: 0;
    left: 0;
  }

  .filters li {
    display: inline;
  }

  .filters li a {
    color: inherit;
    margin: 3px;
    padding: 3px 7px;
    text-decoration: none;
    border: 1px solid transparent;
    border-radius: 3px;
  }

  .filters li a:hover {
    border-color: #db7676;
  }

  :global(.filters li a.selected) {
    border-color: #ce4646;
  }

  .clear-completed {
    float: right;
    position: relative;
    line-height: 19px;
    text-decoration: none;
    cursor: pointer;
    border: none;
    background: none;
  }

  .clear-completed:hover {
    text-decoration: underline;
  }
</style>
