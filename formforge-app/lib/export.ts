import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export type ExportFormat = 'stl' | '3mf' | 'step';

export async function exportFile(
  url: string,
  format: ExportFormat,
  templateName: string,
): Promise<void> {
  const filename = `${slugify(templateName)}.${format}`;
  const localUri = FileSystem.cacheDirectory + filename;

  const { uri } = await FileSystem.downloadAsync(url, localUri);

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing is not available on this device');
  }

  await Sharing.shareAsync(uri, {
    mimeType: mimeFor(format),
    dialogTitle: `Export ${filename}`,
    UTI: utiFor(format),
  });
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');
}

function mimeFor(format: ExportFormat): string {
  switch (format) {
    case 'stl':  return 'model/stl';
    case '3mf':  return 'model/3mf';
    case 'step': return 'model/step';
  }
}

function utiFor(format: ExportFormat): string {
  switch (format) {
    case 'stl':  return 'public.item';
    case '3mf':  return 'public.item';
    case 'step': return 'public.item';
  }
}
