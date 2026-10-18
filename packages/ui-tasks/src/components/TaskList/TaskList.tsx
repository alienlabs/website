import { Field } from '@ark-ui/solid/field';
import { For, type JSX, createSignal } from 'solid-js';
import { v4 as uuid } from 'uuid';

import { Task } from '@alienlabs/db-protocol';
import { useI18n } from '@alienlabs/ui-core/i18n';

/** Shared class for buttons in the editor's action row. */
export const actionButtonClass =
  'rounded-lg bg-background/40 p-3 text-sm text-muted-foreground shadow-sm backdrop-blur hover:bg-muted/50';

export type TaskListProps = {
  className?: string;
  tasks?: Task.Task[];
  /** Extra buttons rendered to the left of Save. */
  actions?: JSX.Element;
  onCreate?: (task: Task.Task) => void;
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
      {props.onCreate && <TaskEditor actions={props.actions} onCreate={props.onCreate} />}
    </div>
  );
};

export type TaskEditorProps = {
  task?: Task.Task;
  actions?: JSX.Element;
  onCreate?: (task: Task.Task) => void;
};

export const TaskEditor = ({ task, actions, onCreate }: TaskEditorProps) => {
  const [title, setTitle] = createSignal(task?.title ?? '');
  const { t } = useI18n();

  const handleSave = () => {
    if (!title().trim()) {
      return;
    }
    onCreate?.(
      task
        ? new Task.Task({ ...task, title: title() })
        : new Task.Task({ id: uuid(), createdAt: new Date(), title: title() }),
    );
    setTitle('');
  };

  return (
    <Field.Root class='mt-4 flex flex-col'>
      {/* <Field.Label class='text-xs'>Task</Field.Label> */}
      <Field.Input
        class='p-1 border'
        placeholder='Task title goes here...'
        value={title()}
        onInput={(event) => setTitle(event.currentTarget.value)}
      />
      {/* <Field.HelperText class=''>Some additional Info</Field.HelperText> */}
      {/* <Field.ErrorText class=''>Error Info</Field.ErrorText> */}
      <div class='grid auto-cols-fr grid-flow-col gap-2'>
        {actions}
        <button type='button' class={actionButtonClass} onClick={handleSave}>
          {t('tasks.save')}
        </button>
      </div>
    </Field.Root>
  );
};
