<script setup>
import { ref, computed, watch, nextTick } from "vue";

const STORAGE_KEY = "todomvc-vue";

function loadTodos() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

let nextId = 1;

const todos = ref(loadTodos());
if (todos.value.length) {
  nextId = Math.max(...todos.value.map((t) => t.id)) + 1;
}

const newText = ref("");
const filter = ref("all");

watch(
  todos,
  (val) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
  },
  { deep: true }
);

const activeCount = computed(() => todos.value.filter((t) => !t.completed).length);
const completedCount = computed(() => todos.value.filter((t) => t.completed).length);

const visibleTodos = computed(() => {
  if (filter.value === "active") return todos.value.filter((t) => !t.completed);
  if (filter.value === "completed") return todos.value.filter((t) => t.completed);
  return todos.value;
});

function addTodo() {
  const text = newText.value.trim();
  if (!text) return;
  todos.value.push({ id: nextId++, title: text, completed: false });
  newText.value = "";
}

function toggleTodo(id) {
  const todo = todos.value.find((t) => t.id === id);
  if (todo) todo.completed = !todo.completed;
}

function toggleAll() {
  const allDone = todos.value.every((t) => t.completed);
  todos.value.forEach((t) => (t.completed = !allDone));
}

function deleteTodo(id) {
  const idx = todos.value.findIndex((t) => t.id === id);
  if (idx !== -1) todos.value.splice(idx, 1);
}

function clearCompleted() {
  todos.value = todos.value.filter((t) => !t.completed);
}

// Benchmark API — exposed on window for browser benchmarks
window.__benchFlush = () => nextTick();
window.__bench = {
  createRows(n) {
    const adj = ["pretty","large","big","small","tall","short","long","handsome","plain","quaint","clean","elegant","easy","angry","crazy","helpful","mushy","odd","unsightly","adorable","important","inexpensive","cheap","expensive","fancy"];
    const col = ["red","yellow","blue","green","pink","brown","purple","brown","white","black","orange"];
    const noun = ["table","chair","house","bbq","desk","car","pony","cookie","sandwich","burger","pizza","mouse","keyboard"];
    for (let i = 0; i < n; i++) {
      todos.value.push({
        id: nextId++,
        title: `${adj[i % adj.length]} ${col[i % col.length]} ${noun[i % noun.length]}`,
        completed: false,
      });
    }
  },
  clearRows() { todos.value = []; },
  updateEvery10th() {
    todos.value = todos.value.map((t, i) =>
      i % 10 === 0 ? { ...t, title: t.title + " !!!" } : t
    );
  },
  deleteEvery10th() {
    todos.value = todos.value.filter((_, i) => i % 10 !== 0);
  },
  swapRows(a, b) {
    if (todos.value[a] && todos.value[b]) {
      const tmp = todos.value[a];
      todos.value[a] = todos.value[b];
      todos.value[b] = tmp;
    }
  },
  removeRow(idx) {
    if (idx >= 0 && idx < todos.value.length) todos.value.splice(idx, 1);
  },
  selectRow(idx) { filter.value = filter.value; },
  reset() { todos.value = []; nextId = 1; },
};
</script>

<template>
  <div class="todoapp">
    <header class="header">
      <h1>todos</h1>
      <form @submit.prevent="addTodo">
        <input
          class="new-todo"
          type="text"
          placeholder="What needs to be done?"
          v-model="newText"
          autofocus
        />
      </form>
    </header>

    <section v-if="todos.length > 0" class="main">
      <input
        id="toggle-all"
        class="toggle-all"
        type="checkbox"
        :checked="activeCount === 0"
        @change="toggleAll"
      />
      <label for="toggle-all">Mark all as complete</label>
      <ul class="todo-list">
        <li v-for="todo in visibleTodos" :key="todo.id" class="todo-item">
          <div class="view">
            <input
              class="toggle"
              type="checkbox"
              :checked="todo.completed"
              @change="toggleTodo(todo.id)"
            />
            <label>{{ todo.title }}</label>
            <button class="destroy" @click="deleteTodo(todo.id)" />
          </div>
        </li>
      </ul>
    </section>

    <footer v-if="todos.length > 0" class="footer">
      <span class="todo-count">
        <strong>{{ activeCount }}</strong>
        {{ activeCount === 1 ? " item left" : " items left" }}
      </span>
      <ul class="filters">
        <li>
          <a
            href="#/"
            :class="{ selected: filter === 'all' }"
            @click="filter = 'all'"
          >
            All
          </a>
        </li>
        <li>
          <a
            href="#/active"
            :class="{ selected: filter === 'active' }"
            @click="filter = 'active'"
          >
            Active
          </a>
        </li>
        <li>
          <a
            href="#/completed"
            :class="{ selected: filter === 'completed' }"
            @click="filter = 'completed'"
          >
            Completed
          </a>
        </li>
      </ul>
      <button
        v-if="completedCount > 0"
        class="clear-completed"
        @click="clearCompleted"
      >
        Clear completed
      </button>
    </footer>
  </div>
</template>
