export type TodoStatus = "not-started" | "in-progress" | "completed";
export interface TodoItem {
  id: number;
  title: string;
  description: string;
  status: TodoStatus;
}

interface TodoFileShape {
  todos: TodoItem[];
}

const TODOS_PATH = new URL("../data/todos.json", import.meta.url);

async function readFileSafe(): Promise<TodoFileShape> {
  try {
    const text = await Deno.readTextFile(TODOS_PATH);
    const data = JSON.parse(text);
    if (Array.isArray(data?.todos)) {
      return { todos: data.todos as TodoItem[] };
    }
  } catch (_) {
    // ignore
  }
  return { todos: [] };
}

async function writeFile(data: TodoFileShape): Promise<void> {
  const text = JSON.stringify(data, null, 2) + "\n";
  await Deno.writeTextFile(TODOS_PATH, text);
}

export async function getTodos(): Promise<TodoItem[]> {
  const { todos } = await readFileSafe();
  return todos;
}

export async function setTodos(todos: TodoItem[]): Promise<void> {
  await writeFile({ todos });
}

export async function addTodo(
  partial: Omit<TodoItem, "id">,
): Promise<TodoItem> {
  const todos = await getTodos();
  const id = todos.length ? Math.max(...todos.map((t) => t.id)) + 1 : 1;
  const todo: TodoItem = { id, ...partial };
  todos.push(todo);
  await setTodos(todos);
  return todo;
}

export async function updateTodo(
  id: number,
  patch: Partial<Omit<TodoItem, "id">>,
): Promise<TodoItem | null> {
  const todos = await getTodos();
  const idx = todos.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  const updated: TodoItem = { ...todos[idx], ...patch };
  todos[idx] = updated;
  await setTodos(todos);
  return updated;
}

export async function deleteTodo(id: number): Promise<boolean> {
  const todos = await getTodos();
  const next = todos.filter((t) => t.id !== id);
  const changed = next.length !== todos.length;
  if (changed) {
    await setTodos(next);
  }
  return changed;
}
