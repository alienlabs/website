import { Hello } from "./components/Hello";

export const App = () => {
  return (
    <main class="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-100">
      <Hello name="World" />
    </main>
  );
};
