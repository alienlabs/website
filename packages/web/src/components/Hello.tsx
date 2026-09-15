import { Tooltip } from "@ark-ui/solid/tooltip";
import { format } from "d3";
import { Effect } from "effect";
import { createSignal } from "solid-js";

export type HelloProps = {
  name: string;
};

const greet = (name: string) => Effect.sync(() => `Hello, ${name}!`);

export const Hello = (props: HelloProps) => {
  const [count, setCount] = createSignal(0);
  const message = () => Effect.runSync(greet(props.name));

  return (
    <div class="flex flex-col items-center gap-4">
      <h1 class="text-4xl font-semibold tracking-tight">{message()}</h1>
      <Tooltip.Root openDelay={200}>
        <Tooltip.Trigger
          class="rounded-md bg-neutral-100 px-4 py-2 text-neutral-900 hover:bg-white"
          onClick={() => setCount((n) => n + 1)}
        >
          Clicked {format(",d")(count())} times
        </Tooltip.Trigger>
        <Tooltip.Positioner>
          <Tooltip.Content class="rounded bg-neutral-800 px-2 py-1 text-sm text-neutral-100">
            Click to count
          </Tooltip.Content>
        </Tooltip.Positioner>
      </Tooltip.Root>
    </div>
  );
};
