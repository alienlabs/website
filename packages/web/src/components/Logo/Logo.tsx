import type { JSX } from 'solid-js';

export type LogoProps = JSX.SvgSVGAttributes<SVGSVGElement>;

export const Logo = (props: LogoProps) => {
  return <svg {...props} />;
};
