import { QrCode } from '@ark-ui/solid/qr-code';

export type QRTestProps = {
  link: string;
};

export const QRTest = (props: QRTestProps) => {
  return (
    <div class='flex flex-col items-center gap-4'>
      <QrCode.Root defaultValue={props.link}>
        <QrCode.Frame class='h-40 w-40 rounded-md bg-white p-2'>
          <QrCode.Pattern />
        </QrCode.Frame>
      </QrCode.Root>
    </div>
  );
};
