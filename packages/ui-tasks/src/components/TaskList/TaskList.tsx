import { Field } from '@ark-ui/solid/field';
import { For, createSignal } from 'solid-js';
import { v4 as uuid } from 'uuid';

export type Task = {
  id: string;
  title: string;
};

export type TaskListProps = {
  className?: string;
  tasks?: Task[];
  onCreate?: (task: Task) => void;
};

/**
 * @public
 */
export const TaskList = (props: TaskListProps) => {
  return (
    <div class={props.className}>
      <For each={props.tasks} fallback={<div>No tasks!</div>}>
        {(task) => (
          <div>
            <div class='font-mono text-xs opacity-20'>{task.id}</div>
            <div>{task.title}</div>
          </div>
        )}
      </For>
      {props.onCreate && <TaskEditor onCreate={props.onCreate} />}
    </div>
  );
};

export type TaskEditorProps = {
  task?: Task;
  onCreate?: (task: Task) => void;
};

export const TaskEditor = ({ task, onCreate }: TaskEditorProps) => {
  const [title, setTitle] = createSignal(task?.title ?? '');

  const handleSave = () => {
    if (!title().trim()) {
      return;
    }
    onCreate?.({ id: task?.id ?? uuid(), title: title() });
    setTitle('');
  };

  return (
    <Field.Root class='flex flex-col'>
      {/* <Field.Label class='text-xs'>Task</Field.Label> */}
      <Field.Input
        class='p-1 border'
        placeholder='bananas'
        value={title()}
        onInput={(event) => setTitle(event.currentTarget.value)}
      />
      {/* <Field.HelperText class=''>Some additional Info</Field.HelperText> */}
      {/* <Field.ErrorText class=''>Error Info</Field.ErrorText> */}
      <button onClick={handleSave}>Save</button>
    </Field.Root>
  );
};
